const Bull = require('bull');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');
require('dotenv').config();

// Create Redis client
const createRedisClient = (type) => {
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
                logger.error(`Redis ${type} client max retries reached`);
                return null;
            }
            const delay = Math.min(times * 1000, 10000);
            logger.info(`Redis ${type} client retry attempt ${times} with delay ${delay}ms`);
            return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 20000,
        enableOfflineQueue: true,
        enableReadyCheck: true,
        connectionName: `check-${type}`,
        reconnectOnError: (err) => {
            logger.error(`Redis ${type} client error:`, err);
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

    if (type === 'subscriber' || type === 'bclient') {
        return new Redis({
            ...baseConfig,
            enableReadyCheck: false,
            maxRetriesPerRequest: null
        });
    }

    return new Redis({
        ...baseConfig,
        lazyConnect: true
    });
};

const queueOptions = {
    createClient: (type) => {
        logger.info(`Creating Redis client for ${type}`);
        return createRedisClient(type);
    }
};

async function checkQueues() {
    try {
        logger.info('Checking queue status...');

        // Create both queues
        const oldQueue = new Bull('callback', queueOptions);
        const newQueue = new Bull('callback_accuzpay', queueOptions);

        // Wait for queues to be ready
        await oldQueue.isReady();
        await newQueue.isReady();

        logger.info('Queues are ready');

        // Check old queue
        const oldWaitingJobs = await oldQueue.getWaiting();
        const oldActiveJobs = await oldQueue.getActive();
        const oldDelayedJobs = await oldQueue.getDelayed();
        const oldFailedJobs = await oldQueue.getFailed();
        const oldCompletedJobs = await oldQueue.getCompleted();

        console.log('\n=== OLD QUEUE (callback) STATUS ===');
        console.log({
            waiting: oldWaitingJobs.length,
            active: oldActiveJobs.length,
            delayed: oldDelayedJobs.length,
            failed: oldFailedJobs.length,
            completed: oldCompletedJobs.length
        });

        // Check new queue
        const newWaitingJobs = await newQueue.getWaiting();
        const newActiveJobs = await newQueue.getActive();
        const newDelayedJobs = await newQueue.getDelayed();
        const newFailedJobs = await newQueue.getFailed();
        const newCompletedJobs = await newQueue.getCompleted();

        console.log('\n=== NEW QUEUE (callback_accuzpay) STATUS ===');
        console.log({
            waiting: newWaitingJobs.length,
            active: newActiveJobs.length,
            delayed: newDelayedJobs.length,
            failed: newFailedJobs.length,
            completed: newCompletedJobs.length
        });

        // Show details of failed jobs in new queue
        if (newFailedJobs.length > 0) {
            console.log('\n=== FAILED JOBS IN NEW QUEUE ===');
            for (const job of newFailedJobs.slice(0, 5)) { // Show first 5
                console.log(`\nJob ID: ${job.id}`);
                console.log('Data:', JSON.stringify(job.data, null, 2));
                console.log('Attempts:', job.attemptsMade);
                console.log('Failed Reason:', job.failedReason);
                console.log('Failed At:', new Date(job.finishedOn).toLocaleString());
                console.log('----------------------------------------');
            }
        }

        // Show details of waiting jobs in new queue
        if (newWaitingJobs.length > 0) {
            console.log('\n=== WAITING JOBS IN NEW QUEUE ===');
            for (const job of newWaitingJobs.slice(0, 5)) { // Show first 5
                console.log(`\nJob ID: ${job.id}`);
                console.log('Data:', JSON.stringify(job.data, null, 2));
                console.log('Created At:', new Date(job.timestamp).toLocaleString());
                console.log('----------------------------------------');
            }
        }

        // Show details of waiting jobs in old queue
        if (oldWaitingJobs.length > 0) {
            console.log('\n=== WAITING JOBS IN OLD QUEUE ===');
            for (const job of oldWaitingJobs.slice(0, 5)) { // Show first 5
                console.log(`\nJob ID: ${job.id}`);
                console.log('Data:', JSON.stringify(job.data, null, 2));
                console.log('Created At:', new Date(job.timestamp).toLocaleString());
                console.log('----------------------------------------');
            }
        }

    } catch (error) {
        logger.error('Error checking queues:', error);
    } finally {
        // Close connections
        process.exit(0);
    }
}

// Run check
checkQueues();
