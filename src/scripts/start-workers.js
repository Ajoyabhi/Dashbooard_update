const { logger } = require('../utils/logger');
const { payinQueue } = require('../config/queue.config');

// Start the worker directly without clustering
logger.info('Starting payment worker...');

// Verify Redis connection and start worker
payinQueue.isReady().then(() => {
  logger.info('Payin queue is ready and connected to Redis');
  
  // Import the worker to start processing
  require('../workers/payment.worker');
  
  logger.info(`Worker ${process.pid} started and processing jobs`);
}).catch(error => {
  logger.error('Error connecting to Redis for payin queue:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}); 