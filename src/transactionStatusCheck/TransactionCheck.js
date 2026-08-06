const axios = require('axios');

const bluswapTransactionStatus = async (transaction_id) => {
  const baseUrl = process.env.BLUSWAP_BASE_URL;
  const apiKey = process.env.BLUSWAP_API_KEY;
  const ip = process.env.BLUSWAP_IP || '0.0.0.0';

  if (!baseUrl || !apiKey) {
    throw new Error('BluSwap credentials or base URL not set in environment variables');
  }

  try {
    const response = await axios.post(
      `${baseUrl}/transactions/check_status_cust_by_order_id_or_transanction_id`,
      { order_id: transaction_id },
      {
        headers: {
          'x-api-key': apiKey,
          'X-Real-IP': ip,
          'Content-Type': 'application/json'
        }
      }
    );
    const result = response.data;

    const s = (result.data?.status || '').toLowerCase();
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

/**
 * Check a MizorPay payout status.
 *
 * Contract §2: GET {MIZORPAY_BASE_URL}/check?reference_id=...  (auth: x-api-key).
 * AccuzPay-facing `status`: TXN (success) | PENDING | PROCESSING | FAILED.
 * We normalize to success | failed | pending so callers (getPayoutTransactionStatus,
 * reconciliation) can treat every gateway uniformly.
 */
const mizorpayTransactionStatus = async (reference_id) => {
  const baseUrl = process.env.MIZORPAY_BASE_URL;
  const apiKey = process.env.MIZORPAY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('MizorPay credentials or base URL not set in environment variables');
  }

  try {
    const response = await axios.get(`${baseUrl}/check`, {
      params: { reference_id },
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    const result = response.data;

    const s = String(result?.status || '').toUpperCase();
    let derived = 'pending';
    if (s === 'TXN') derived = 'success';
    else if (s === 'FAILED') derived = 'failed';

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
};

module.exports = {
  bluswapTransactionStatus,
  mizorpayTransactionStatus
}