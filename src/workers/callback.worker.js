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
      reference_id,
      status,
      utr,
      message,
      raw_response
    } = job.data;

    // Find the transaction
    const transaction = await PayinTransaction.findOne({ reference_id });
    if (!transaction) {
      throw new Error(`Transaction not found for reference_id: ${reference_id}`);
    }

    // Update transaction status
    const updateData = {
      status: status.toLowerCase(),
      gateway_response: {
        utr,
        status: status.toLowerCase(),
        message,
        raw_response
      }
    };

    // Update all related records
    await Promise.all([
      // Update payin transaction
      PayinTransaction.updateOne(
        { reference_id },
        { $set: updateData }
      ),
      // Update user transaction
      UserTransaction.updateOne(
        { reference_id },
        { $set: updateData }
      ),
      // Update transaction charges using Sequelize syntax
      TransactionCharges.update(
        { status: status.toLowerCase() },
        { 
          where: { reference_id },
          returning: true
        }
      )
    ]);

    logger.info('Callback processed successfully', {
      reference_id,
      status,
      utr
    });

    return {
      success: true,
      reference_id,
      status
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