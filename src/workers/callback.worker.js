const { callbackQueue, philpayPayoutQueue, bipspayCallbackQueue, bipspayPayoutCallbackQueue, merchantCallbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { TransactionCharges, FinancialDetails, MerchantDetails, MerchantCharges, PlatformCharges } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');
const axios = require('axios');
const { redis } = require('../middleware/cache.middleware');

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

// Process generic callback jobs (Unpay / others using common format) with concurrency
// Increased concurrency for better throughput - can handle more callbacks simultaneously
const CALLBACK_CONCURRENCY = 15; // Process 15 jobs at a time (increased from 10)
logger.info(`Starting callback worker with concurrency of ${CALLBACK_CONCURRENCY}`);
callbackQueue.process(CALLBACK_CONCURRENCY, async function (job) {
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


    // Find transactions once
    logger.info('Starting database lookups', { jobId: job.id, apitxnid });
    const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });
    logger.info('Database lookups completed', { jobId: job.id, apitxnid });

    logger.info('Transaction lookup results', {
      jobId: job.id,
      apitxnid,
      payinTransactionFound: !!payinTransaction,
      payinTransactionId: payinTransaction?._id
    });

    if (!payinTransaction) {
      logger.error('Transaction records not found', {
        jobId: job.id,
        apitxnid,
        payinTransactionFound: !!payinTransaction,
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
      const transactionAmount = parseFloat(amount || 0);
      const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
      const platformFee = parseFloat(payinTransaction.platform_fee || 0);
      const gstAmount = parseFloat(payinTransaction.gst_amount || 0);

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
    // Clear timeout in case of error (if it was set)
    if (typeof timeout !== 'undefined') {
      clearTimeout(timeout);
    }

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

// Process BipsPay payin callback jobs with concurrency
// Set concurrency to process multiple jobs simultaneously
// Increased for better throughput - optimized for Bipspay callbacks
const BIPSPAY_CALLBACK_CONCURRENCY = 15; // Process 15 jobs at a time (increased from 10)
logger.info(`Starting BipsPay callback worker with concurrency of ${BIPSPAY_CALLBACK_CONCURRENCY}`);
bipspayCallbackQueue.process(BIPSPAY_CALLBACK_CONCURRENCY, async function (job) {
  const startTime = Date.now();
  let timeout = null;
  const logContext = {
    jobId: job.id,
    attempts: job.attemptsMade
  };
  
  try {
    logger.info('Processing BipsPay callback job', logContext);

    // Set job timeout - increased to 5 minutes to handle slow operations
    timeout = setTimeout(() => {
      logger.error('BipsPay job processing timeout - taking too long', {
        jobId: job.id,
        attempts: job.attemptsMade,
        data: job.data
      });
      throw new Error('BipsPay job processing timeout');
    }, 300000);

    const { event, status, data } = job.data || {};

    // Handle both flat and nested callback formats
    // Flat format: { apitxnid, statuscode, amount, txnid, utr, message, status }
    // Nested format: { event, status, data: { reference, order_id, amount, UTR, remarks, status } }
    const isFlatFormat = job.data?.apitxnid !== undefined || job.data?.statuscode !== undefined;
    
    let statuscode, amount, apitxnid, txnid, utr, message;
    
    if (isFlatFormat) {
      // Flat format - data is directly in job.data
      statuscode = job.data.statuscode || job.data.status || 'FAILED';
      amount = job.data.amount;
      apitxnid = job.data.apitxnid; // Our reference_id in DB
      txnid = job.data.txnid;
      utr = job.data.utr;
      message = job.data.message || job.data.status || 'Transaction processed';
    } else {
      // Nested format - data is in job.data.data
      statuscode =
        status === 'SUCCESS' || data?.status === 'SUCCESS'
          ? 'SUCCESS'
          : status || data?.status || 'FAILED';
      amount = data?.amount;
      apitxnid = data?.reference || data?.order_id; // Our reference_id in DB
      txnid = data?.order_id;
      utr = data?.UTR;
      message = data?.remarks || status || data?.status || 'Transaction processed';
    }

    // Validate that we have a reference_id before proceeding
    if (!apitxnid) {
      logger.error('BipsPay: Missing reference_id (apitxnid) in callback data', {
        jobId: job.id,
        jobData: job.data,
        isFlatFormat,
        extractedFields: {
          statuscode,
          amount,
          apitxnid,
          txnid,
          utr,
          message
        }
      });
      throw new Error('Missing reference_id (apitxnid) in callback data');
    }

    // Map BipsPay status to our status format
    const mappedStatus = (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';
    
    // Update log context with reference_id
    logContext.reference_id = apitxnid;

    // Find transaction
    const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });

    if (!payinTransaction) {
      logger.error('BipsPay: Transaction records not found', logContext);
      throw new Error('Transaction records not found');
    }
    
    // Get userId from transaction and fetch merchant details
    const transactionUserId = payinTransaction.user.user_id;
    let merchantDetails = null;
    if (transactionUserId) {
      merchantDetails = await MerchantDetails.findOne({
        where: { user_id: parseInt(transactionUserId, 10) }
      });
    }

    // After verifying records, ensure callback amount matches original requested amount
    const requestedAmount = parseFloat(payinTransaction.amount || 0);
    const callbackAmount = parseFloat(amount || 0);

    if (!isNaN(requestedAmount) && !isNaN(callbackAmount) && requestedAmount !== callbackAmount) {
      logger.warn('BipsPay: Amount mismatch detected, recalculating charges', {
        ...logContext,
        requestedAmount,
        callbackAmount
      });

      const userId = payinTransaction.user.user_id;

      // Optimize PlatformCharges with Redis caching (5 min TTL)
      let platformCharges = null;
      try {
        const cachedPlatformCharges = await redis.get('platform_charges:active');
        if (cachedPlatformCharges) {
          platformCharges = JSON.parse(cachedPlatformCharges);
        } else {
          platformCharges = await PlatformCharges.findOne({ where: { is_active: true } });
          if (platformCharges) {
            await redis.setex('platform_charges:active', 300, JSON.stringify(platformCharges));
          }
        }
      } catch (err) {
        logger.error('Redis cache error for platform charges in worker', { error: err.message });
        platformCharges = await PlatformCharges.findOne({ where: { is_active: true } });
      }

      const [chargeBrackets] = await Promise.all([
        MerchantCharges.findAll({
          where: { user_id: userId },
          order: [['start_amount', 'ASC']]
        })
      ]);

      if (!chargeBrackets || chargeBrackets.length === 0) {
        logger.error('BipsPay: No charge brackets found for amount mismatch recalculation', {
          ...logContext,
          user_id: userId
        });
        // Continue with existing charges if brackets not found
      } else {
        // Find applicable charge bracket
        const applicableBracket = chargeBrackets.find(bracket => {
          const startAmount = parseFloat(bracket.start_amount);
          const endAmount = parseFloat(bracket.end_amount);
          return callbackAmount >= startAmount && callbackAmount <= endAmount;
        });

        if (applicableBracket) {
          // Recalculate charges based on new amount
          let newAdminCharge = 0;
          let newAgentCharge = 0;
          let newGstAmount = 0;
          let newPlatformFee = 0;

          if (applicableBracket.admin_payin_charge_type === 'percentage') {
            newAdminCharge = (callbackAmount * parseFloat(applicableBracket.admin_payin_charge)) / 100;
          } else {
            newAdminCharge = parseFloat(applicableBracket.admin_payin_charge);
          }

          if (applicableBracket.agent_payin_charge_type === 'percentage') {
            newAgentCharge = (callbackAmount * parseFloat(applicableBracket.agent_payin_charge)) / 100;
          } else {
            newAgentCharge = parseFloat(applicableBracket.agent_payin_charge);
          }

          const newTotalCharges = parseFloat(newAdminCharge);

          // Use platform charges fetched in parallel above
          if (platformCharges?.charge) {
            newPlatformFee = (newTotalCharges * parseFloat(platformCharges.charge)) / 100;
          }

          if (platformCharges?.gst) {
            newGstAmount = (newTotalCharges * parseFloat(platformCharges.gst)) / 100;
          }

          // Update all collections with new amount and recalculated charges
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Promise.all([
                PayinTransaction.updateOne(
                  { reference_id: apitxnid },
                  {
                    $set: {
                      amount: callbackAmount,
                      charges: {
                        admin_charge: newAdminCharge,
                        agent_charge: newAgentCharge,
                        total_charges: newTotalCharges
                      },
                      gst_amount: parseFloat(newGstAmount),
                      platform_fee: parseFloat(newPlatformFee)
                    }
                  }
                ),
                TransactionCharges.update(
                  {
                    transaction_amount: callbackAmount,
                    merchant_charge: parseFloat(newAdminCharge),
                    agent_charge: parseFloat(newAgentCharge),
                    total_charges: parseFloat(newTotalCharges),
                    gst_amount: parseFloat(newGstAmount),
                    platform_fee: parseFloat(newPlatformFee)
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

        } else {
          logger.warn('BipsPay: No applicable charge bracket found, updating amount only', {
            ...logContext,
            callbackAmount
          });
          // Update amount only if no bracket found
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await Promise.all([
                PayinTransaction.updateOne(
                  { reference_id: apitxnid },
                  { $set: { amount: callbackAmount } }
                ),
                TransactionCharges.update(
                  { transaction_amount: callbackAmount },
                  { where: { reference_id: apitxnid }, returning: true }
                )
              ]);
            });
          } finally {
            await session.endSession();
          }
        }
      }
      
      // Update payinTransaction reference with new amount if recalculated
      if (applicableBracket) {
        payinTransaction.amount = callbackAmount;
        payinTransaction.charges = {
          admin_charge: newAdminCharge,
          agent_charge: newAgentCharge,
          total_charges: newTotalCharges
        };
        payinTransaction.gst_amount = parseFloat(newGstAmount);
        payinTransaction.platform_fee = parseFloat(newPlatformFee);
      } else {
        payinTransaction.amount = callbackAmount;
      }
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

    // Handle completed transaction - parallelize financial operations
    if (mappedStatus === 'completed') {
      // Ensure all values are numbers with defaults
      const transactionAmount = parseFloat(amount || 0);
      const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
      const platformFee = parseFloat(payinTransaction.platform_fee || 0);
      const gstAmount = parseFloat(payinTransaction.gst_amount || 0);

      const amountToAdd = transactionAmount - adminCharge - platformFee - gstAmount;

      // Parallelize financial updates
      const [financialDetails] = await Promise.all([
        FinancialDetails.findOne({ where: { user_id: userId } })
      ]);

      // Update or create financial details
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
    }

    // Update all transaction records in a single session
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          PayinTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: updateData },
            { session }
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

    // Queue merchant callback instead of blocking
    if (merchantDetails?.payin_callback) {
      const callbackData = {
        reference_id: apitxnid,
        amount: amount,
        status: mappedStatus,
        utr: utr,
        message: message || 'Transaction processed',
        timestamp: new Date().toISOString(),
        _callback_received_at: job.data._callback_received_at // Pass received time for timing calculation
      };
      
      // Add transaction_id for failed transactions
      if (txnid) {
        callbackData.transaction_id = txnid;
      }
      
      await merchantCallbackQueue.add({
        callbackUrl: merchantDetails.payin_callback,
        callbackData: callbackData,
        reference_id: apitxnid
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }

    // Clear timeout on successful completion
    clearTimeout(timeout);

    const processingTime = Date.now() - startTime;
    logger.info('BipsPay: Callback processed successfully', {
      ...logContext,
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
    // Clear timeout in case of error (if it was set)
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    logger.error('Error processing BipsPay callback', {
      ...logContext,
      error: error.message
    });

    if (job.attemptsMade >= 3) {
      logger.error('BipsPay job failed permanently after max retries', logContext);
      return { success: false, error: 'Max retries exceeded' };
    }

    throw error;
  }
});


// Process BipsPay payout callback jobs with concurrency
// Increased for better throughput - optimized for Bipspay payout callbacks
const BIPSPAY_PAYOUT_CALLBACK_CONCURRENCY = 15; // Process 15 jobs at a time (increased from 10)
logger.info(`Starting BipsPay payout callback worker with concurrency of ${BIPSPAY_PAYOUT_CALLBACK_CONCURRENCY}`);
bipspayPayoutCallbackQueue.process(BIPSPAY_PAYOUT_CALLBACK_CONCURRENCY, async function (job) {
  const logContext = {
    jobId: job.id,
    attempts: job.attemptsMade
  };
  
  try {
    const callbackData = job.data.data || job.data || {};
    const referenceId = callbackData.reference || callbackData.order_id;
    const transactionStatus = callbackData.status || job.data.status || 'unknown';
    const isSuccess = transactionStatus === 'SUCCESS' || transactionStatus === 'completed' || transactionStatus.toUpperCase() === 'SUCCESS';
    
    logContext.reference_id = referenceId;
    logContext.status = transactionStatus;

    if (!referenceId) {
      logger.error('BipsPay payout: Missing reference_id in callback data', logContext);
      throw new Error('Missing reference_id in callback data');
    }

    // Find transaction
    const payoutTransaction = await PayoutTransaction.findOne({ reference_id: referenceId });

    if (!payoutTransaction) {
      logger.error('BipsPay payout: Transaction records not found', logContext);
      throw new Error('Transaction records not found');
    }

    const updateData = {
      status: isSuccess ? 'completed' : 'failed',
      gateway_response: {
        merchant_response: referenceId,
        status: isSuccess ? 'completed' : 'failed',
        message: callbackData.message || callbackData.remarks || (isSuccess ? 'Transaction processed' : 'Transaction failed'),
        utr: callbackData.UTR || null
      }
    };

    // Parallelize all transaction updates in single session
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          PayoutTransaction.updateOne(
            { reference_id: referenceId },
            { $set: updateData },
            { session }
          ),
          TransactionCharges.update(
            {
              status: isSuccess ? 'completed' : 'failed',
              transaction_utr: callbackData.UTR || null
            },
            {
              where: { reference_id: referenceId }
            }
          )
        ]);
      });
    } finally {
      await session.endSession();
    }

    // Get userId from transaction (already fetched)
    const userId = payoutTransaction.user.user_id;
    const settlement_amount = payoutTransaction.amount;
    const chargesAmount = payoutTransaction.charges.total_charges;
    const gstAmount = parseFloat(payoutTransaction.gst_amount || 0);
    const platformFee = parseFloat(payoutTransaction.platform_fee || 0);

    // Only update settlement wallet if payout failed (refund the money)
    if (!isSuccess) {
      const userCurrentBalance = await FinancialDetails.findOne({
        where: {
          user_id: parseInt(userId, 10)
        }
      });

      if (userCurrentBalance) {
        const currentSettlement = parseFloat(userCurrentBalance.settlement || 0);
        const settlementAmount = parseFloat(settlement_amount || 0);
        const chargesAmountParsed = parseFloat(chargesAmount || 0);
        const totalRefundAmount = settlementAmount + chargesAmountParsed + gstAmount + platformFee;
        const newSettlement = currentSettlement + totalRefundAmount;

        userCurrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
        await userCurrentBalance.save();
      }
    }

    // Fetch merchant details and queue callback
    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });

    // Queue merchant callback instead of blocking
    if (merchantDetails?.payout_callback) {
      const callbackDataToMerchant = {
        reference_id: referenceId,
        amount: callbackData.amount || payoutTransaction.amount,
        status: isSuccess ? 'completed' : 'failed',
        utr: callbackData.UTR || null,
        message: callbackData.message || callbackData.remarks || (isSuccess ? 'Transaction processed' : 'Transaction failed'),
        timestamp: new Date().toISOString(),
        _callback_received_at: job.data._callback_received_at // Pass received time for timing calculation
      };
      
      // Add transaction_id for failed transactions
      if (!isSuccess) {
        callbackDataToMerchant.transaction_id = referenceId;
      }
      
      await merchantCallbackQueue.add({
        callbackUrl: merchantDetails.payout_callback,
        callbackData: callbackDataToMerchant,
        reference_id: referenceId
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }

    return { success: true, jobId: job.id };
  } catch (error) {
    logger.error('Error processing BipsPay payout callback job', {
      ...logContext,
      error: error.message
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

// Process Philpay payout jobs with concurrency
// Increased for better throughput
const PHILPAY_PAYOUT_CONCURRENCY = 15; // Process 15 jobs at a time (increased from 10)
logger.info(`Starting Philpay payout worker with concurrency of ${PHILPAY_PAYOUT_CONCURRENCY}`);
philpayPayoutQueue.process(PHILPAY_PAYOUT_CONCURRENCY, async function (job) {
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

    if (!payinTransaction) {
      throw new Error('Transaction records not found');
    }

    const userId = payinTransaction.user.user_id;
    const settlement_amount = payinTransaction.amount;
    const chargesAmount = payinTransaction.charges.total_charges;
    const gstAmount = parseFloat(payinTransaction.gst_amount || 0);
    const platformFee = parseFloat(payinTransaction.platform_fee || 0);

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

        // Include GST and platform fees in the refund calculation
        const totalRefundAmount = settlementAmount + chargesAmountParsed + gstAmount + platformFee;
        const newSettlement = currentSettlement + totalRefundAmount;

        // Ensure the result is a valid number and round to 2 decimal places
        userCurrrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
        await userCurrrentBalance.save();

        logger.info('Settlement wallet refunded for failed payout', {
          reference_id: job.data.data.object.merchant_order_id,
          user_id: userId,
          amount_refunded: totalRefundAmount,
          breakdown: {
            settlement_amount: settlementAmount,
            charges: chargesAmountParsed,
            gst_amount: gstAmount,
            platform_fee: platformFee
          },
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

// Process merchant callback jobs - non-blocking merchant callbacks
// Higher concurrency for merchant callbacks as they're lightweight HTTP calls
const MERCHANT_CALLBACK_CONCURRENCY = 30; // Process 30 merchant callbacks concurrently (increased from 20)
logger.info(`Starting merchant callback worker with concurrency of ${MERCHANT_CALLBACK_CONCURRENCY}`);
merchantCallbackQueue.process(MERCHANT_CALLBACK_CONCURRENCY, async (job) => {
  const { callbackUrl, callbackData, reference_id } = job.data;
  const callbackSentAt = new Date();
  let attempts = 0;
  const maxRetries = 3;
  const baseDelay = 2000;
  
  const logContext = {
    jobId: job.id,
    reference_id: reference_id || callbackData.reference_id,
    callbackUrl
  };
  
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt;
      try {
        const response = await axios.post(callbackUrl, callbackData, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        
        // Calculate processing time
        const callbackReceivedAt = callbackData._callback_received_at 
          ? new Date(callbackData._callback_received_at) 
          : null;
        const processingTimeMs = callbackReceivedAt 
          ? callbackSentAt.getTime() - callbackReceivedAt.getTime() 
          : null;
        
        // Update transaction with callback sent time (works for both PayinTransaction and PayoutTransaction)
        const updateReferenceId = reference_id || callbackData.reference_id;
        if (updateReferenceId) {
          // Try to update PayinTransaction first, then PayoutTransaction
          await Promise.all([
            PayinTransaction.updateOne(
              { reference_id: updateReferenceId },
              { 
                $set: { 
                  'callback_timing.sent_to_merchant_at': callbackSentAt,
                  'callback_timing.processing_time_ms': processingTimeMs,
                  'callback_timing.merchant_callback_attempts': attempts,
                  'callback_timing.merchant_callback_status': 'sent'
                } 
              }
            ).catch(() => null), // Ignore if not found (might be payout)
            PayoutTransaction.updateOne(
              { reference_id: updateReferenceId },
              { 
                $set: { 
                  'callback_timing.sent_to_merchant_at': callbackSentAt,
                  'callback_timing.processing_time_ms': processingTimeMs,
                  'callback_timing.merchant_callback_attempts': attempts,
                  'callback_timing.merchant_callback_status': 'sent'
                } 
              }
            ).catch(() => null) // Ignore if not found (might be payin)
          ]);
        }
        
        logger.info('Merchant callback sent successfully', {
          ...logContext,
          attempt: attempts,
          status: response.status,
          processing_time_ms: processingTimeMs
        });
        
        return { success: true, processing_time_ms: processingTimeMs };
      } catch (error) {
        if (attempt === maxRetries) {
          // Update with failed status (works for both PayinTransaction and PayoutTransaction)
          const updateReferenceId = reference_id || callbackData.reference_id;
          if (updateReferenceId) {
            await Promise.all([
              PayinTransaction.updateOne(
                { reference_id: updateReferenceId },
                { 
                  $set: { 
                    'callback_timing.merchant_callback_attempts': attempts,
                    'callback_timing.merchant_callback_status': 'failed'
                  } 
                }
              ).catch(() => null), // Ignore if not found
              PayoutTransaction.updateOne(
                { reference_id: updateReferenceId },
                { 
                  $set: { 
                    'callback_timing.merchant_callback_attempts': attempts,
                    'callback_timing.merchant_callback_status': 'failed'
                  } 
                }
              ).catch(() => null) // Ignore if not found
            ]);
          }
          
          logger.error('Merchant callback failed after retries', {
            ...logContext,
            error: error.message,
            attempts: attempts
          });
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
  } catch (error) {
    logger.error('Error processing merchant callback', {
      ...logContext,
      error: error.message
    });
    throw error;
  }
});

// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down callback worker...');
  try {
    await mongoose.connection.close();
    await Promise.all([
      callbackQueue.close(),
      bipspayCallbackQueue.close(),
      bipspayPayoutCallbackQueue.close(),
      philpayPayoutQueue.close(),
      merchantCallbackQueue.close()
    ]);
    logger.info('All callback workers closed successfully');
  } catch (error) {
    logger.error('Error closing callback workers:', error);
  }
  process.exit(0);
});

// Log worker start
logger.info('Callback worker started and processing jobs'); 