const axios = require('axios');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const crypto = require('crypto');
const FormData = require('form-data');


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


const xlitepayTransactionStatus = async (transaction_id) => {
  const baseUrl = process.env.XLITEPAY_BASE_URL;
  const token = process.env.XLITEPAY_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Xlitepay credentials or base URL not set in environment variables');
  }

  const form = new FormData();
  form.append('orderid', transaction_id);

  try {
    const response = await axios.post(`${baseUrl}/api/payout/checkstatus`, form, {
      headers: {
        token,
        ...form.getHeaders()
      }
    });
    const result = response.data;

    const s = (result.status || '').toLowerCase();
    let derived = 'pending';
    if (s === 'success') derived = 'success';
    else if (s === 'failed') derived = 'failed';

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

module.exports = {
  unpayTransactionStatus,
  spayTransactionStatus,
  philpayTransactionStatus,
  xlitepayTransactionStatus
}