const Redis = require('ioredis');
const { logger } = require('../utils/logger');
require('dotenv').config();

// Create Redis client
const createRedisClient = () => {
  const port = parseInt(process.env.REDIS_PORT);
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid Redis port: ${process.env.REDIS_PORT}`);
  }

  const baseConfig = {
    host: process.env.REDIS_HOST,
    port: port,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis client max retries reached`);
        return null;
      }
      const delay = Math.min(times * 1000, 10000);
      logger.info(`Redis client retry attempt ${times} with delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 20000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    connectionName: `queue-inspector`,
    reconnectOnError: (err) => {
      logger.error(`Redis client error:`, err);
      return true;
    },
    keepAlive: 10000,
    family: 4,
    db: 0,
    showFriendlyErrorStack: true
  };

  if (process.env.REDIS_TLS_ENABLED === 'true') {
    baseConfig.tls = {
      rejectUnauthorized: false,
      servername: process.env.REDIS_HOST,
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!SSLv2:!SSLv3:!TLSv1'
    };
  }

  return new Redis({
    ...baseConfig,
    lazyConnect: true
  });
};

async function listAllQueues() {
  const redis = createRedisClient();
  
  try {
    await redis.connect();
    logger.info('Connected to Redis');

    // Get all keys that match Bull queue patterns
    const allKeys = await redis.keys('*');
    logger.info(`Found ${allKeys.length} total keys in Redis`);

    // Filter for Bull queue keys
    const queueKeys = allKeys.filter(key => 
      key.includes('bull:') || 
      key.includes('_bull:') ||
      key.includes('bull_') ||
      key.includes('queue:') ||
      key.includes('job:') ||
      key.includes('lock:') ||
      key.includes('stalled:') ||
      key.includes('delayed:') ||
      key.includes('wait:') ||
      key.includes('active:') ||
      key.includes('completed:') ||
      key.includes('failed:')
    );

    logger.info(`Found ${queueKeys.length} queue-related keys`);

    // Group keys by queue name
    const queueGroups = {};
    
    queueKeys.forEach(key => {
      // Extract queue name from key
      let queueName = '';
      
      if (key.includes('bull:')) {
        // Pattern: bull:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('_bull:')) {
        // Pattern: queueName_bull:*
        const parts = key.split('_bull:');
        if (parts.length >= 1) {
          queueName = parts[0];
        }
      } else if (key.includes('bull_')) {
        // Pattern: bull_queueName:*
        const parts = key.split('bull_');
        if (parts.length >= 2) {
          const subParts = parts[1].split(':');
          queueName = subParts[0];
        }
      } else if (key.includes('queue:')) {
        // Pattern: queue:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('job:')) {
        // Pattern: job:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('lock:')) {
        // Pattern: lock:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('stalled:')) {
        // Pattern: stalled:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('delayed:')) {
        // Pattern: delayed:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('wait:')) {
        // Pattern: wait:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('active:')) {
        // Pattern: active:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('completed:')) {
        // Pattern: completed:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      } else if (key.includes('failed:')) {
        // Pattern: failed:queueName:*
        const parts = key.split(':');
        if (parts.length >= 2) {
          queueName = parts[1];
        }
      }

      if (queueName) {
        if (!queueGroups[queueName]) {
          queueGroups[queueName] = [];
        }
        queueGroups[queueName].push(key);
      }
    });

    console.log('\n=== ALL QUEUES IN REDIS ===');
    console.log(`Total queue-related keys: ${queueKeys.length}`);
    console.log(`Unique queues found: ${Object.keys(queueGroups).length}`);
    console.log('');

    // Display each queue with its details
    for (const [queueName, keys] of Object.entries(queueGroups)) {
      console.log(`\n📋 Queue: ${queueName}`);
      console.log(`   Keys: ${keys.length}`);
      
      // Count different types of keys
      const keyTypes = {
        jobs: keys.filter(k => k.includes('job:')).length,
        locks: keys.filter(k => k.includes('lock:')).length,
        stalled: keys.filter(k => k.includes('stalled:')).length,
        delayed: keys.filter(k => k.includes('delayed:')).length,
        wait: keys.filter(k => k.includes('wait:')).length,
        active: keys.filter(k => k.includes('active:')).length,
        completed: keys.filter(k => k.includes('completed:')).length,
        failed: keys.filter(k => k.includes('failed:')).length,
        meta: keys.filter(k => k.includes('meta:')).length,
        others: keys.filter(k => !k.includes('job:') && !k.includes('lock:') && !k.includes('stalled:') && !k.includes('delayed:') && !k.includes('wait:') && !k.includes('active:') && !k.includes('completed:') && !k.includes('failed:') && !k.includes('meta:')).length
      };

      console.log(`   Job keys: ${keyTypes.jobs}`);
      console.log(`   Lock keys: ${keyTypes.locks}`);
      console.log(`   Stalled keys: ${keyTypes.stalled}`);
      console.log(`   Delayed keys: ${keyTypes.delayed}`);
      console.log(`   Wait keys: ${keyTypes.wait}`);
      console.log(`   Active keys: ${keyTypes.active}`);
      console.log(`   Completed keys: ${keyTypes.completed}`);
      console.log(`   Failed keys: ${keyTypes.failed}`);
      console.log(`   Meta keys: ${keyTypes.meta}`);
      console.log(`   Other keys: ${keyTypes.others}`);

      // Show sample keys (first 5)
      if (keys.length > 0) {
        console.log(`   Sample keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
    }

    // Show summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total unique queues: ${Object.keys(queueGroups).length}`);
    console.log('Queue names:');
    Object.keys(queueGroups).forEach((queueName, index) => {
      console.log(`  ${index + 1}. ${queueName}`);
    });

    // Show non-queue keys
    const nonQueueKeys = allKeys.filter(key => !queueKeys.includes(key));
    if (nonQueueKeys.length > 0) {
      console.log(`\nNon-queue keys: ${nonQueueKeys.length}`);
      console.log('Sample non-queue keys:');
      nonQueueKeys.slice(0, 10).forEach(key => {
        console.log(`  - ${key}`);
      });
      if (nonQueueKeys.length > 10) {
        console.log(`  ... and ${nonQueueKeys.length - 10} more`);
      }
    }

  } catch (error) {
    logger.error('Error listing queues:', error);
    console.error('Error:', error.message);
  } finally {
    await redis.disconnect();
    process.exit(0);
  }
}

// Run the script
listAllQueues();
