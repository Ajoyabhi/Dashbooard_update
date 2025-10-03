const Redis = require('ioredis');

// Create Redis client for caching with proper authentication
// Use environment variables directly like queue.config.js
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined, // Only set if password exists
    retryStrategy: (times) => {
        if (times > 10) {
            console.error('Cache Redis client max retries reached');
            return null;
        }
        const delay = Math.min(times * 1000, 10000);
        console.log(`Cache Redis client retry attempt ${times} with delay ${delay}ms`);
        return delay;
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 20000,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    connectionName: 'cache-client',
    reconnectOnError: (err) => {
        console.error('Cache Redis client error:', err);
        return true;
    },
    keepAlive: 10000,
    family: 4,
    db: 0,
    showFriendlyErrorStack: true,
    ...(process.env.REDIS_TLS_ENABLED === 'true' && {
        tls: {
            rejectUnauthorized: false,
            servername: process.env.REDIS_HOST || 'localhost',
            minVersion: 'TLSv1.2',
            ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!SSLv2:!SSLv3:!TLSv1'
        }
    })
});

// Handle Redis connection events
redis.on('connect', () => {
    console.log('Cache Redis client connected successfully');
});

redis.on('ready', () => {
    console.log('Cache Redis client ready');
});

redis.on('error', (err) => {
    console.error('Cache Redis client error:', err.message);
});

redis.on('reconnecting', () => {
    console.log('Cache Redis client reconnecting...');
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

            // Try to get cached response
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                console.log(`Cache HIT for key: ${cacheKey}`);
                const parsedData = JSON.parse(cachedData);

                // Set cache headers
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Key', cacheKey);

                return res.json(parsedData);
            }

            console.log(`Cache MISS for key: ${cacheKey}`);

            // Store original res.json function
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response
            res.json = function (data) {
                // Cache the response data
                redis.setex(cacheKey, ttl, JSON.stringify(data))
                    .then(() => {
                        console.log(`Cached data for key: ${cacheKey} with TTL: ${ttl}s`);
                    })
                    .catch((err) => {
                        console.error(`Error caching data for key ${cacheKey}:`, err);
                    });

                // Set cache headers
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('X-Cache-Key', cacheKey);

                // Call original json function
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
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
                console.log(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
            } else {
                console.log(`No cache keys found matching pattern: ${pattern}`);
            }
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
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
        console.log(`Cleared cache key: ${key}, result: ${result}`);
        return result;
    } catch (error) {
        console.error(`Error clearing cache key ${key}:`, error);
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
        console.error('Error getting cache stats:', error);
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

