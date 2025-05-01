const Queue = require('bull');
const { logger } = require('../utils/logger');

// Redis connection options with retry strategy
const redisOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: function(times) {
      const delay = Math.min(times * 50, 2000);
      logger.info(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3
  }
};

logger.info('Initializing Bull queues with Redis options:', redisOptions);

// Create queues with error handling
let payinQueue;

try {
  payinQueue = new Queue('payin', redisOptions);
  logger.info('Bull queue created successfully');
} catch (error) {
  logger.error('Error creating Bull queue:', {
    error: error.message,
    stack: error.stack
  });
  throw error;
}

// Global error handler for queue
const setupQueueErrorHandlers = () => {
  payinQueue.on('error', (error) => {
    logger.error(`Queue error in ${payinQueue.name}:`, { 
      error: error.message,
      stack: error.stack
    });
  });

  payinQueue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in ${payinQueue.name} failed:`, { 
      error: error.message,
      stack: error.stack,
      data: job.data
    });
  });

  payinQueue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in ${payinQueue.name} stalled`);
  });

  payinQueue.on('ready', () => {
    logger.info(`Queue ${payinQueue.name} is ready to process jobs`);
  });

  payinQueue.on('active', (job) => {
    logger.info(`Job ${job.id} in ${payinQueue.name} started processing`);
  });
};

// Setup queue error handlers
setupQueueErrorHandlers();

module.exports = {
  payinQueue
}; 