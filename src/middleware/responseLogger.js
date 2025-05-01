const { logger } = require('../utils/logger');

// Middleware to capture response body
const captureResponseBody = (req, res, next) => {
  const oldSend = res.send;
  res.send = function (data) {
    res.send = oldSend;
    const result = res.send.call(this, data);
    res.responseBody = data;
    return result;
  };
  next();
};

// Middleware to measure processing time
const measureProcessingTime = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    logger.info('Request processed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
  });

  next();
};

// Middleware to log API requests
const logApiRequest = (req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip
  });
  next();
};

module.exports = {
  captureResponseBody,
  measureProcessingTime,
  logApiRequest
}; 