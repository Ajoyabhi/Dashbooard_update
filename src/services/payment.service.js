const axios = require('axios');
const { logger } = require('../utils/logger');
const Transaction = require('../models/transaction.model');

// Dummy merchant API configuration
const dummyMerchantConfig = {
  baseUrl: process.env.DUMMY_MERCHANT_URL || 'http://127.0.0.1:5001', // Using IPv4 localhost
};

logger.info('Initializing payment service with dummy merchant config:', dummyMerchantConfig);

// Dummy merchant client with explicit IPv4 configuration
const dummyMerchantClient = axios.create({
  baseURL: dummyMerchantConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 5000, // 5 second timeout
  family: 4, // Force IPv4
  localAddress: '127.0.0.1', // Force local address
  proxy: false, // Disable proxy
  maxRedirects: 0, // Disable redirects
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Only accept 2xx status codes
  }
});

/**
 * Process a payment via the dummy merchant API
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Payment result
 */
const processPayment = async (paymentData) => {
  try {
    logger.info('Processing payment', { 
      transaction_id: paymentData.transaction_id,
      amount: paymentData.amount,
      currency: paymentData.currency
    });

    // Log the API request
    logger.info('Making API call to dummy merchant', {
      url: `${dummyMerchantConfig.baseUrl}/dummy-payment`,
      method: 'POST',
      data: {
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD'
      }
    });

    // Call the dummy merchant API
    const response = await dummyMerchantClient.post('/dummy-payment', {
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD'
    });

    logger.info('Dummy merchant response received', {
      transaction_id: paymentData.transaction_id,
      response: response.data
    });

    return {
      success: true,
      transaction_id: paymentData.transaction_id,
      response: response.data
    };
  } catch (error) {
    logger.error('Error processing payment', {
      transaction_id: paymentData.transaction_id,
      error: error.message,
      stack: error.stack,
      response: error.response ? error.response.data : null,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data
      } : null
    });
    throw error;
  }
};



module.exports = {
  processPayment,
}; 