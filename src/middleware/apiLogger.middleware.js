const morgan = require('morgan');
const { logger, maskSensitiveData } = require('../utils/logger');
const ApiLog = require('../models/apiLog.model');

// Create a custom token for request body
morgan.token('body', (req) => {
  return JSON.stringify(maskSensitiveData(req.body));
});

// Create a custom token for response body
morgan.token('response-body', (req, res) => {
  if (res._responseBody) {
    return JSON.stringify(maskSensitiveData(res._responseBody));
  }
  return '';
});

// Create a custom token for processing time
morgan.token('processing-time', (req, res) => {
  if (res._processingTime) {
    return `${res._processingTime}ms`;
  }
  return '';
});

// Create a custom token for user ID
morgan.token('user-id', (req) => {
  if (req.user) {
    return req.user._id;
  }
  return '';
});

// Create a custom token for user model
morgan.token('user-model', (req) => {
  if (req.user) {
    return req.user.userType === 'user' ? 'User' : 
           req.user.userType === 'agent' ? 'Agent' : 'Admin';
  }
  return '';
});

// Create a custom token for validation result
morgan.token('validation-result', (req) => {
  if (req._validationResult) {
    return JSON.stringify(req._validationResult);
  }
  return '';
});

// Create a custom token for third-party API info
morgan.token('third-party-api', (req) => {
  if (req._thirdPartyApi) {
    return JSON.stringify(req._thirdPartyApi);
  }
  return '';
});

// Create a custom format for Morgan
const morganFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :processing-time';

// Create a custom stream for Morgan
const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Create the Morgan middleware
const morganMiddleware = morgan(morganFormat, { stream: morganStream });

// Middleware to log API requests
const logApiRequest = (req, res, next) => {
    const start = Date.now();
    
    // Log request details
    logger.info('API Request:', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    });

    // Log request body for non-GET requests
    if (req.method !== 'GET' && req.body) {
        logger.debug('Request Body:', {
            url: req.originalUrl,
            body: req.body
        });
    }

    // Capture response
    const originalSend = res.send;
    res.send = function (body) {
        const responseTime = Date.now() - start;
        
        // Log response
        logger.info('API Response:', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
        });

        // Log response body for errors
        if (res.statusCode >= 400) {
            logger.error('Error Response:', {
                url: req.originalUrl,
                statusCode: res.statusCode,
                body: body
            });
        }

        return originalSend.call(this, body);
    };

    next();
};

// Middleware to measure processing time
const measureProcessingTime = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug('Request Processing Time:', {
            method: req.method,
            url: req.originalUrl,
            duration: `${duration}ms`
        });
    });
    next();
};

// Middleware to capture response body
const captureResponseBody = (req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        if (res.statusCode >= 400) {
            logger.debug('Response Body:', {
                url: req.originalUrl,
                statusCode: res.statusCode,
                body: body
            });
        }
        return originalSend.call(this, body);
    };
    next();
};

// Helper function to set validation result
const setValidationResult = (req, validationResult) => {
  req._validationResult = validationResult;
};

// Helper function to set third-party API info
const setThirdPartyApiInfo = (req, apiInfo) => {
  req._thirdPartyApi = apiInfo;
};

module.exports = {
  morganMiddleware,
  captureResponseBody,
  measureProcessingTime,
  logApiRequest,
  setValidationResult,
  setThirdPartyApiInfo
}; 