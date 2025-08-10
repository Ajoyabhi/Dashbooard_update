const { callbackQueue, philpayPayoutQueue } = require('../config/queue.config');
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

// Process callback jobs
callbackQueue.process(async function(job) {
  try {
    logger.info('Processing callback job', { 
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });

    // Set job timeout
    const timeout = setTimeout(() => {
      throw new Error('Job processing timeout');
    }, 30000); // 30 seconds timeout

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
    const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });
    const userTransaction = await UserTransaction.findOne({ reference_id: apitxnid });

    if (!payinTransaction || !userTransaction) {
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
      const adminCharge = parseFloat(userTransaction.charges?.admin_charge || 0);
      const platformFee = parseFloat(userTransaction.platform_fee || 0);
      const gstAmount = parseFloat(userTransaction.gst_amount || 0);

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

    // Send callback to merchant
    const merchantDetails = await MerchantDetails.findOne({
      where: { 
        user_id: parseInt(userId, 10)
      }
    });

    if (merchantDetails?.payin_callback) {
      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let callbackData;
          if (statuscode === 'SUCCESS'){  
          callbackData = {
            reference_id: apitxnid,
            amount: amount,
            status: mappedStatus,
            utr: utr,
            message: message || 'Transaction processed',
            timestamp: new Date().toISOString()
          };
          }else{
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
            timeout: 10000
          });

          logger.info('Callback sent successfully to merchant', {
            reference_id: apitxnid,
            callback_url: merchantDetails.payin_callback,
            response_status: response.status,
            attempt: attempt
          });
          
          // Success - break out of retry loop
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

    clearTimeout(timeout);

    logger.info('Callback processed successfully', {
      reference_id: apitxnid,
      status: mappedStatus,
      utr
    });

    return {
      success: true,
      reference_id: apitxnid,
      status: mappedStatus
    };

  } catch (error) {
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

philpayPayoutQueue.process(async function(job) {
  try {
    logger.info('Processing philpay payout job', { 
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is philpay payout job data", job.data)
    if(job.data.data.object.status == "success" || job.data.data.object.status == "Success"){
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
    else{
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
    const userCurrrentBalance = await FinancialDetails.findOne({
       where: {
         user_id: parseInt(userId, 10)
       }
    });

    if(userCurrrentBalance){
       // Ensure all values are properly parsed as numbers and handle potential null/undefined values
       const currentSettlement = parseFloat(userCurrrentBalance.settlement || 0);
       const settlementAmount = parseFloat(settlement_amount || 0);
       const chargesAmountParsed = parseFloat(chargesAmount || 0);
       
       const newSettlement = currentSettlement + settlementAmount + chargesAmountParsed;
       
       // Ensure the result is a valid number and round to 2 decimal places
       userCurrrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
       await userCurrrentBalance.save();
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
          if (job.data.data.object.status == "success" || job.data.data.object.status == "Success"){  
          callbackData = {
            reference_id: job.data.data.object.merchant_order_id,
            amount: job.data.data.object.amount / 100,
            status: job.data.data.object.status,
            utr: job.data.data.object.bank_reference_id,
            message: job.data.data.object.message || 'Transaction processed',
            timestamp: new Date().toISOString()
          };
          }else{
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
    else{
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