const { callbackQueue, philpayPayoutQueue, bipspayCallbackQueue, bipspayPayoutCallbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { TransactionCharges, FinancialDetails, MerchantDetails } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');
const axios = require('axios');

// Configure queue with retry and timeout settings
callbackQueue.setMaxListeners(0); // Prevent memory leaks
callbackQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    logger.info('MongoDB connected successfully in callback worker');
  })
  .catch((err) => {
    logger.error('MongoDB connection error in callback worker:', err);
    process.exit(1);
  });

// Process generic callback jobs (Unpay / others using common format)
callbackQueue.process(async function (job) {
  const startTime = Date.now();
  try {
    logger.info('Processing callback job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });

    // Set job timeout - increased to 5 minutes to handle slow operations
    const timeout = setTimeout(() => {
      logger.error('Job processing timeout - taking too long', {
        jobId: job.id,
        attempts: job.attemptsMade,
        data: job.data
      });
      throw new Error('Job processing timeout');
    }, 300000); // 5 minutes timeout

    const {
      statuscode,
      status,
      amount,
      apitxnid,
      txnid,
      utr,
      message
    } = job.data;

    // Map Unpay status to our status format
    const mappedStatus = (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';


    // Find transactions once - use Promise.all for parallel execution
    logger.info('Starting database lookups', { jobId: job.id, apitxnid });
    const [payinTransaction, userTransaction] = await Promise.all([
      PayinTransaction.findOne({ reference_id: apitxnid }),
      UserTransaction.findOne({ reference_id: apitxnid })
    ]);
    logger.info('Database lookups completed', { jobId: job.id, apitxnid });

    logger.info('Transaction lookup results', {
      jobId: job.id,
      apitxnid,
      payinTransactionFound: !!payinTransaction,
      userTransactionFound: !!userTransaction,
      payinTransactionId: payinTransaction?._id,
      userTransactionId: userTransaction?._id
    });

    if (!payinTransaction || !userTransaction) {
      logger.error('Transaction records not found', {
        jobId: job.id,
        apitxnid,
        payinTransactionFound: !!payinTransaction,
        userTransactionFound: !!userTransaction,
        jobData: job.data
      });
      throw new Error('Transaction records not found');
    }

    const userId = payinTransaction.user.user_id;
    const updateData = {
      status: mappedStatus,
      gateway_response: {
        utr,
        status: mappedStatus,
        message: message || 'Transaction processed',
        raw_response: job.data
      }
    };

    // Handle completed transaction
    if (mappedStatus === 'completed') {
      // Ensure all values are numbers with defaults
      const beforeBalance = parseFloat(userTransaction.balance?.before || 0);
      const transactionAmount = parseFloat(amount || 0);
      const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
      const platformFee = parseFloat(payinTransaction.platform_fee || 0);
      const gstAmount = parseFloat(payinTransaction.gst_amount || 0);

      // Calculate new balance
      const newBalance = beforeBalance + transactionAmount - adminCharge - platformFee - gstAmount;

      // Update user transaction balance
      await UserTransaction.updateOne(
        { reference_id: apitxnid },
        {
          $set: {
            'balance.after': newBalance
          }
        }
      );

      // Update financial details
      const financialDetails = await FinancialDetails.findOne({
        where: { user_id: userId }
      });

      const amountToAdd = transactionAmount - adminCharge - platformFee - gstAmount;

      if (financialDetails) {
        await financialDetails.increment('wallet', {
          by: amountToAdd
        });
      } else {
        await FinancialDetails.create({
          user_id: userId,
          wallet: amountToAdd,
          settlement: 0,
          lien: 0,
          rolling_reserve: 0
        });
      }

      logger.info('Updated wallet balance in FinancialDetails', {
        user_id: userId,
        amount: amount,
        reference_id: apitxnid,
        action: financialDetails ? 'incremented' : 'created'
      });
    }

    // Update all transaction records in a single session
    logger.info('Starting transaction updates', { jobId: job.id, apitxnid });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          PayinTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: updateData }
          ),
          UserTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: updateData }
          ),
          TransactionCharges.update(
            {
              status: mappedStatus,
              transaction_utr: utr
            },
            {
              where: { reference_id: apitxnid },
              returning: true
            }
          )
        ]);
      });
    } finally {
      await session.endSession();
    }
    logger.info('Transaction updates completed', { jobId: job.id, apitxnid });

    // Get merchant details early for potential parallel processing
    logger.info('Starting merchant details lookup', { jobId: job.id, userId });
    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });
    logger.info('Merchant details lookup completed', { jobId: job.id, userId, hasCallback: !!merchantDetails?.payin_callback });

    if (merchantDetails?.payin_callback) {
      logger.info('Starting merchant callback process', { jobId: job.id, callbackUrl: merchantDetails.payin_callback });
      // Retry configuration - optimized for faster processing
      const maxRetries = 2; // Reduced from 3 to 2
      const baseDelay = 1000; // Reduced from 2 seconds to 1 second
      let lastError;

      // Add a timeout for the entire callback process (30 seconds max)
      const callbackTimeout = setTimeout(() => {
        logger.warn('Merchant callback process timeout - skipping callback', {
          jobId: job.id,
          apitxnid,
          callbackUrl: merchantDetails.payin_callback
        });
      }, 30000); // 30 seconds max for entire callback process

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Starting callback attempt ${attempt}/${maxRetries}`, { jobId: job.id, apitxnid });

          let callbackData;
          if (statuscode === 'SUCCESS') {
            callbackData = {
              reference_id: apitxnid,
              amount: amount,
              status: mappedStatus,
              utr: utr,
              message: message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          } else {
            callbackData = {
              reference_id: apitxnid,
              transaction_id: txnid,
              amount: amount,
              status: mappedStatus,
              utr: utr,
              message: message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          }

          console.log("this is callback data", callbackData)

          const response = await axios.post(merchantDetails.payin_callback, callbackData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000 // Reduced from 10 seconds to 5 seconds
          });

          logger.info('Callback sent successfully to merchant', {
            reference_id: apitxnid,
            callback_url: merchantDetails.payin_callback,
            response_status: response.status,
            attempt: attempt
          });

          // Clear callback timeout and break out of retry loop
          clearTimeout(callbackTimeout);
          break;

        } catch (error) {
          lastError = error;

          logger.warn('Callback attempt failed', {
            reference_id: apitxnid,
            callback_url: merchantDetails.payin_callback,
            error: error.message,
            attempt: attempt,
            maxRetries: maxRetries
          });

          // If this is the last attempt, log the final error
          if (attempt === maxRetries) {
            logger.error('Failed to send callback to merchant after all retries', {
              reference_id: apitxnid,
              callback_url: merchantDetails.payin_callback,
              error: error.message,
              totalAttempts: maxRetries
            });
            // Clear callback timeout on final failure
            clearTimeout(callbackTimeout);
          } else {
            // Wait before retrying with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Retrying callback in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              reference_id: apitxnid
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } else {
      logger.warn('No callback URL found for merchant', {
        reference_id: apitxnid,
        user_id: userId
      });
    }

    // Clear timeout on successful completion
    clearTimeout(timeout);

    const processingTime = Date.now() - startTime;
    logger.info('Callback processed successfully', {
      reference_id: apitxnid,
      status: mappedStatus,
      utr,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      reference_id: apitxnid,
      status: mappedStatus
    };

  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeout);

    logger.error('Error processing callback', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });

    if (job.attemptsMade >= 3) {
      logger.error('Job failed permanently after max retries', {
        jobId: job.id,
        attempts: job.attemptsMade
      });
      return { success: false, error: 'Max retries exceeded' };
    }

    throw error;
  }
});

// Process BipsPay payin callback jobs
bipspayCallbackQueue.process(async function (job) {
  const startTime = Date.now();
  console.log("================================================");
  console.log("this is the job data of bipspay callback", job.data);
  console.log("================================================");
  try {
    logger.info('Processing BipsPay callback job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });

    // Set job timeout - increased to 5 minutes to handle slow operations
    const timeout = setTimeout(() => {
      logger.error('BipsPay job processing timeout - taking too long', {
        jobId: job.id,
        attempts: job.attemptsMade,
        data: job.data
      });
      throw new Error('BipsPay job processing timeout');
    }, 300000);

    const { event, status, data } = job.data || {};

    const statuscode =
      status === 'SUCCESS' || data?.status === 'SUCCESS'
        ? 'SUCCESS'
        : status || data?.status || 'FAILED';

    const amount = data?.amount;
    const apitxnid = data?.reference || data?.order_id; // Our reference_id in DB
    const txnid = data?.order_id;
    const utr = data?.UTR;
    const message = data?.remarks || status || data?.status || 'Transaction processed';

    // Map BipsPay status to our status format
    const mappedStatus = (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';

    // Find transactions once - use Promise.all for parallel execution
    logger.info('BipsPay: Starting database lookups', { jobId: job.id, apitxnid });
    const [payinTransaction, userTransaction] = await Promise.all([
      PayinTransaction.findOne({ reference_id: apitxnid }),
      UserTransaction.findOne({ reference_id: apitxnid })
    ]);
    logger.info('BipsPay: Database lookups completed', { jobId: job.id, apitxnid });

    logger.info('BipsPay: Transaction lookup results', {
      jobId: job.id,
      apitxnid,
      payinTransactionFound: !!payinTransaction,
      userTransactionFound: !!userTransaction,
      payinTransactionId: payinTransaction?._id,
      userTransactionId: userTransaction?._id
    });

    if (!payinTransaction || !userTransaction) {
      logger.error('BipsPay: Transaction records not found', {
        jobId: job.id,
        apitxnid,
        payinTransactionFound: !!payinTransaction,
        userTransactionFound: !!userTransaction,
        jobData: job.data
      });
      throw new Error('Transaction records not found');
    }

    // After verifying records, ensure callback amount matches original requested amount
    const requestedAmount = parseFloat(payinTransaction.amount || 0);
    const callbackAmount = parseFloat(amount || 0);

    if (!isNaN(requestedAmount) && !isNaN(callbackAmount) && requestedAmount !== callbackAmount) {
      const mismatchMessage = `Callback amount ${callbackAmount} does not match requested amount ${requestedAmount}`;
      logger.warn('BipsPay: Amount mismatch detected, normalizing stored amounts to callback amount', {
        jobId: job.id,
        apitxnid,
        requestedAmount,
        callbackAmount
      });

      // Update stored amounts to match the actual credited amount from callback,
      // but do NOT fail the transaction. We let the rest of the flow proceed normally.
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Promise.all([
            PayinTransaction.updateOne(
              { reference_id: apitxnid },
              {
                $set: {
                  amount: callbackAmount
                }
              }
            ),
            UserTransaction.updateOne(
              { reference_id: apitxnid },
              {
                $set: {
                  amount: callbackAmount
                }
              }
            ),
            TransactionCharges.update(
              {
                transaction_amount: callbackAmount
              },
              {
                where: { reference_id: apitxnid },
                returning: true
              }
            )
          ]);
        });
      } finally {
        await session.endSession();
      }

      logger.info('BipsPay: Amount fields normalized to callback amount', {
        reference_id: apitxnid,
        callbackAmount
      });
    }

    //  till this part buddy once we have verified the user payinTransaction and userTransaction could you please add here one check if the 
    // callback amount is not same as in the payinTransaction amount then cancel this trancsaction by saying the requested amount is not same as asked and send the same to call url as well

    const userId = payinTransaction.user.user_id;
    const updateData = {
      status: mappedStatus,
      gateway_response: {
        utr,
        status: mappedStatus,
        message: message || 'Transaction processed',
        raw_response: job.data
      }
    };

    // Handle completed transaction
    if (mappedStatus === 'completed') {
      // Ensure all values are numbers with defaults
      const beforeBalance = parseFloat(userTransaction.balance?.before || 0);
      const transactionAmount = parseFloat(amount || 0);
      const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
      const platformFee = parseFloat(payinTransaction.platform_fee || 0);
      const gstAmount = parseFloat(payinTransaction.gst_amount || 0);

      // Calculate new balance
      const newBalance = beforeBalance + transactionAmount - adminCharge - platformFee - gstAmount;

      // Update user transaction balance
      await UserTransaction.updateOne(
        { reference_id: apitxnid },
        {
          $set: {
            'balance.after': newBalance
          }
        }
      );

      // Update financial details
      const financialDetails = await FinancialDetails.findOne({
        where: { user_id: userId }
      });

      const amountToAdd = transactionAmount - adminCharge - platformFee - gstAmount;

      if (financialDetails) {
        await financialDetails.increment('wallet', {
          by: amountToAdd
        });
      } else {
        await FinancialDetails.create({
          user_id: userId,
          wallet: amountToAdd,
          settlement: 0,
          lien: 0,
          rolling_reserve: 0
        });
      }

      logger.info('BipsPay: Updated wallet balance in FinancialDetails', {
        user_id: userId,
        amount: amount,
        reference_id: apitxnid,
        action: financialDetails ? 'incremented' : 'created'
      });
    }

    // Update all transaction records in a single session
    logger.info('BipsPay: Starting transaction updates', { jobId: job.id, apitxnid });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          PayinTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: updateData }
          ),
          UserTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: updateData }
          ),
          TransactionCharges.update(
            {
              status: mappedStatus,
              transaction_utr: utr
            },
            {
              where: { reference_id: apitxnid },
              returning: true
            }
          )
        ]);
      });
    } finally {
      await session.endSession();
    }
    logger.info('BipsPay: Transaction updates completed', { jobId: job.id, apitxnid });

    // Get merchant details early for potential parallel processing
    logger.info('BipsPay: Starting merchant details lookup', { jobId: job.id, userId });
    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });
    logger.info('BipsPay: Merchant details lookup completed', {
      jobId: job.id,
      userId,
      hasCallback: !!merchantDetails?.payin_callback
    });

    if (merchantDetails?.payin_callback) {
      logger.info('BipsPay: Starting merchant callback process', {
        jobId: job.id,
        callbackUrl: merchantDetails.payin_callback
      });
      // Retry configuration - optimized for faster processing
      const maxRetries = 2; // Reduced from 3 to 2
      const baseDelay = 1000; // Reduced from 2 seconds to 1 second
      let lastError;

      // Add a timeout for the entire callback process (30 seconds max)
      const callbackTimeout = setTimeout(() => {
        logger.warn('BipsPay: Merchant callback process timeout - skipping callback', {
          jobId: job.id,
          apitxnid,
          callbackUrl: merchantDetails.payin_callback
        });
      }, 30000); // 30 seconds max for entire callback process

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`BipsPay: Starting callback attempt ${attempt}/${maxRetries}`, {
            jobId: job.id,
            apitxnid
          });

          let callbackData;
          if (statuscode === 'SUCCESS') {
            callbackData = {
              reference_id: apitxnid,
              amount: amount,
              status: mappedStatus,
              utr: utr,
              message: message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          } else {
            callbackData = {
              reference_id: apitxnid,
              transaction_id: txnid,
              amount: amount,
              status: mappedStatus,
              utr: utr,
              message: message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          }

          console.log("this is callback data of bipspay callback", callbackData);

          const response = await axios.post(merchantDetails.payin_callback, callbackData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000 // Reduced from 10 seconds to 5 seconds
          });

          logger.info('BipsPay: Callback sent successfully to merchant', {
            reference_id: apitxnid,
            callback_url: merchantDetails.payin_callback,
            response_status: response.status,
            attempt: attempt
          });

          // Clear callback timeout and break out of retry loop
          clearTimeout(callbackTimeout);
          break;

        } catch (error) {
          lastError = error;

          logger.warn('BipsPay: Callback attempt failed', {
            reference_id: apitxnid,
            callback_url: merchantDetails.payin_callback,
            error: error.message,
            attempt: attempt,
            maxRetries: maxRetries
          });

          // If this is the last attempt, log the final error
          if (attempt === maxRetries) {
            logger.error('BipsPay: Failed to send callback to merchant after all retries', {
              reference_id: apitxnid,
              callback_url: merchantDetails.payin_callback,
              error: error.message,
              totalAttempts: maxRetries
            });
            // Clear callback timeout on final failure
            clearTimeout(callbackTimeout);
          } else {
            // Wait before retrying with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info(`BipsPay: Retrying callback in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              reference_id: apitxnid
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } else {
      logger.warn('BipsPay: No callback URL found for merchant', {
        reference_id: apitxnid,
        user_id: userId
      });
    }

    // Clear timeout on successful completion
    clearTimeout(timeout);

    const processingTime = Date.now() - startTime;
    logger.info('BipsPay: Callback processed successfully', {
      reference_id: apitxnid,
      status: mappedStatus,
      utr,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      reference_id: apitxnid,
      status: mappedStatus
    };

  } catch (error) {
    // Clear timeout in case of error
    logger.error('Error processing BipsPay callback', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });

    if (job.attemptsMade >= 3) {
      logger.error('BipsPay job failed permanently after max retries', {
        jobId: job.id,
        attempts: job.attemptsMade
      });
      return { success: false, error: 'Max retries exceeded' };
    }

    throw error;
  }
});


// Process BipsPay payout callback jobs
bipspayPayoutCallbackQueue.process(async function (job) {
  try {
    logger.info('Processing BipsPay payout callback job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is bipspay payout job data", job.data);

    const callbackData = job.data.data || {};
    const transactionStatus = callbackData.status || job.data.status || 'unknown';
    const isSuccess = transactionStatus === 'SUCCESS';

    if (isSuccess) {
      // Update transaction charges
      await TransactionCharges.update(
        {
          status: 'completed',
          transaction_utr: callbackData.UTR || null
        },
        {
          where: {
            reference_id: callbackData.reference
          }
        }
      );
      logger.info('Transaction charges updated', { reference: callbackData.reference });

      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: callbackData.reference },
        {
          $set: {
            status: 'completed',
            gateway_response: {
              merchant_response: callbackData.reference,
              status: 'completed',
              message: callbackData.message || callbackData.remarks || 'Transaction processed',
              utr: callbackData.UTR || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: callbackData.reference });

      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: callbackData.reference },
        {
          $set: {
            status: 'completed',
            gateway_response: {
              merchant_response: callbackData.reference,
              status: 'completed',
              message: callbackData.message || callbackData.remarks || 'Transaction processed',
              utr: callbackData.UTR || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: callbackData.reference });
    } else {
      logger.info('BipsPay payout job failed', {
        jobId: job.id,
        status: transactionStatus,
        message: callbackData.message || callbackData.remarks || 'Transaction failed',
        attempts: job.attemptsMade
      });

      await TransactionCharges.update(
        {
          status: 'failed',
          transaction_utr: callbackData.UTR || null
        },
        {
          where: {
            reference_id: callbackData.reference
          }
        }
      );
      logger.info('Transaction charges updated', { reference: callbackData.reference });

      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: callbackData.reference },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: callbackData.reference,
              status: 'failed',
              message: callbackData.message || callbackData.remarks || 'Transaction failed',
              utr: callbackData.UTR || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: callbackData.reference });

      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: callbackData.reference },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: callbackData.reference,
              status: 'failed',
              message: callbackData.message || callbackData.remarks || 'Transaction failed',
              utr: callbackData.UTR || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: callbackData.reference });
    }

    const payoutTransaction = await PayoutTransaction.findOne({ reference_id: callbackData.reference });
    const userTransaction = await UserTransaction.findOne({ reference_id: callbackData.reference });

    if (!payoutTransaction || !userTransaction) {
      throw new Error('Transaction records not found');
    }

    const userId = payoutTransaction.user.user_id;
    const settlement_amount = payoutTransaction.amount;
    const chargesAmount = payoutTransaction.charges.total_charges;

    // Only update settlement wallet if payout failed (refund the money)
    if (!isSuccess) {
      const userCurrentBalance = await FinancialDetails.findOne({
        where: {
          user_id: parseInt(userId, 10)
        }
      });

      if (userCurrentBalance) {
        // Ensure all values are properly parsed as numbers and handle potential null/undefined values
        const currentSettlement = parseFloat(userCurrentBalance.settlement || 0);
        const settlementAmount = parseFloat(settlement_amount || 0);
        const chargesAmountParsed = parseFloat(chargesAmount || 0);

        const newSettlement = currentSettlement + settlementAmount + chargesAmountParsed;

        // Ensure the result is a valid number and round to 2 decimal places
        userCurrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
        await userCurrentBalance.save();

        logger.info('Settlement wallet refunded for failed payout', {
          reference_id: callbackData.reference,
          user_id: userId,
          amount_refunded: settlementAmount + chargesAmountParsed,
          new_settlement_balance: userCurrentBalance.settlement
        });
      }
    } else {
      logger.info('Payout successful - no settlement refund needed', {
        reference_id: callbackData.reference,
        user_id: userId
      });
    }

    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });

    if (merchantDetails?.payout_callback) {
      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let callbackDataToMerchant;
          if (isSuccess) {
            callbackDataToMerchant = {
              reference_id: callbackData.reference,
              amount: callbackData.amount,
              status: 'completed',
              utr: callbackData.UTR,
              message: callbackData.message || callbackData.remarks || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          } else {
            callbackDataToMerchant = {
              reference_id: callbackData.reference,
              transaction_id: callbackData.reference,
              amount: callbackData.amount,
              status: 'failed',
              utr: callbackData.UTR,
              message: callbackData.message || callbackData.remarks || 'Transaction failed',
              timestamp: new Date().toISOString()
            };
          }

          console.log("this is callback data of bipspay payout", callbackDataToMerchant);

          const response = await axios.post(merchantDetails.payout_callback, callbackDataToMerchant, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          logger.info('Callback sent successfully to merchant', {
            reference_id: callbackData.reference,
            callback_url: merchantDetails.payout_callback,
            response_status: response.status,
            attempt: attempt
          });

          // Success - break out of retry loop
          break;

        } catch (error) {
          lastError = error;

          logger.warn('Callback attempt failed', {
            reference_id: callbackData.reference,
            callback_url: merchantDetails.payout_callback,
            error: error.message,
            attempt: attempt,
            maxRetries: maxRetries
          });

          // If this is the last attempt, log the final error
          if (attempt === maxRetries) {
            logger.error('Failed to send callback to merchant after all retries', {
              reference_id: callbackData.reference,
              callback_url: merchantDetails.payout_callback,
              error: error.message,
              totalAttempts: maxRetries
            });
          } else {
            // Wait before retrying with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Retrying callback in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              reference_id: callbackData.reference
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } else {
      logger.warn('No callback URL found for merchant', {
        reference_id: callbackData.reference,
        user_id: userId
      });
    }

    return { success: true, jobId: job.id };
  } catch (error) {
    logger.error('Error processing BipsPay payout callback job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

bipspayPayoutCallbackQueue.on('completed', (job, result) => {
  logger.info('BipsPay payout callback job completed successfully', {
    jobId: job.id,
    result
  });
});

bipspayPayoutCallbackQueue.on('failed', (job, error) => {
  logger.error('BipsPay payout callback job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});
// Handle job events
callbackQueue.on('completed', (job, result) => {
  logger.info('Callback job completed successfully', {
    jobId: job.id,
    result
  });
});

callbackQueue.on('failed', (job, error) => {
  logger.error('Callback job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

callbackQueue.on('stalled', (job) => {
  logger.warn('Callback job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});

philpayPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing philpay payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is philpay payout job data", job.data)
    if (job.data.data.object.status == "success" || job.data.data.object.status == "Success") {
      // Update transaction charges
      await TransactionCharges.update(
        {
          status: 'completed',
          transaction_utr: job.data.data.object.bank_reference_id || null
        },
        {
          where: {
            reference_id: job.data.data.object.merchant_order_id
          }
        }
      );
      logger.info('Transaction charges stored', { reference: job.data.data.object.merchant_order_id });
      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'success',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'success',
              message: job.data.data.object.message || 'Transaction processed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: job.data.data.object.merchant_order_id });
      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'success',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'success',
              message: job.data.data.object.message || 'Transaction processed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: job.data.data.object.merchant_order_id });
    }
    else {
      logger.info('Philpay payout job failed', {
        jobId: job.id,
        status: job.data.data.object.status,
        message: job.data.data.object.acquirer_message || 'Transaction failed',
        attempts: job.attemptsMade
      });
      await TransactionCharges.update(
        {
          status: 'failed',
          transaction_utr: job.data.data.object.bank_reference_id || null
        },
        {
          where: {
            reference_id: job.data.data.object.merchant_order_id
          }
        }
      );
      logger.info('Transaction charges stored', { reference: job.data.data.object.merchant_order_id });
      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'failed',
              message: job.data.data.object.message || 'Transaction failed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: job.data.data.object.merchant_order_id });
      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'failed',
              message: job.data.data.object.message || 'Transaction failed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: job.data.data.object.merchant_order_id });
    }

    const payinTransaction = await PayoutTransaction.findOne({ reference_id: job.data.data.object.merchant_order_id });
    const userTransaction = await UserTransaction.findOne({ reference_id: job.data.data.object.merchant_order_id });

    if (!payinTransaction || !userTransaction) {
      throw new Error('Transaction records not found');
    }

    const userId = payinTransaction.user.user_id;
    const settlement_amount = payinTransaction.amount;
    const chargesAmount = payinTransaction.charges.total_charges;

    // Only update settlement wallet if payout failed (refund the money)
    if (job.data.data.object.status !== "success" && job.data.data.object.status !== "Success") {
      const userCurrrentBalance = await FinancialDetails.findOne({
        where: {
          user_id: parseInt(userId, 10)
        }
      });

      if (userCurrrentBalance) {
        // Ensure all values are properly parsed as numbers and handle potential null/undefined values
        const currentSettlement = parseFloat(userCurrrentBalance.settlement || 0);
        const settlementAmount = parseFloat(settlement_amount || 0);
        const chargesAmountParsed = parseFloat(chargesAmount || 0);

        const newSettlement = currentSettlement + settlementAmount + chargesAmountParsed;

        // Ensure the result is a valid number and round to 2 decimal places
        userCurrrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
        await userCurrrentBalance.save();

        logger.info('Settlement wallet refunded for failed payout', {
          reference_id: job.data.data.object.merchant_order_id,
          user_id: userId,
          amount_refunded: settlementAmount + chargesAmountParsed,
          new_settlement_balance: userCurrrentBalance.settlement
        });
      }
    } else {
      logger.info('Payout successful - no settlement refund needed', {
        reference_id: job.data.data.object.merchant_order_id,
        user_id: userId
      });
    }
    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });

    if (merchantDetails?.payout_callback) {
      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let callbackData;
          if (job.data.data.object.status == "success" || job.data.data.object.status == "Success") {
            callbackData = {
              reference_id: job.data.data.object.merchant_order_id,
              amount: job.data.data.object.amount / 100,
              status: job.data.data.object.status,
              utr: job.data.data.object.bank_reference_id,
              message: job.data.data.object.message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          } else {
            callbackData = {
              reference_id: job.data.data.object.merchant_order_id,
              transaction_id: job.data.data.object.merchant_order_id,
              amount: job.data.data.object.amount / 100,
              status: job.data.data.object.status,
              utr: job.data.data.object.bank_reference_id,
              message: job.data.data.object.message || 'Transaction failed',
              timestamp: new Date().toISOString()
            };
          }

          console.log("this is callback data of philpay payout", callbackData)

          const response = await axios.post(merchantDetails.payout_callback, callbackData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          logger.info('Callback sent successfully to merchant', {
            reference_id: job.data.data.object.merchant_order_id,
            callback_url: merchantDetails.payout_callback,
            response_status: response.status,
            attempt: attempt
          });

          // Success - break out of retry loop
          break;

        } catch (error) {
          lastError = error;

          logger.warn('Callback attempt failed', {
            reference_id: job.data.data.object.merchant_order_id,
            callback_url: merchantDetails.payout_callback,
            error: error.message,
            attempt: attempt,
            maxRetries: maxRetries
          });

          // If this is the last attempt, log the final error
          if (attempt === maxRetries) {
            logger.error('Failed to send callback to merchant after all retries', {
              reference_id: job.data.data.object.merchant_order_id,
              callback_url: merchantDetails.payout_callback,
              error: error.message,
              totalAttempts: maxRetries
            });
          } else {
            // Wait before retrying with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Retrying callback in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              reference_id: job.data.data.object.merchant_order_id
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
    else {
      logger.warn('No callback URL found for merchant', {
        reference_id: job.data.data.object.merchant_order_id,
        user_id: userId
      });
    }

    return { success: true, jobId: job.id };
  } catch (error) {
    logger.error('Error processing philpay payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

philpayPayoutQueue.on('completed', (job, result) => {
  logger.info('Philpay payout job completed successfully', {
    jobId: job.id,
    result
  });
});

philpayPayoutQueue.on('failed', (job, error) => {
  logger.error('Philpay payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

philpayPayoutQueue.on('stalled', (job) => {
  logger.warn('Philpay payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down callback worker...');
  await mongoose.connection.close();
  await callbackQueue.close();
  await philpayPayoutQueue.close();
  process.exit(0);
});

// Log worker start
logger.info('Callback worker started and processing jobs'); 