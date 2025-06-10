const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { processPayin } = require('../services/payment.service');
const { callbackQueue } = require('../config/queue.config');
const PayinTransaction = require('../models/payinTransaction.model');
const { UserTransaction } = require('../models/userTransaction.model');
const { MerchantDetails } = require('../models');
const { encryptText } = require('../merchant_payin_payout/utils_payout');

/**
 * Get client IP address
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
};

/**
 * Validate payment request
 * @param {Object} req - Express request object
 * @returns {Object} - Validation result
 */
const validatePaymentRequest = (req) => {
  const errors = [];
  const { account_number, account_ifsc, bank_name, beneficiary_name, amount, reference_id } = req.body;

  if (!account_number) errors.push('Account number is required');
  if (!account_ifsc) errors.push('IFSC code is required');
  if (!bank_name) errors.push('Bank name is required');
  if (!beneficiary_name) errors.push('Beneficiary name is required');
  if (!amount) errors.push('Amount is required');
  if (!reference_id) errors.push('Reference ID is required');

  return {
    isValid: errors.length === 0,
    errors
  };
};


const validatePaymentRequestpayin = (req) => {
  const errors = [];
  const {name, order_amount, email, phone, reference_id } = req.body;

  if (!name) errors.push('Name is required');
  if (!order_amount) errors.push('Order amount is required');
  if (!email) errors.push('Email is required');
  if (!phone) errors.push('Phone is required');
  if (!reference_id) errors.push('Order ID is required');

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Set validation result in request
 * @param {Object} req - Express request object
 * @param {Object} result - Validation result
 */
const setValidationResult = (req, result) => {
  req.validationResult = result;
};

const setValidationResultpayin = (req, result) => {
  req.validationResult = result;
};
/**
 * Initiate a payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initiatePayment = async (req, res) => {
  try {
    // Validate request
    const validationResult = validatePaymentRequestpayin(req);
    setValidationResultpayin(req, validationResult);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request', 
        errors: validationResult.errors 
      });
    }

    const {name, order_amount, email, phone, reference_id} = req.body;
    const user_id = req.user.id;
    const clientIp = getClientIp(req);
    const transaction_id = uuidv4();

    // Process payin directly
    const result = await processPayin({
      user_id,
      transaction_id,
      name,
      order_amount,
      email,
      phone,
      reference_id,
      clientIp
    });

    // Send response
    if(result.success){ 
      res.status(200).json({
        transaction_id,
        result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    logger.error('Error processing payment', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error processing payment'
    });
  }
};

/**
 * Handle Unpay payment callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleUnpayCallback = async (req, res) => {
  try {
    // Get callback data from either query params (GET) or body (POST)
    const callbackData = req.method === 'GET' ? req.query : req.body;
    
    logger.info('Received Unpay callback', { 
      method: req.method,
      data: callbackData 
    });

    // Validate required parameters
    const requiredParams = ['statuscode', 'status', 'amount', 'apitxnid', 'txnid', 'utr'];
    const missingParams = requiredParams.filter(param => !callbackData[param]);
    
    if (missingParams.length > 0) {
      logger.error('Missing required parameters in callback', { missingParams });
      return res.status(400).json({ 
        success: false, 
        message: `Missing required parameters: ${missingParams.join(', ')}`
      });
    }

    // Add callback to queue
    const job = await callbackQueue.add(callbackData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    // Send immediate response
    res.json({ 
      success: true, 
      message: 'Callback queued for processing',
      job_id: job.id
    });

  } catch (error) {
    logger.error('Error queuing Unpay callback', {
      error: error.message,
      stack: error.stack,
      data: req.method === 'GET' ? req.query : req.body
    });
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
};

/**
 * Get transaction status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactionStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const user_id = req.user.id;
    const searchTransactionId = String(transaction_id).trim();
    if (!searchTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }
    const transaction = await PayinTransaction.findOne({
      reference_id: searchTransactionId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get merchant details
    const merchantDetails = await MerchantDetails.findOne({ where: { user_id } });
    if (!merchantDetails) {
      return res.status(404).json({
        success: false,
        message: 'Merchant details not found'
      });
    }
    const requestBody = {
      partner_id: "1809", // Get this from merchant details or config
      apitxnid: searchTransactionId
    };
    const aesKey = "brTaJLaVgWvshn3zHM4qt0lI1DqjFeUz";
    const aesIV = "uBiWATDOnfTvhfJO";
    const apiKey = "Tn3ybTJGKaDMhhj9jl89aULGf9OI0S8ZPkq0GD42";
    const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);

    // Make API request to Unpay
    const response = await fetch('https://unpay.in/tech/api/next/upi/request/qrstatus', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey, // Get from config
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        body: encryptedRequestBody
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Unpay API error: ${result.message || 'Unknown error'}`);
    }

    res.status(200).json({
      success: true,
      transaction: {
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        status: result.data?.txnStatus || transaction.status,
        reference_id: transaction.reference_id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        gateway_response: result
      }
    });

  } catch (error) {
    logger.error('Error getting transaction status', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error getting transaction status'
    });
  }
};

const handleSpayCallback = async (req, res) => {
  try {
    // Get callback data from either query params (GET) or body (POST)
    const callbackData = req.method === 'GET' ? req.query : req.body;
    
    logger.info('Received SPay callback', { 
      method: req.method,
      data: callbackData 
    });

    // Map SPay callback data to expected format
    const mappedData = {
      statuscode: callbackData.status,
      utr: callbackData.UTR,
      amount: callbackData.amount,
      apitxnid: callbackData.clienttxnid,
      txnid: callbackData.txnid,
      timestamp: callbackData.timestamp
    };

    // Validate required parameters
    const requiredParams = ['statuscode', 'apitxnid', 'amount', 'utr'];
    const missingParams = requiredParams.filter(param => !mappedData[param]);
    
    if (missingParams.length > 0) {
      logger.error('Missing required parameters in callback', { missingParams });
      return res.status(400).json({ 
        success: false, 
        message: `Missing required parameters: ${missingParams.join(', ')}`
      });
    }

    // Add callback to queue
    const job = await callbackQueue.add({
      ...mappedData,
      provider: 'SPAY' // Add provider identifier
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    // Send immediate response
    res.json({ 
      success: true, 
      message: 'Callback queued for processing',
      job_id: job.id
    });

  } catch (error) {
    logger.error('Error queuing SPay callback', {
      error: error.message,
      stack: error.stack,
      data: req.method === 'GET' ? req.query : req.body
    });
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
};

module.exports = {
  initiatePayment,
  handleUnpayCallback,
  getTransactionStatus,
  validatePaymentRequest,
  setValidationResult,
  validatePaymentRequestpayin,
  handleSpayCallback
}; 