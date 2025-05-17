const { callbackQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { TransactionCharges } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  logger.info('MongoDB connected successfully in callback worker');
})
.catch((err) => {
  logger.error('MongoDB connection error in callback worker:', err);
  process.exit(1); // Exit if cannot connect to database
});

// Process callback jobs
callbackQueue.process(async (job) => {
  try {
    logger.info('Processing callback job', { 
      jobId: job.id,
      data: job.data
    });

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

    // Find the transaction using apitxnid as reference_id
    const transaction = await PayinTransaction.findOne({ reference_id: apitxnid });
    if (!transaction) {
      throw new Error(`Transaction not found for reference_id: ${apitxnid}`);
    }

    // Update transaction status
    const updateData = {
      status: mappedStatus,
      gateway_response: {
        utr,
        status: mappedStatus,
        message: message || 'Transaction processed',
        raw_response: job.data // Store the complete callback data
      }
    };

    // Update all related records
    await Promise.all([
      // Update payin transaction
      PayinTransaction.updateOne(
        { reference_id: apitxnid },
        { $set: updateData }
      ),
      // Update user transaction
      UserTransaction.updateOne(
        { reference_id: apitxnid },
        { $set: updateData }
      ),
      // Update transaction charges using Sequelize syntax
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
      stack: error.stack
    });
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
    stack: error.stack
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