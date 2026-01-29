const axios = require('axios');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { getBipspayToken } = require('../services/payment.service');


const unpayTransactionStatus = async (transaction_id) => {
// Prepare request body for Unpay API
  const requestBody = {
    partner_id: "1809", // Get this from merchant details or config
    apitxnid: transaction_id
  };

  // Encrypt request body
  const aesKey = "brTaJLaVgWvshn3zHM4qt0lI1DqjFeUz"; // Get from config
  const aesIV = "uBiWATDOnfTvhfJO"; // Get from config
  const apiKey = "Tn3ybTJGKaDMhhj9jl89aULGf9OI0S8ZPkq0GD42"; // Get from config
  const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);

  // Make API request to Unpay using axios
  const response = await axios.post('https://unpay.in/tech/api/payout/order/status', 
    { body: encryptedRequestBody },
    {
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      }
    }
  );

  const result = response.data;

  // Handle different response status codes
  console.log("*".repeat(50));
  console.log(result)
  if (result.statuscode === 'TXN') {
    // Success case
    res.status(200).json({
      success: true,
      response: result
    });
  } else if (result.statuscode === 'TXF') {
    // Failed case - No record found
    res.status(200).json({
      success: false,
      response: result
    });
  } else {
    // Unknown status code
    res.status(200).json({
      success: false,
      response: result
    });
  }
}

const spayTransactionStatus = async (transaction_id) => {

  return result;
}

const philpayTransactionStatus = async (transaction_id) => {
  const access_key = process.env.PHILPAY_TOKEN;
  const secret = process.env.PHILPAY_SECRET;
  const domain = process.env.PHILPAY_DOMAIN;

  if (!access_key || !secret || !domain) {
    throw new Error('Philpay credentials or domain not set in environment variables');
  }

  const path = `/api/v1/payout/${encodeURIComponent(transaction_id)}`;
  const method = 'GET';
  const queryString = '';
  const body = '';
  const timestamp = Date.now().toString();

  function generateSignature(ts, reqBody, reqPath, qs = '', httpMethod = 'GET') {
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(httpMethod);
    hmac.update('\n');
    hmac.update(reqPath);
    hmac.update('\n');
    hmac.update(qs);
    hmac.update('\n');
    hmac.update(reqBody);
    hmac.update('\n');
    hmac.update(ts);
    hmac.update('\n');
    return hmac.digest('hex');
  }

  const signature = generateSignature(timestamp, body, path, queryString, method);

  const headers = {
    'access_key': access_key,
    'signature': signature,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  const url = `https://${domain}${path}`;

  try {
    const response = await axios.get(url, { headers });
    const result = response.data;

    const candidate = (result && (result.data?.object || result.data)) || result;
    const s = (candidate?.status || '').toLowerCase();
    const ms = (candidate?.master_status || '').toLowerCase();

    let derived = 'pending';
    if (s === 'success' && ms === 'success') derived = 'success';
    else if (s === 'failed' && ms === 'failed') derived = 'failed';

    return {
      data: {
        status: derived,
        response: result
      },
      status: 200
    };
  } catch (err) {
    const statusCode = err.response?.status || 500;
    const result = err.response ? err.response.data : { message: err.message };
    return {
      data: {
        status: 'error',
        response: result
      },
      status: statusCode
    };
  }
}   


const getBipspayPayoutTransactionStatus = async (transactionId) => {
  try {
    const token = await getBipspayToken();

    const response = await axios.post(
      'https://gateway.bipspay.com/api/v6/payoutOrderStatus',
      {
        referenceNumber: transactionId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const result = response.data;

    logger.info('BipsPay Payout Status Response:', { result, status: response.status });

    // BipsPay response structure can be:
    // Option 1: { "result": { "status": "SUCCESS", ... }, "status": 200 }
    // Option 2: { "status": "SUCCESS", "payout_ref": "...", ... }
    // Option 3: Direct transaction data
    
    // Check if HTTP response is successful
    if (response.status !== 200) {
      return {
        status: response.status,
        data: {
          status: 'error',
          response: result,
          message: result.message || 'Unknown error'
        }
      };
    }

    // Extract actual transaction data - check different possible structures
    const transactionData = result.result || result;
    const transactionStatus = transactionData.status || 'unknown';
    
    // Check if transaction status indicates success (SUCCESS) or failure
    const isSuccess = typeof transactionStatus === 'string' && transactionStatus.toUpperCase() === 'SUCCESS';
    
    // Return in the same format as other status check functions
    return {
      status: response.status,
      data: {
        status: isSuccess ? 'success' : 'error',
        response: transactionData,
        message: transactionData.remark || transactionData.message || (isSuccess ? 'Transaction successful' : 'Transaction failed')
      }
    };
  } catch (error) {
    logger.error('Error getting BipsPay payout transaction status', {
      error: error.message,
      transactionId,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });
    
    // Return error response instead of throwing, consistent with philpayTransactionStatus
    const statusCode = error.response?.status || 500;
    const result = error.response ? error.response.data : { message: error.message };
    
    return {
      status: statusCode,
      data: {
        status: 'error',
        response: result,
        message: result.message || error.message
      }
    };
  }
};



module.exports = {
  unpayTransactionStatus,
  spayTransactionStatus,
  philpayTransactionStatus,
  getBipspayPayoutTransactionStatus
}