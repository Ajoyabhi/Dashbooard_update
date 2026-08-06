const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { processPayin } = require('../services/payment.service');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const { callbackQueue, bluswapPayoutQueue, mizorpayPayoutQueue, createRedisClient } = require('../config/queue.config');
const PayinTransaction = require('../models/payinTransaction.model');
const { extractFailureReason } = require('../utils/failureReason');
const { MerchantDetails } = require('../models');
// TEMP TESTING: pool of fake customer identities used by the test-beneficiary
// feature. Moved to its own module (src/data/testIdentities.js) to keep this
// controller lean. Remove both once testing is done.
const { TEST_IDENTITIES } = require('../data/testIdentities');

// TEMP TESTING: generate a legitimate-looking Indian mobile number (10 digits,
// starting with 6/7/8/9). Used only for the test-beneficiary feature.
const generateIndianMobile = () => {
  const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
  let rest = '';
  for (let i = 0; i < 9; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return `${firstDigit}${rest}`;
};

// TEMP TESTING: generate a realistic-looking random email from a full name.
// Used only for the test-beneficiary feature.
const EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'hotmail.com'
];

const randomEmail = (name) => {
  const [first, last = ''] = String(name).toLowerCase().split(' ');

  const patterns = [
    `${first}${Math.floor(Math.random() * 999)}`,
    `${first}.${last}${Math.floor(Math.random() * 99)}`,
    `${first}_${last}`,
    `${first[0]}${last}${Math.floor(Math.random() * 9999)}`,
    `${first}${last[0] || ''}_${Math.floor(Math.random() * 1000)}`,
    `${first.slice(0, 3)}${last}${Math.floor(Math.random() * 100)}`,
    `${first}${last}`,
    `${first}.${last}_${Math.floor(Math.random() * 9999)}`,
  ];

  const username = patterns[Math.floor(Math.random() * patterns.length)];
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];

  return `${username}@${domain}`;
};

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
  const { name, order_amount, email, phone, reference_id, address } = req.body;

  if (!name) errors.push('Name is required');
  if (!order_amount) errors.push('Order amount is required');
  if (!email) errors.push('Email is required');
  if (!phone) errors.push('Phone is required');
  if (!reference_id) errors.push('Order ID is required');
  if (!address || typeof address !== 'object') {
    errors.push('Address is required');
  } else if (!address.pincode) {
    errors.push('Address pincode is required');
  }

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
 * Singleton Redis client for user amount tracking
 * Uses the existing Redis client from queue config
 */
let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient('amount-tracking');
    logger.info('Redis client created for amount tracking');
  }
  return redisClient;
};

/**
 * Check and track user amount requests with pattern breaking
 * @param {string} userId - User ID
 * @param {number} amount - Request amount
 * @param {number} maxConsecutiveRequests - Maximum allowed consecutive requests (default: 10)
 * @returns {Object} - Result object with success status and message
 */
const checkUserAmountRequests = async (userId, amount, maxConsecutiveRequests = 10) => {
  const redis = getRedisClient();

  try {
    // Key to track the last transaction amount for this user
    const lastAmountKey = `last_amount:${userId}`;
    // Key to track consecutive count for current amount
    const countKey = `consecutive_count:${userId}:${amount}`;

    // Get the last transaction amount for this user
    const lastAmount = await redis.get(lastAmountKey);

    // If this is a different amount than the last transaction, reset the counter
    if (lastAmount && parseFloat(lastAmount) !== amount) {
      // Delete the old count key to reset the pattern
      await redis.del(countKey);
      logger.info(`Pattern broken for user ${userId}`, {
        userId,
        previousAmount: lastAmount,
        newAmount: amount
      });
    }

    // Increment the counter for this amount
    const currentCount = await redis.incr(countKey);

    // Set expiration time if this is the first request (5 minutes)
    if (currentCount === 1) {
      await redis.expire(countKey, 300); // 5 minutes in seconds
    }

    // Update the last transaction amount
    await redis.setex(lastAmountKey, 300, amount.toString()); // 5 minutes in seconds

    // Check if the user has exceeded the consecutive limit for this amount
    if (currentCount > maxConsecutiveRequests) {
      logger.warn(`User ${userId} exceeded consecutive amount request limit`, {
        userId,
        amount,
        currentCount,
        maxConsecutiveRequests
      });

      return {
        success: false,
        message: `You have exceeded the maximum number of consecutive requests (${maxConsecutiveRequests}) for amount ${amount}. Please try a different amount to break the pattern.`,
        currentCount,
        maxConsecutiveRequests
      };
    }

    logger.info(`User amount request tracked`, {
      userId,
      amount,
      currentCount,
      maxConsecutiveRequests,
      lastAmount: lastAmount || 'none'
    });

    return {
      success: true,
      message: 'Request allowed',
      currentCount,
      maxConsecutiveRequests
    };

  } catch (error) {
    logger.error('Error checking user amount requests', {
      error: error.message,
      userId,
      amount
    });

    // In case of Redis error, allow the request to proceed
    // This ensures the system doesn't break if Redis is down
    return {
      success: true,
      message: 'Request allowed (Redis error)',
      currentCount: 0,
      maxConsecutiveRequests
    };
  }
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

    let { name, order_amount, email, phone, reference_id, address } = req.body;
    const user_id = req.user.id;

    // TESTING FEATURE: when a user has "test_random_beneficiary" enabled (toggled by
    // an admin from the dashboard), override the submitted name/email/phone with a
    // random test identity so behaviour can be observed with varied customer details.
    if (req.user.test_random_beneficiary) {
      const testIdentity = TEST_IDENTITIES[Math.floor(Math.random() * TEST_IDENTITIES.length)];
      name = testIdentity.name;
      email = randomEmail(name);
      phone = generateIndianMobile();
      logger.info('Applied random test beneficiary', { user_id, name, email, phone });
    }

    const clientIp = getClientIp(req);
    const transaction_id = uuidv4();

    // Check user consecutive amount request limits before processing
    // This prevents users from making more than 10 consecutive requests for the same amount
    // Pattern is broken when user makes a transaction with different amount
    const amountCheckResult = await checkUserAmountRequests(user_id, order_amount, 7);
    if (!amountCheckResult.success) {
      return res.status(429).json({
        success: false,
        message: amountCheckResult.message,
        currentCount: amountCheckResult.currentCount,
        maxRequests: amountCheckResult.maxRequests
      });
    }

    // Process payin directly
    const result = await processPayin({
      user_id,
      transaction_id,
      name,
      order_amount,
      email,
      phone,
      reference_id,
      clientIp,
      address,
    });

    // Send response


    if (result.success) {
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

    // Resolve gateway from the transaction itself first (source of truth),
    // fall back to current MerchantDetails only for old transactions that predate gateway_name storage
    let merchantName = transaction.metadata?.gateway_name;
    if (!merchantName) {
      const merchantDetails = await MerchantDetails.findOne({ where: { user_id } });
      if (!merchantDetails) {
        return res.status(404).json({ success: false, message: 'Merchant details not found' });
      }
      merchantName = merchantDetails.payin_merchant_name;
    }
    logger.info('Checking transaction status', { reference_id: searchTransactionId, merchantName, source: transaction.metadata?.gateway_name ? 'transaction' : 'merchant_details' });

    if (merchantName === 'AirPay') {
      const response = await axios.get(
        `${process.env.ECOMMERCE_API_URL}/api/v1/payments/airpay/ap-check`,
        {
          params: { reference_id: searchTransactionId },
          headers: { 'x-api-key': process.env.AIRPAY_SHARED_SECRET },
          timeout: 30000,
        }
      );

      const result = response.data;
      logger.info('AirPay ap-check response', { result, reference_id: searchTransactionId });

      const statusMap = { TXN: 'success', FAILED: 'failed', PENDING: 'pending' };
      const normalizedStatus = statusMap[result.status?.toUpperCase()] || result.status || 'unknown';

      return res.status(200).json({
        success: true,
        transaction: {
          reference_id: result.reference_id ?? transaction.reference_id,
          type: 'payin',
          status: normalizedStatus,
          amount: result.amount ?? transaction.amount,
          utr: normalizedStatus === 'success' ? (result.utr || null) : null,
          message: normalizedStatus === 'success'
            ? 'Transaction processed'
            : normalizedStatus === 'pending'
              ? 'Transaction is pending'
              : 'Transaction failed',
          timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString()
        }
      });
    }

    if (merchantName === 'HDFC') {
      // GET /api/v1/payments/hdfc/pg-check?reference_id=... (API contract v1.0)
      const response = await axios.get(
        `${process.env.ECOMMERCE_API_URL}/api/v1/payments/hdfc/pg-check`,
        {
          params: { reference_id: searchTransactionId },
          headers: {
            'x-api-key': process.env.HDFC_SHARED_SECRET,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const result = response.data;
      logger.info('HDFC pg-check response', { result, reference_id: searchTransactionId });

      // Normalize HDFC status to match callback payload format (completed / failed / pending)
      const normalizeHdfcStatus = (hdfcStatus) => {
        if (!hdfcStatus) return 'pending';
        const s = hdfcStatus.toUpperCase();
        if (s === 'TXN' || s === 'CHARGED') return 'success';
        if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ABORTED', 'ERROR',
          'AUTHORIZATION_FAILED', 'JUSPAY_DECLINED', 'PAYMENT_FAILED'].includes(s)) return 'failed';
        return 'pending';
      };

      const normalizedStatus = normalizeHdfcStatus(result.status);
      return res.status(200).json({
        success: true,
        transaction: {
          reference_id: result.reference_id ?? transaction.reference_id,
          type: 'payin',
          status: normalizedStatus,
          amount: result.amount ?? transaction.amount,
          utr: normalizedStatus === 'success' ? (result.utr || null) : null,
          message: normalizedStatus === 'success'
            ? 'Transaction processed'
            : normalizedStatus === 'pending'
              ? 'Transaction is pending'
              : 'Transaction failed',
          timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
          payerVpa: normalizedStatus === 'success' ? (result.payer_vpa || null) : null
        }
      });
    }

    if (merchantName === 'Razorpay') {
      // GET /api/v1/payments/razorpay/rp-check?reference_id=... (Razorpay contract)
      const response = await axios.get(
        `${process.env.ECOMMERCE_API_URL}/api/v1/payments/razorpay/rp-check`,
        {
          params: { reference_id: searchTransactionId },
          headers: {
            'x-api-key': process.env.RAZORPAY_SHARED_SECRET,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const result = response.data;
      logger.info('Razorpay rp-check response', { result, reference_id: searchTransactionId });

      // Map Razorpay status (status / razorpay_status) to our normalized values
      const normalizeRazorpayStatus = (rpStatus) => {
        if (!rpStatus) return 'pending';
        const s = rpStatus.toUpperCase();
        if (s === 'TXN' || s === 'CAPTURED' || s === 'FORWARDED') return 'success';
        if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ERROR', 'EXPIRED'].includes(s)) return 'failed';
        return 'pending';
      };

      const normalizedStatus = normalizeRazorpayStatus(result.razorpay_status || result.status);
      return res.status(200).json({
        success: true,
        transaction: {
          reference_id: result.reference_id ?? transaction.reference_id,
          type: 'payin',
          status: normalizedStatus,
          amount: result.amount ?? transaction.amount,
          utr: normalizedStatus === 'success' ? (result.utr || null) : null,
          message: normalizedStatus === 'success'
            ? 'Transaction processed'
            : normalizedStatus === 'pending'
              ? 'Transaction is pending'
              : 'Transaction failed',
          timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString()
        }
      });
    }

    // Unknown/legacy gateway (only HDFC, AirPay, Razorpay are live) — no external
    // status API to query. Serve the authoritative status from our own record.
    const localStatus = transaction.status === 'completed' ? 'success'
      : transaction.status === 'failed' ? 'failed'
        : 'pending';

    logger.info('Payin status served from local record (unsupported/legacy gateway)', {
      reference_id: searchTransactionId, merchantName, local_status: transaction.status
    });

    return res.status(200).json({
      success: true,
      transaction: {
        reference_id: transaction.reference_id,
        type: 'payin',
        status: localStatus,
        amount: transaction.amount,
        utr: transaction.gateway_response?.utr || null,
        message: localStatus === 'success'
          ? 'Transaction processed'
          : localStatus === 'pending'
            ? 'Transaction is pending'
            : 'Transaction failed',
        timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString()
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

const handleBluswapPayoutCallback = async (req, res) => {
  try {
    const callbackData = req.method === 'GET' ? req.query : req.body;
    logger.info('Received BluSwap payout callback', {
      method: req.method,
      data: callbackData
    });
    console.log("this is callback data of bluswap payout", callbackData);

    const bluswapRef = callbackData?.data?.order_id || callbackData?.order_id || null;
    recordTraceEvent({
      reference_id: bluswapRef, trace_type: 'payout', stage: STAGES.CALLBACK_RECEIVED,
      status: String(callbackData?.data?.trx_status || '').toUpperCase() === 'SUCCESS' ? 'ok' : 'failed',
      source: 'gateway_callback', gateway_name: 'BluSwap',
      http: { method: req.method, url: '/api/payments/bluswap/payout/callback' },
      detail: `Inbound BluSwap payout callback: ${callbackData?.data?.trx_status != null ? callbackData.data.trx_status : 'unknown'}`,
      payload: { query: req.query, body: req.body }
    });

    const job = await bluswapPayoutQueue.add(callbackData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    recordTraceEvent({
      reference_id: bluswapRef, trace_type: 'payout', stage: STAGES.QUEUED, status: 'info',
      source: 'gateway_callback', gateway_name: 'BluSwap', detail: 'Enqueued to bluswapPayoutQueue',
      payload: { jobId: job.id }
    });

    res.status(200).json({
      success: true,
      message: 'Callback processed successfully',
      job_id: job.id
    });
  } catch (error) {
    logger.error('Error processing BluSwap payout callback', { error: error.message });
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
};

const handleMizorpayPayoutCallback = async (req, res) => {
  try {
    const callbackData = req.method === 'GET' ? req.query : req.body;
    logger.info('Received MizorPay payout callback', {
      method: req.method,
      data: callbackData
    });

    // Contract §3 body:
    // { reference_id, status: 'TXN'|'FAILED', utr, amount, payment_id, error_message }
    const mizorpayRef = callbackData?.reference_id || null;
    const isSuccess = String(callbackData?.status || '').toUpperCase() === 'TXN';

    recordTraceEvent({
      reference_id: mizorpayRef, trace_type: 'payout', stage: STAGES.CALLBACK_RECEIVED,
      status: isSuccess ? 'ok' : 'failed',
      source: 'gateway_callback', gateway_name: 'MizorPay',
      http: { method: req.method, url: '/api/payments/mizorpay/payout/callback' },
      detail: `Inbound MizorPay payout callback: ${callbackData?.status != null ? callbackData.status : 'unknown'}`,
      payload: { query: req.query, body: req.body }
    });

    const job = await mizorpayPayoutQueue.add(callbackData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    recordTraceEvent({
      reference_id: mizorpayRef, trace_type: 'payout', stage: STAGES.QUEUED, status: 'info',
      source: 'gateway_callback', gateway_name: 'MizorPay', detail: 'Enqueued to mizorpayPayoutQueue',
      payload: { jobId: job.id }
    });

    res.status(200).json({
      success: true,
      message: 'Callback processed successfully',
      job_id: job.id
    });
  } catch (error) {
    logger.error('Error processing MizorPay payout callback', { error: error.message });
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
};

// Map a gateway's raw status to our internal status (same rule as the worker).
const mapCallbackStatus = (statuscode) =>
  (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';

/**
 * Record an inbound gateway callback as a CALLBACK_RECEIVED event on the
 * transaction's journey. Wrapped so it can never block the 200 ack back to the
 * gateway. The verbatim headers/query/body are captured in the event payload
 * (redacted + size-capped by the trace service) — this replaces the old
 * standalone GatewayCallbackLog collection.
 *
 * `endpoint` is the callback route that received the hit ('hdfc'/'razorpay'/...).
 * The TRUE gateway is resolved from the transaction's metadata.gateway_name —
 * upstream forwarders can post one gateway's result to another's endpoint (e.g.
 * a Razorpay result arriving at /hdfc/callback), so the endpoint is not reliable.
 */
const logGatewayCallback = async (endpoint, req, { reference_id, status_raw, mapped_status, failure_reason }) => {
  try {
    let gateway = endpoint;
    if (reference_id) {
      const txn = await PayinTransaction.findOne({ reference_id }).select('metadata.gateway_name').lean();
      if (txn?.metadata?.gateway_name) gateway = String(txn.metadata.gateway_name).toLowerCase();
    }

    recordTraceEvent({
      reference_id,
      trace_type: 'payin',
      stage: STAGES.CALLBACK_RECEIVED,
      status: mapped_status === 'completed' ? 'ok' : mapped_status === 'failed' ? 'failed' : 'info',
      source: 'gateway_callback',
      gateway_name: gateway,
      http: { method: req.method, url: `/api/payments/${endpoint}/callback` },
      detail: `Inbound ${gateway} callback: ${status_raw != null ? status_raw : 'unknown'}`,
      error: failure_reason || null,
      // headers/body redaction + size cap is handled by the trace service.
      payload: { headers: req.headers, query: req.query, body: req.body },
    });
    logger.info('Gateway callback traced', { gateway, endpoint, reference_id, mapped_status, has_reason: !!failure_reason });
  } catch (err) {
    logger.error('Failed to record gateway callback trace', { endpoint, reference_id, error: err.message });
  }
};

const hdfcCallback = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.HDFC_SHARED_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { reference_id, status, utr, amount } = req.body;
    if (!reference_id || !status) {
      return res.status(400).json({ success: false, message: 'Missing reference_id or status' });
    }

    const mappedStatus = mapCallbackStatus(status);
    const failureReason = mappedStatus === 'failed' ? extractFailureReason(req.body) : null;

    // Store the raw callback exactly as received (never blocks the ack).
    await logGatewayCallback('hdfc', req, {
      reference_id, status_raw: status, mapped_status: mappedStatus, failure_reason: failureReason,
    });

    const job = await callbackQueue.add(
      { statuscode: status, apitxnid: reference_id, utr: utr || null, amount, message: 'HDFC UPI payment', rawBody: req.body, failureReason },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.QUEUED, status: 'info', source: 'gateway_callback',
      gateway_name: 'hdfc', detail: 'Enqueued to callbackQueue', payload: { jobId: job.id }
    });
    logger.info('HDFC callback queued', { reference_id, status, jobId: job.id });
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('HDFC callback error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

const airpayCallback = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.AIRPAY_SHARED_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { reference_id, status, utr, amount, ap_transaction_id } = req.body;
    if (!reference_id || !status) {
      return res.status(400).json({ success: false, message: 'Missing reference_id or status' });
    }

    const mappedStatus = mapCallbackStatus(status);
    const failureReason = mappedStatus === 'failed' ? extractFailureReason(req.body) : null;

    await logGatewayCallback('airpay', req, {
      reference_id, status_raw: status, mapped_status: mappedStatus, failure_reason: failureReason,
    });

    const job = await callbackQueue.add(
      {
        statuscode: status,
        apitxnid: reference_id,
        utr: utr || null,
        amount,
        message: 'AirPay UPI payment',
        txnid: ap_transaction_id || null,
        rawBody: req.body,
        failureReason,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.QUEUED, status: 'info', source: 'gateway_callback',
      gateway_name: 'airpay', detail: 'Enqueued to callbackQueue', payload: { jobId: job.id }
    });
    logger.info('AirPay callback queued', { reference_id, status, jobId: job.id });
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('AirPay callback error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

const razorpayCallback = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.RAZORPAY_SHARED_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { reference_id, status, utr, amount, payment_id } = req.body;
    if (!reference_id || !status) {
      return res.status(400).json({ success: false, message: 'Missing reference_id or status' });
    }

    const mappedStatus = mapCallbackStatus(status);
    const failureReason = mappedStatus === 'failed' ? extractFailureReason(req.body) : null;

    await logGatewayCallback('razorpay', req, {
      reference_id, status_raw: status, mapped_status: mappedStatus, failure_reason: failureReason,
    });

    const job = await callbackQueue.add(
      {
        statuscode: status,
        apitxnid: reference_id,
        utr: utr || null,
        amount,
        message: 'Razorpay UPI payment',
        txnid: payment_id || null,
        rawBody: req.body,
        failureReason,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.QUEUED, status: 'info', source: 'gateway_callback',
      gateway_name: 'razorpay', detail: 'Enqueued to callbackQueue', payload: { jobId: job.id }
    });
    logger.info('Razorpay callback queued', { reference_id, status, jobId: job.id });
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Razorpay callback error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

module.exports = {
  initiatePayment,
  getTransactionStatus,
  validatePaymentRequest,
  setValidationResult,
  validatePaymentRequestpayin,
  handleBluswapPayoutCallback,
  handleMizorpayPayoutCallback,
  hdfcCallback,
  airpayCallback,
  razorpayCallback
};


