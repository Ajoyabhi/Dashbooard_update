const { callbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
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
    const mappedStatus = statuscode === 'TXN' ? 'completed' : 'failed';

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
      try {
        const callbackData = {
          reference_id: apitxnid,
          transaction_id: txnid,
          amount: amount,
          status: mappedStatus,
          utr: utr,
          message: message || 'Transaction processed',
          timestamp: new Date().toISOString()
        };

        const response = await axios.post(merchantDetails.payin_callback, callbackData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        logger.info('Callback sent successfully to merchant', {
          reference_id: apitxnid,
          callback_url: merchantDetails.payin_callback,
          response_status: response.status
        });
      } catch (error) {
        logger.error('Failed to send callback to merchant', {
          reference_id: apitxnid,
          callback_url: merchantDetails.payin_callback,
          error: error.message
        });
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

// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down callback worker...');
  await mongoose.connection.close();
  await callbackQueue.close();
  process.exit(0);
});

// Log worker start
logger.info('Callback worker started and processing jobs'); 