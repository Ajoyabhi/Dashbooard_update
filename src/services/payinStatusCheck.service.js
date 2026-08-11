const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Query a payin gateway's status-check API for a single reference_id and return a
 * NORMALIZED result (success | failed | pending).
 *
 * This is the exact per-gateway logic used by the user-facing status endpoint
 * (payment.controller.js -> getTransactionStatus), extracted so the payin
 * reconciliation worker can reuse the same source of truth. Only the three live
 * payin gateways are supported: AirPay, HDFC, Razorpay. Anything else returns
 * `unsupported` — there is no external API to query, so the caller must NOT
 * infer a status from age alone.
 *
 * @param {{ gateway: string, reference_id: string, timeoutMs?: number }} args
 * @returns {Promise<{ normalizedStatus: 'success'|'failed'|'pending'|'unsupported',
 *   amount: number|null, utr: string|null, payerVpa: string|null, raw: any }>}
 * @throws re-throws the axios/network error so the caller can decide to skip &
 *   retry on the next run rather than mis-marking the transaction.
 */
async function checkPayinStatus({ gateway, reference_id, timeoutMs = 30000 }) {
  const baseUrl = process.env.ECOMMERCE_API_URL;
  if (!baseUrl) {
    throw new Error('ECOMMERCE_API_URL not set in environment variables');
  }

  if (gateway === 'AirPay') {
    const response = await axios.get(`${baseUrl}/api/v1/payments/airpay/ap-check`, {
      params: { reference_id },
      headers: { 'x-api-key': process.env.AIRPAY_SHARED_SECRET },
      timeout: timeoutMs,
    });
    const result = response.data;
    const statusMap = { TXN: 'success', FAILED: 'failed', PENDING: 'pending' };
    const normalizedStatus = statusMap[String(result.status || '').toUpperCase()] || 'pending';
    return {
      normalizedStatus,
      amount: result.amount ?? null,
      utr: normalizedStatus === 'success' ? (result.utr || null) : null,
      payerVpa: null,
      raw: result,
    };
  }

  if (gateway === 'HDFC') {
    const response = await axios.get(`${baseUrl}/api/v1/payments/hdfc/pg-check`, {
      params: { reference_id },
      headers: { 'x-api-key': process.env.HDFC_SHARED_SECRET, 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    });
    const result = response.data;
    const normalizedStatus = normalizeHdfcStatus(result.status);
    return {
      normalizedStatus,
      amount: result.amount ?? null,
      utr: normalizedStatus === 'success' ? (result.utr || null) : null,
      payerVpa: normalizedStatus === 'success' ? (result.payer_vpa || null) : null,
      raw: result,
    };
  }

  if (gateway === 'Razorpay') {
    const response = await axios.get(`${baseUrl}/api/v1/payments/razorpay/rp-check`, {
      params: { reference_id },
      headers: { 'x-api-key': process.env.RAZORPAY_SHARED_SECRET, 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    });
    const result = response.data;
    const normalizedStatus = normalizeRazorpayStatus(result.razorpay_status || result.status);
    return {
      normalizedStatus,
      amount: result.amount ?? null,
      utr: normalizedStatus === 'success' ? (result.utr || null) : null,
      payerVpa: null,
      raw: result,
    };
  }

  logger.warn('checkPayinStatus called for unsupported gateway', { gateway, reference_id });
  return { normalizedStatus: 'unsupported', amount: null, utr: null, payerVpa: null, raw: null };
}

// --- normalizers (kept identical to payment.controller.js) ---

function normalizeHdfcStatus(hdfcStatus) {
  if (!hdfcStatus) return 'pending';
  const s = String(hdfcStatus).toUpperCase();
  if (s === 'TXN' || s === 'CHARGED') return 'success';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ABORTED', 'ERROR',
    'AUTHORIZATION_FAILED', 'JUSPAY_DECLINED', 'PAYMENT_FAILED'].includes(s)) return 'failed';
  return 'pending';
}

function normalizeRazorpayStatus(rpStatus) {
  if (!rpStatus) return 'pending';
  const s = String(rpStatus).toUpperCase();
  if (s === 'TXN' || s === 'CAPTURED' || s === 'FORWARDED') return 'success';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ERROR', 'EXPIRED'].includes(s)) return 'failed';
  return 'pending';
}

const SUPPORTED_PAYIN_GATEWAYS = Object.freeze(['AirPay', 'HDFC', 'Razorpay']);

module.exports = { checkPayinStatus, SUPPORTED_PAYIN_GATEWAYS };
