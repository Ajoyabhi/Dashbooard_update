const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { processPayin } = require('../services/payment.service');
const { callbackQueue } = require('../config/queue.config');
const { PayinTransaction } = require('../models/payinTransaction.model');
const { UserTransaction } = require('../models/userTransaction.model');

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

/**
 * Set validation result in request
 * @param {Object} req - Express request object
 * @param {Object} result - Validation result
 */
const setValidationResult = (req, result) => {
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
    const validationResult = validatePaymentRequest(req);
    setValidationResult(req, validationResult);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request', 
        errors: validationResult.errors 
      });
    }

    const { account_number, account_ifsc, bank_name, beneficiary_name, request_type, amount, reference_id } = req.body;
    const user_id = req.user.id;
    const clientIp = getClientIp(req);
    const transaction_id = uuidv4();

    // Process payin directly
    const result = await processPayin({
      user_id,
      transaction_id,
      amount,
      account_number,
      account_ifsc,
      bank_name,
      beneficiary_name,
      reference_id,
      clientIp
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      transaction_id,
      result
    });

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
    logger.info('Received Unpay callback', { body: req.body });

    // Add callback to queue
    const job = await callbackQueue.add(req.body, {
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
      body: req.body
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

    // Find transaction
    const transaction = await PayinTransaction.findOne({
      transaction_id,
      'user.id': user_id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      transaction: {
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        status: transaction.status,
        reference_id: transaction.reference_id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        gateway_response: transaction.gateway_response
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

module.exports = {
  initiatePayment,
  handleUnpayCallback,
  getTransactionStatus
}; 