const { payinQueue } = require('../config/queue.config');
const { processPayment } = require('../services/payment.service');
const { logger } = require('../utils/logger');

// Log when worker is initialized
logger.info('Payment worker initialized');

// Verify Redis connection
payinQueue.isReady().then(() => {
  logger.info('Payin queue is ready and connected to Redis');
}).catch(error => {
  logger.error('Error connecting to Redis for payin queue:', {
    error: error.message,
    stack: error.stack
  });
});

// Process payin jobs
payinQueue.process(async (job) => {
  try {
    logger.info('Starting to process payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      data: job.data
    });

    // Log the job data for debugging
    logger.info('Job data:', job.data);

    const result = await processPayment(job.data);
    
    logger.info('Payin job completed successfully', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      success: result.success,
      result: result
    });

    return result;
  } catch (error) {
    logger.error('Error processing payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
});

// Job completion handlers
payinQueue.on('completed', (job, result) => {
  logger.info('Payin job completed successfully', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id,
    result: result
  });
});

// Job failure handlers with retry logic
payinQueue.on('failed', (job, error) => {
  logger.error('Payin job failed', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });

  // Retry logic
  if (job.attemptsMade < 3) {
    logger.info('Retrying payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      attempt: job.attemptsMade + 1
    });
  } else {
    logger.error('Payin job failed after maximum retries', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id
    });
  }
});

// Queue error handlers
payinQueue.on('error', (error) => {
  logger.error('Payin queue error:', { 
    error: error.message,
    stack: error.stack
  });
});

payinQueue.on('stalled', (job) => {
  logger.warn('Payin job stalled:', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id
  });
});

// Export the worker
module.exports = {
  payinQueue
}; 