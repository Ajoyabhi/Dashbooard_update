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

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Create a stream object for Morgan
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

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