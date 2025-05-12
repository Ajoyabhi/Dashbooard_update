const { payinQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');

logger.info('Starting payment worker...');

// Import the worker to start processing
require('./payment.worker');

// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down worker...');
  await payinQueue.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker', {
    reason,
    promise
  });
  process.exit(1);
}); 