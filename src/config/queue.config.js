const Bull = require('bull');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');
require('dotenv').config();


// Create Redis clients for different purposes
const createRedisClient = (type) => {
  logger.info(`Creating Redis client for ${type}`);

  // Ensure port is a valid number
  const port = parseInt(process.env.REDIS_PORT);
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid Redis port: ${process.env.REDIS_PORT}`);
  }

  // Base configuration for all clients
  const baseConfig = {
    host: process.env.REDIS_HOST,
    port: port,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis ${type} client max retries reached`);
        return null; // Stop retrying after 10 attempts
      }
      const delay = Math.min(times * 1000, 10000); // Max 10 second delay
      logger.info(`Redis ${type} client retry attempt ${times} with delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 20000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    connectionName: `bull-${type}`,
    reconnectOnError: (err) => {
      logger.error(`Redis ${type} client error:`, err);
      return true; // Always try to reconnect
    },
    keepAlive: 10000, // Send keepalive every 10 seconds
    family: 4, // Force IPv4
    db: 0,
    showFriendlyErrorStack: true
  };

  // Add TLS configuration only if REDIS_TLS_ENABLED is true
  if (process.env.REDIS_TLS_ENABLED === 'true') {
    baseConfig.tls = {
      rejectUnauthorized: false,
      servername: process.env.REDIS_HOST,
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!SSLv2:!SSLv3:!TLSv1'
    };
  }

  // Special configuration for subscriber and bclient
  if (type === 'subscriber' || type === 'bclient') {
    return new Redis({
      ...baseConfig,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    });
  }

  // Configuration for other clients
  return new Redis({
    ...baseConfig,
    lazyConnect: true
  });
};

// Configure Bull queue options
const queueOptions = {
  createClient: (type) => {
    logger.info(`Creating Redis client for ${type}`);
    return createRedisClient(type);
  },
  settings: {
    lockDuration: 300000, // 5 minutes lock to match timeout
    stalledInterval: 60000, // Check for stalled jobs every 60 seconds
    maxStalledCount: 1,
    guardInterval: 5000,
    retryProcessDelay: 5000,
    drainDelay: 5,
    limiter: {
      max: 30, // Reduced to stay within free tier limits
      duration: 1000
    }
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 300000 // 5 minute timeout for jobs to match worker timeout
  }
};

// Create callback queue
const callbackQueue = new Bull('callback_payzutech', queueOptions);
logger.info("Callback queue created with proper Redis configuration");

// Create payin queue
const payinQueue = new Bull('payin_payzutech', queueOptions);
logger.info("Payin queue created with proper Redis configuration");

// Handle callback queue events
callbackQueue.on('error', (error) => {
  logger.error('Callback queue error:', error);
  // Attempt to recover from connection errors
  if (error.message.includes('Connection is closed')) {
    logger.info('Attempting to recover from connection error...');
    callbackQueue.resume();
  }
});

callbackQueue.on('ready', () => {
  logger.info('Callback queue is ready and connected to Redis');
});

callbackQueue.on('active', (job) => {
  logger.info('Callback job started processing', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

callbackQueue.on('completed', (job) => {
  logger.info('Callback job completed', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

callbackQueue.on('failed', (job, error) => {
  logger.error('Callback job failed', {
    jobId: job.id,
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

// Handle payin queue events
payinQueue.on('error', (error) => {
  logger.error('Payin queue error:', error);
  // Attempt to recover from connection errors
  if (error.message.includes('Connection is closed')) {
    logger.info('Attempting to recover from connection error...');
    payinQueue.resume();
  }
});

payinQueue.on('ready', () => {
  logger.info('Payin queue is ready and connected to Redis');
});

payinQueue.on('active', (job) => {
  logger.info('Payin job started processing', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

payinQueue.on('completed', (job) => {
  logger.info('Payin job completed', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

payinQueue.on('failed', (job, error) => {
  logger.error('Payin job failed', {
    jobId: job.id,
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

// Handle Redis connection events
const handleRedisEvents = (client, type) => {
  client.on('connect', () => {
    logger.info(`Redis ${type} client connected`);
  });

  client.on('ready', () => {
    logger.info(`Redis ${type} client ready`);
  });

  client.on('error', (err) => {
    logger.error(`Redis ${type} client error:`, err);
  });

  client.on('close', () => {
    logger.warn(`Redis ${type} client connection closed`);
  });

  client.on('reconnecting', () => {
    logger.info(`Redis ${type} client reconnecting`);
  });

  client.on('end', () => {
    logger.warn(`Redis ${type} client connection ended`);
  });
};

const philpayPayoutQueue = new Bull('philpayPayout', queueOptions);
logger.info("Philpay payout queue created with proper Redis configuration");

philpayPayoutQueue.on('error', (error) => {
  logger.error('Philpay payout queue error:', error);
  // Attempt to recover from connection errors
  if (error.message.includes('Connection is closed')) {
    logger.info('Attempting to recover from connection error...');
    philpayPayoutQueue.resume();
  }
});

philpayPayoutQueue.on('error', (error) => {
  logger.error('Philpay payout queue error:', error);
  // Attempt to recover from connection errors
  if (error.message.includes('Connection is closed')) {
    logger.info('Attempting to recover from connection error...');
    philpayPayoutQueue.resume();
  }
});

philpayPayoutQueue.on('ready', () => {
  logger.info('Philpay payout queue is ready and connected to Redis');
});

philpayPayoutQueue.on('active', (job) => {
  logger.info('Philpay payout job started processing', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

philpayPayoutQueue.on('completed', (job) => {
  logger.info('Philpay payout job completed', {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
});

philpayPayoutQueue.on('failed', (job, error) => {
  logger.error('Philpay payout job failed', {
    jobId: job.id,
    error: error.message,
    timestamp: new Date().toISOString()
  });
});



// Apply event handlers to all clients
handleRedisEvents(createRedisClient('client'), 'client');
handleRedisEvents(createRedisClient('subscriber'), 'subscriber');
handleRedisEvents(createRedisClient('bclient'), 'bclient');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down queues...');
  await callbackQueue.close();
  await payinQueue.close();
  await philpayPayoutQueue.close();
  process.exit(0);
});

module.exports = {
  callbackQueue,
  philpayPayoutQueue,
  payinQueue
}; 