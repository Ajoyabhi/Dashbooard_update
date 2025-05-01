const Redis = require('ioredis');
const { ApiError } = require('./errorHandler');
const config = require('../config');

const redis = new Redis(config.redis.url);

const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    keyPrefix = 'rate-limit:',
    message = 'Too many requests, please try again later.'
  } = options;

  return async (req, res, next) => {
    try {
      const key = `${keyPrefix}${req.ip}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      if (current > max) {
        throw new ApiError(429, message);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = rateLimiter; 