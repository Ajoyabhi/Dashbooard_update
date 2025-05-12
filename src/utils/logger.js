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
    // File transport for all logs
    new winston.transports.File({
      filename: path.join('src/logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join('src/logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
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

// Log unhandled exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join('src/logs', 'exceptions.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join('src/logs', 'rejections.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
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