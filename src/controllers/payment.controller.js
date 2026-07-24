const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { logger } = require('../utils/logger');
const { processPayin } = require('../services/payment.service');
const { callbackQueue, philpayPayoutQueue, bluswapPayoutQueue, createRedisClient } = require('../config/queue.config');
const PayinTransaction = require('../models/payinTransaction.model');
const { MerchantDetails } = require('../models');
const { encryptText } = require('../merchant_payin_payout/utils_payout');

// TEMP TESTING: pool of fake customer identities used only for user_id 52.
// Remove this along with the override in initiatePayment once testing is done.
const TEST_IDENTITIES = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com' },
  { name: 'Priya Nair', email: 'priya.nair@gmail.com' },
  { name: 'Rohan Mehta', email: 'rohan.mehta@gmail.com' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@gmail.com' },
  { name: 'Vikram Singh', email: 'vikram.singh@gmail.com' },
  { name: 'Sneha Kulkarni', email: 'sneha.kulkarni@gmail.com' },
  { name: 'Arjun Reddy', email: 'arjun.reddy@gmail.com' },
  { name: 'Meera Joshi', email: 'meera.joshi@gmail.com' },
  { name: 'Karan Malhotra', email: 'karan.malhotra@gmail.com' },
  { name: 'Divya Menon', email: 'divya.menon@gmail.com' },
  { name: 'Siddharth Bose', email: 'siddharth.bose@gmail.com' },
  { name: 'Nisha Agarwal', email: 'nisha.agarwal@gmail.com' },
  { name: 'Rahul Verma', email: 'rahul.verma@gmail.com' },
  { name: 'Pooja Deshmukh', email: 'pooja.deshmukh@gmail.com' },
  { name: 'Aditya Rao', email: 'aditya.rao@gmail.com' },
  { name: 'Kavya Pillai', email: 'kavya.pillai@gmail.com' },
  { name: 'Manish Gupta', email: 'manish.gupta@gmail.com' },
  { name: 'Ritu Chauhan', email: 'ritu.chauhan@gmail.com' },
  { name: 'Nikhil Bhatt', email: 'nikhil.bhatt@gmail.com' },
  { name: 'Shreya Ghosh', email: 'shreya.ghosh@gmail.com' },
  { name: 'Ravi Krishnan', email: 'ravi.krishnan@gmail.com' },
  { name: 'Tanvi Saxena', email: 'tanvi.saxena@gmail.com' },
  { name: 'Amit Chatterjee', email: 'amit.chatterjee@gmail.com' },
  { name: 'Neha Bansal', email: 'neha.bansal@gmail.com' },
  { name: 'Varun Kapoor', email: 'varun.kapoor@gmail.com' },
  { name: 'Ishita Dutta', email: 'ishita.dutta@gmail.com' },
  { name: 'Sameer Khanna', email: 'sameer.khanna@gmail.com' },
  { name: 'Aditi Ranganathan', email: 'aditi.ranganathan@gmail.com' },
  { name: 'Harsh Patel', email: 'harsh.patel@gmail.com' },
  { name: 'Swati Mishra', email: 'swati.mishra@gmail.com' },
  { name: 'James Whitfield', email: 'james.whitfield@gmail.com' },
  { name: 'Emily Carver', email: 'emily.carver@gmail.com' },
  { name: 'Michael Brennan', email: 'michael.brennan@gmail.com' },
  { name: 'Sarah Lindqvist', email: 'sarah.lindqvist@gmail.com' },
  { name: 'David Okonkwo', email: 'david.okonkwo@gmail.com' },
  { name: 'Laura Fitzgerald', email: 'laura.fitzgerald@gmail.com' },
  { name: 'Daniel Moreau', email: 'daniel.moreau@gmail.com' },
  { name: 'Rachel Stern', email: 'rachel.stern@gmail.com' },
  { name: 'Christopher Hale', email: 'christopher.hale@gmail.com' },
  { name: 'Olivia Brandt', email: 'olivia.brandt@gmail.com' },
  { name: 'Thomas Reyes', email: 'thomas.reyes@gmail.com' },
  { name: 'Hannah Kowalski', email: 'hannah.kowalski@gmail.com' },
  { name: 'Andrew Sinclair', email: 'andrew.sinclair@gmail.com' },
  { name: 'Megan Fowler', email: 'megan.fowler@gmail.com' },
  { name: 'Benjamin Ortiz', email: 'benjamin.ortiz@gmail.com' },
  { name: 'Chloe Vandenberg', email: 'chloe.vandenberg@gmail.com' },
  { name: 'Ethan Marsh', email: 'ethan.marsh@gmail.com' },
  { name: 'Grace Donnelly', email: 'grace.donnelly@gmail.com' },
  { name: 'Nathan Boyle', email: 'nathan.boyle@gmail.com' },
  { name: 'Sophie Lambert', email: 'sophie.lambert@gmail.com' },
  { name: 'Lucas Ferreira', email: 'lucas.ferreira@gmail.com' },
  { name: 'Camila Rojas', email: 'camila.rojas@gmail.com' },
  { name: 'Mateo Alvarez', email: 'mateo.alvarez@gmail.com' },
  { name: 'Valentina Cruz', email: 'valentina.cruz@gmail.com' },
  { name: 'Diego Santana', email: 'diego.santana@gmail.com' },
  { name: 'Isabela Duarte', email: 'isabela.duarte@gmail.com' },
  { name: 'Javier Molina', email: 'javier.molina@gmail.com' },
  { name: 'Lucia Herrera', email: 'lucia.herrera@gmail.com' },
  { name: 'Rafael Pinto', email: 'rafael.pinto@gmail.com' },
  { name: 'Elena Vargas', email: 'elena.vargas@gmail.com' },
  { name: 'Kenji Tanaka', email: 'kenji.tanaka@gmail.com' },
  { name: 'Yuki Nakamura', email: 'yuki.nakamura@gmail.com' },
  { name: 'Wei Zhang', email: 'wei.zhang@gmail.com' },
  { name: 'Mei Lin Chen', email: 'meilin.chen@gmail.com' },
  { name: 'Jisoo Park', email: 'jisoo.park@gmail.com' },
  { name: 'Minho Kang', email: 'minho.kang@gmail.com' },
  { name: 'Linh Nguyen', email: 'linh.nguyen@gmail.com' },
  { name: 'Somchai Prasert', email: 'somchai.prasert@gmail.com' },
  { name: 'Aisyah Rahman', email: 'aisyah.rahman@gmail.com' },
  { name: 'Hiroshi Sato', email: 'hiroshi.sato@gmail.com' },
  { name: 'Omar Haddad', email: 'omar.haddad@gmail.com' },
  { name: 'Layla Mansour', email: 'layla.mansour@gmail.com' },
  { name: 'Yusuf Demir', email: 'yusuf.demir@gmail.com' },
  { name: 'Zainab Farouk', email: 'zainab.farouk@gmail.com' },
  { name: 'Kareem Nasser', email: 'kareem.nasser@gmail.com' },
  { name: 'Amina Toure', email: 'amina.toure@gmail.com' },
  { name: 'Kwame Mensah', email: 'kwame.mensah@gmail.com' },
  { name: 'Chidi Eze', email: 'chidi.eze@gmail.com' },
  { name: 'Naledi Mokoena', email: 'naledi.mokoena@gmail.com' },
  { name: 'Tendai Chirwa', email: 'tendai.chirwa@gmail.com' },
  { name: 'Lars Andersen', email: 'lars.andersen@gmail.com' },
  { name: 'Ingrid Bakker', email: 'ingrid.bakker@gmail.com' },
  { name: 'Pieter Janssen', email: 'pieter.janssen@gmail.com' },
  { name: 'Freya Nilsen', email: 'freya.nilsen@gmail.com' },
  { name: 'Matteo Bianchi', email: 'matteo.bianchi@gmail.com' },
  { name: 'Giulia Romano', email: 'giulia.romano@gmail.com' },
  { name: 'Sebastian Vogel', email: 'sebastian.vogel@gmail.com' },
  { name: 'Anna Wojcik', email: 'anna.wojcik@gmail.com' },
  { name: 'Dmitri Volkov', email: 'dmitri.volkov@gmail.com' },
  { name: 'Katarina Novak', email: 'katarina.novak@gmail.com' },
  { name: "Liam O'Sullivan", email: 'liam.osullivan@gmail.com' },
  { name: 'Aisling Byrne', email: 'aisling.byrne@gmail.com' },
  { name: 'Callum Fraser', email: 'callum.fraser@gmail.com' },
  { name: 'Isla Macleod', email: 'isla.macleod@gmail.com' },
  { name: 'Noah Bennett', email: 'noah.bennett@gmail.com' },
  { name: 'Zoe Harrington', email: 'zoe.harrington@gmail.com' },
  { name: 'Felix Ashcroft', email: 'felix.ashcroft@gmail.com' },
  { name: 'Maya Thornton', email: 'maya.thornton@gmail.com' },
  { name: 'Owen Castellano', email: 'owen.castellano@gmail.com' },
  { name: 'Elsie Ravenscroft', email: 'elsie.ravenscroft@gmail.com' },
];

// TEMP TESTING: generate a legitimate-looking Indian mobile number (10 digits,
// starting with 6/7/8/9). Used only for user_id 52. Remove after testing.
const generateIndianMobile = () => {
  const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
  let rest = '';
  for (let i = 0; i < 9; i++) {
    rest += Math.floor(Math.random() * 10);
  }
  return `${firstDigit}${rest}`;
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
      email = testIdentity.email;
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
    const transactionInDb = await PayinTransaction.findOne({ reference_id: callbackData.apitxnid });

    logger.info('Checking if transaction exists in database', {
      apitxnid: callbackData.apitxnid,
      transactionFound: !!transactionInDb
    });

    if (!transactionInDb) {
      logger.warn('Transaction not found in database - forwarding to payzutech', {
        apitxnid: callbackData.apitxnid,
        amount: callbackData.amount,
        status: callbackData.status
      });

      try {
        const response = await axios.post('https://dashboard.payzutech.in/api/payments/unpay/callback', {
          callbackData
        });
        logger.info('Callback forwarded to payzutech successfully', {
          apitxnid: callbackData.apitxnid,
          payzutechResponseStatus: response.status
        });
        res.status(200).json({
          success: true,
          message: 'Callback processed successfully',
          response: response.data
        });
      } catch (error) {
        logger.error('Error forwarding callback to payzutech', {
          apitxnid: callbackData.apitxnid,
          error: error.message,
          stack: error.stack
        });
        res.status(500).json({
          success: false,
          message: 'Error forwarding callback to payzutech'
        });
      }
    } else {
      logger.info('Transaction found in database - adding to callback queue', {
        apitxnid: callbackData.apitxnid,
        transactionId: transactionInDb._id
      });

      const job = await callbackQueue.add(callbackData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });

      logger.info('Callback queued for processing', {
        apitxnid: callbackData.apitxnid,
        jobId: job.id
      });

      res.status(200).json({
        success: true,
        message: 'Callback queued for processing',
        job_id: job.id
      });
    }

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

    // Default: Unpay gateway
    const requestBody = {
      partner_id: "4071",
      apitxnid: searchTransactionId
    };
    const aesKey = "XRUhoLqUBgmZFLdWT5PiuNQnGhI9l6Pc";
    const aesIV = "oR21lVkifQEBNRQS";
    const apiKey = "QPf0uqDt0EjQqkseizXyr1Ydn21HF9cOiQEFtjrV";
    const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);

    // Make API request to Unpay
    const response = await fetch('https://unpay.in/tech/api/next/upi/request/qrstatus', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        body: encryptedRequestBody
      })
    });

    const result = await response.json();

    // Log the actual response to debug
    logger.info('Unpay API Response:', { result, status: response.status });

    if (!response.ok) {
      throw new Error(`API error: ${result.message || 'Unknown error'}`);
    }

    // Check if result.data exists
    if (!result.data) {
      logger.error('No data property in API response:', { result });
      return res.status(500).json({
        success: false,
        message: 'Invalid response from payment gateway'
      });
    }

    const unpayStatusMap = { TXN: 'success', SUCCESS: 'success', FAILED: 'failed', TXF: 'failed', PENDING: 'pending' };
    const unpayStatus = unpayStatusMap[String(result.data.paymentStatus || '').toUpperCase()]
      || String(result.data.paymentStatus || 'unknown').toLowerCase();

    res.status(200).json({
      success: true,
      transaction: {
        reference_id: transaction.reference_id,
        type: 'payin',
        status: unpayStatus,
        amount: transaction.amount,
        utr: result.data.rrnNumber || null,
        message: unpayStatus === 'success'
          ? 'Transaction processed'
          : unpayStatus === 'pending'
            ? 'Transaction is pending'
            : 'Transaction failed',
        timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
        payerVpa: result.data.payerVpa || null,
        npciTxnId: result.data.npciTxnId || null
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
    console.log("callbackData", callbackData);

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

const handleSpayPayoutCallback = async (req, res) => {
  try {
    const callbackData = req.method === 'GET' ? req.query : req.body;
    logger.info('Received SPay payout callback', {
      method: req.method,
      data: callbackData
    });
    console.log(callbackData);
    res.status(200).json({ success: true, message: 'Callback processed successfully' });
  } catch (error) {
    logger.error('Error processing SPay payout callback', { error: error.message });
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
};

const handlePhilpayPayoutCallback = async (req, res) => {
  try {
    const callbackData = req.method === 'GET' ? req.query : req.body;
    logger.info('Received Philpay payout callback', {
      method: req.method,
      data: callbackData
    });
    console.log("this is callback data of philpay payout", callbackData);
    const job = await philpayPayoutQueue.add(callbackData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
    res.status(200).json({
      success: true,
      message: 'Callback processed successfully',
      job_id: job.id
    });
  } catch (error) {
    logger.error('Error processing Philpay payout callback', { error: error.message });
    res.status(500).json({ success: false, message: 'Error processing callback' });
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
    const job = await bluswapPayoutQueue.add(callbackData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
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

    await callbackQueue.add(
      { statuscode: status, apitxnid: reference_id, utr: utr || null, amount, message: 'HDFC UPI payment' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    logger.info('HDFC callback queued', { reference_id, status });
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

    await callbackQueue.add(
      {
        statuscode: status,
        apitxnid: reference_id,
        utr: utr || null,
        amount,
        message: 'AirPay UPI payment',
        txnid: ap_transaction_id || null,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    logger.info('AirPay callback queued', { reference_id, status });
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('AirPay callback error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

module.exports = {
  initiatePayment,
  handleUnpayCallback,
  getTransactionStatus,
  validatePaymentRequest,
  setValidationResult,
  validatePaymentRequestpayin,
  handleSpayCallback,
  handleSpayPayoutCallback,
  handlePhilpayPayoutCallback,
  handleBluswapPayoutCallback,
  hdfcCallback,
  airpayCallback
};


