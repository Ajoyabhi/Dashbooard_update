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

// Create a middleware to capture the response body
const captureResponseBody = (req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    res._responseBody = body;
    return originalSend.apply(res, arguments);
  };
  next();
};

// Create a middleware to measure processing time
const measureProcessingTime = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    res._processingTime = Math.round(time);
  });
  
  next();
};

// Create a middleware to log API requests to the database
const logApiRequest = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function to capture the response
  res.end = function(chunk, encoding) {
    // Restore the original end function
    res.end = originalEnd;
    
    // Call the original end function
    res.end(chunk, encoding);
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Skip logging for unauthenticated requests
    if (!req.user) {
      return;
    }
    
    // Create the log entry
    const logEntry = {
      timestamp: new Date(),
      method: req.method,
      endpoint: req.originalUrl,
      status_code: res.statusCode,
      user_id: req.user._id,
      user_model: req.user.userType === 'user' ? 'User' : 
                 req.user.userType === 'agent' ? 'Agent' : 'Admin',
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      request_headers: maskSensitiveData(req.headers),
      request_body: maskSensitiveData(req.body),
      response_body: res._responseBody ? maskSensitiveData(JSON.parse(res._responseBody)) : null,
      validation_result: req._validationResult || null,
      processing_time: processingTime,
      third_party_api: req._thirdPartyApi || null
    };
    
    // Save the log entry to the database
    try {
      const apiLog = new ApiLog(logEntry);
      apiLog.save().catch(err => {
        logger.error('Error saving API log to database', { error: err.message });
      });
    } catch (error) {
      logger.error('Error creating API log entry', { error: error.message });
    }
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