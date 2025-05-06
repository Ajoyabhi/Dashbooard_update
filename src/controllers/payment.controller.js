const { v4: uuidv4 } = require('uuid');
const { payinQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const { setValidationResult } = require('../middleware/apiLogger.middleware');
const getClientIp = require('../utils/getClientIp');

/**
 * Validate payment request
 * @param {Object} req - Express request object
 * @returns {Object} - Validation result
 */
const validatePaymentRequest = (req) => {
  const errors = [];
  const { account_number, account_ifsc, bank_name, beneficiary_name, request_type, amount, reference_id } = req.body;

  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    errors.push('Amount must be a positive number');
  }
  // Validate recipient
  if (!account_number) {
    errors.push('Account number is required');
  }

  if (!bank_name || !account_ifsc || !beneficiary_name || !request_type || !reference_id) {
    errors.push('All fields are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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

    // Create job data
    const jobData = {
      user_id,
      transaction_id,
      amount,
      account_number,
      account_ifsc,
      bank_name,
      beneficiary_name,
      reference_id,
      clientIp
    };

    // Add job to queue
    const job = await payinQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    // Send immediate acknowledgement
    res.status(202).json({
      success: true,
      message: 'Payment task queued',
      transaction_id,
      job_id: job.id
    });

  } catch (error) {
    logger.error('Error queuing payment task', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error queuing payment task' 
    });
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

    const transaction = await PayinTransaction.findById(transaction_id);
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Check if user has access to this transaction
    const isAdmin = req.user.userType === 'admin';
    const isRecipient = transaction.user.id.toString() === req.user._id.toString();
    const isAgentOfRecipient = req.user.userType === 'agent' && 
                              transaction.user.model === 'User' &&
                              transaction.user.id.toString() === req.user._id.toString();

    if (!isAdmin && !isRecipient && !isAgentOfRecipient) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this transaction' 
      });
    }

    res.json({
      success: true,
      transaction: {
        transaction_id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
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

/**
 * Handle Unpay payment callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleUnpayCallback = async (req, res) => {
  try {
    logger.info('Received Unpay callback', { body: req.body });

    // Add callback to queue
    const job = await payinQueue.add('callback', req.body, {
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

module.exports = {
  initiatePayment,
  getTransactionStatus,
  validatePaymentRequest,
  handleUnpayCallback
}; 