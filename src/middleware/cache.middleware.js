const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Create Redis client for caching with optimized configuration
// IMPORTANT: This uses a SEPARATE connection from Bull queue clients (connectionName: 'cache-client')
// Cache operations are non-critical and have shorter timeouts to avoid interfering with callback processing
// Use lazyConnect to avoid blocking on startup
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined, // Only set if password exists
    retryStrategy: (times) => {
        if (times > 10) {
            logger.error('Cache Redis client max retries reached');
            return null;
        }
        const delay = Math.min(times * 1000, 10000);
        logger.debug(`Cache Redis client retry attempt ${times} with delay ${delay}ms`);
        return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 10000, // 10s for cache (faster failure detection for non-critical ops)
    commandTimeout: 5000, // 5s timeout for commands (shorter than queue for fast cache lookups)
    enableOfflineQueue: true,
    enableReadyCheck: true,
    lazyConnect: true, // Connect on-demand instead of immediately
    connectionName: 'cache-client', // Separate connection from queue clients
    reconnectOnError: (err) => {
        logger.error('Cache Redis client error:', err);
        return true;
    },
    keepAlive: 10000,
    family: 4,
    db: 0,
    showFriendlyErrorStack: true,
    // Performance optimizations
    enableAutoPipelining: true, // Automatically pipeline commands
    maxLoadingTimeout: 5000, // Max time to wait for loading
    ...(process.env.REDIS_TLS_ENABLED === 'true' && {
        tls: {
            rejectUnauthorized: false,
            servername: process.env.REDIS_HOST || 'localhost',
            minVersion: 'TLSv1.2',
            ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!SSLv2:!SSLv3:!TLSv1'
        }
    })
});

// Handle Redis connection events (non-blocking)
redis.on('connect', () => {
    logger.debug('Cache Redis client connected successfully');
});

redis.on('ready', () => {
    logger.debug('Cache Redis client ready');
});

redis.on('error', (err) => {
    logger.error('Cache Redis client error:', err.message);
});

redis.on('reconnecting', () => {
    logger.debug('Cache Redis client reconnecting...');
});

/**
 * Cache middleware for API responses
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {string} options.keyPrefix - Prefix for cache keys
 * @param {Function} options.generateKey - Custom function to generate cache key from request
 */
const cacheMiddleware = (options = {}) => {
    const {
        ttl = 300, // 5 minutes default
        keyPrefix = 'cache:',
        generateKey = (req) => {
            // Default key generation: route + query params
            const baseKey = req.originalUrl || req.url;
            return `${keyPrefix}${baseKey}`;
        }
    } = options;

    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        try {
            const cacheKey = generateKey(req);
            const startTime = Date.now();

            // Try to get cached response with timeout
            // If Redis is not connected, the get() will trigger lazy connect
            const cachedData = await Promise.race([
                redis.get(cacheKey).catch((err) => {
                    // If connection fails, return null to continue without cache
                    if (err.message && err.message.includes('Connection')) {
                        logger.debug(`Cache Redis connection issue for key ${cacheKey}`);
                    }
                    return null;
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Cache timeout')), 1000)
                )
            ]).catch((err) => {
                // If cache lookup fails or times out, continue without cache
                if (err.message !== 'Cache timeout') {
                    logger.debug(`Cache lookup failed for key ${cacheKey}:`, err.message);
                }
                return null;
            });

            if (cachedData) {
                const cacheTime = Date.now() - startTime;
                logger.debug(`Cache HIT for key: ${cacheKey} (${cacheTime}ms)`);
                
                // Parse JSON asynchronously to avoid blocking
                let parsedData;
                try {
                    parsedData = JSON.parse(cachedData);
                } catch (parseError) {
                    logger.error(`Cache parse error for key ${cacheKey}:`, parseError);
                    // If parse fails, continue without cache
                    return next();
                }

                // Set cache headers
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Key', cacheKey);
                res.setHeader('X-Cache-Time', `${cacheTime}ms`);

                return res.json(parsedData);
            }

            const cacheTime = Date.now() - startTime;
            logger.debug(`Cache MISS for key: ${cacheKey} (lookup: ${cacheTime}ms)`);

            // Store original res.json function
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response (non-blocking)
            res.json = function (data) {
                // Cache the response data asynchronously (don't wait for it)
                // Use setImmediate to avoid blocking the response
                setImmediate(() => {
                    try {
                        const jsonString = JSON.stringify(data);
                        redis.setex(cacheKey, ttl, jsonString)
                            .then(() => {
                                logger.debug(`Cached data for key: ${cacheKey} with TTL: ${ttl}s`);
                            })
                            .catch((err) => {
                                logger.error(`Error caching data for key ${cacheKey}:`, err.message);
                            });
                    } catch (stringifyError) {
                        logger.error(`Error stringifying data for cache key ${cacheKey}:`, stringifyError.message);
                    }
                });

                // Set cache headers
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('X-Cache-Key', cacheKey);

                // Call original json function
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error.message);
            // If cache fails, continue without caching
            next();
        }
    };
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Pattern to match keys (e.g., 'cache:*')
 */
const clearCache = async (pattern = 'cache:*') => {
    try {
        const stream = redis.scanStream({
            match: pattern,
            count: 100
        });

        const keys = [];

        stream.on('data', (resultKeys) => {
            keys.push(...resultKeys);
        });

        stream.on('end', async () => {
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
            } else {
                logger.debug(`No cache keys found matching pattern: ${pattern}`);
            }
        });
    } catch (error) {
        logger.error('Error clearing cache:', error);
        throw error;
    }
};

/**
 * Clear specific cache key
 * @param {string} key - Cache key to clear
 */
const clearCacheKey = async (key) => {
    try {
        const result = await redis.del(key);
        logger.debug(`Cleared cache key: ${key}, result: ${result}`);
        return result;
    } catch (error) {
        logger.error(`Error clearing cache key ${key}:`, error);
        throw error;
    }
};

/**
 * Get cache statistics
 */
const getCacheStats = async () => {
    try {
        const info = await redis.info('stats');
        const keys = await redis.dbsize();

        return {
            totalKeys: keys,
            info: info
        };
    } catch (error) {
        logger.error('Error getting cache stats:', error);
        throw error;
    }
};

module.exports = {
    cacheMiddleware,
    clearCache,
    clearCacheKey,
    getCacheStats,
    redis
};

