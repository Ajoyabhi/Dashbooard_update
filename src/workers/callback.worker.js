const { callbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { TransactionCharges, FinancialDetails } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');

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

    if(mappedStatus == 'completed'){
      // Find the payin transaction to get user_id
      const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });
      const userTransaction = await UserTransaction.findOne({ reference_id: apitxnid });

      if(userTransaction){
        await UserTransaction.updateOne(
          { reference_id: apitxnid },
          { 
            $set: {
              'balance.after': userTransaction.balance.before + parseFloat(amount) - parseFloat(userTransaction.charges.admin_charge)
            }
          }
        );
      }
      
      if (payinTransaction) {
        const userId = payinTransaction.user.user_id;
        
        // Check if user exists in FinancialDetails
        const financialDetails = await FinancialDetails.findOne({
          where: { user_id: userId }
        });
        const amountToAdd = parseFloat(amount) - parseFloat(userTransaction.charges.admin_charge);
        if (financialDetails) {
          // Update existing record
          await financialDetails.increment('wallet', {
            by: amountToAdd
          });
        } else {
          // Create new record with initial wallet balance
          await FinancialDetails.create({
            user_id: userId,
            wallet: amount,
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
      } else {
        logger.warn('Payin transaction not found for updating wallet balance', {
          reference_id: apitxnid
        });
      }
    }

    // Update transaction status
    const updateData = {
      status: mappedStatus,
      gateway_response: {
        utr,
        status: mappedStatus,
        message: message || 'Transaction processed',
        raw_response: job.data
      }
    };

    // Update all related records with transaction
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

    // If job has failed too many times, mark it as failed permanently
    if (job.attemptsMade >= 3) {
      logger.error('Job failed permanently after max retries', {
        jobId: job.id,
        attempts: job.attemptsMade
      });
      return { success: false, error: 'Max retries exceeded' };
    }

    // Throw error to trigger retry
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