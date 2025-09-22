const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Filter out verbose SQL queries
const filterSqlQueries = winston.format((info) => {
  if (info.sql) {
    return false; // Don't log SQL queries
  }
  return info;
})();

// Custom MongoDB transport
class MongoDBTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
    this.name = 'mongodb';
    this.level = options.level || 'info';
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Lazy load the model to avoid connection issues
    try {
      const Apilogs = require('../models/apiLogs.model');

      // Extract all data from the log info
      const { level, message, timestamp, service, ...rest } = info;

      // Save to MongoDB with all data
      const logData = {
        level: level,
        message: message,
        timestamp: timestamp || new Date(),
        service: service || 'accuzpay-api',
        metadata: {
          ...rest,
          ...(info.metadata || {})
        }
      };

      Apilogs.create(logData).catch(err => {
        console.error('Failed to save log to MongoDB:', err);
      });
    } catch (err) {
      console.error('Failed to load Apilogs model:', err);
    }

    callback();
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterSqlQueries,
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // MongoDB transport
    new MongoDBTransport({
      level: process.env.LOG_LEVEL || 'info'
    })
  ]
});

// Create a stream object for Morgan
const stream = {
  write: (message) => {
    // Don't log SQL queries
    if (!message.includes('SELECT') && !message.includes('INSERT') && !message.includes('UPDATE') && !message.includes('DELETE')) {
      logger.info(message.trim());
    }
  }
};

// Log unhandled exceptions and rejections to MongoDB
logger.exceptions.handle(
  new MongoDBTransport({
    level: 'error'
  })
);

logger.rejections.handle(
  new MongoDBTransport({
    level: 'error'
  })
);

// Helper function to mask sensitive data
const maskSensitiveData = (data) => {
  if (!data) return data;

  const maskedData = { ...data };

  // Mask password fields
  if (maskedData.password) {
    maskedData.password = '********';
  }

  // Mask credit card numbers
  if (maskedData.card_number) {
    maskedData.card_number = maskedData.card_number.replace(/\d(?=\d{4})/g, '*');
  }

  // Mask CVV
  if (maskedData.cvv) {
    maskedData.cvv = '***';
  }

  // Mask API keys
  if (maskedData.api_key) {
    maskedData.api_key = '********';
  }

  // Mask JWT tokens
  if (maskedData.token) {
    maskedData.token = '********';
  }

  return maskedData;
};

module.exports = {
  logger,
  stream,
  maskSensitiveData
}; 