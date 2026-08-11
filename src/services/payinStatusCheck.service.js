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
    // Read the AUTHORITATIVE `airpay_status`, NOT the derived `status` (which is
    // "TXN" for successes and cannot be trusted for failures — same trap as HDFC).
    const normalizedStatus = normalizeAirpayStatus(result.airpay_status);
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
    // Read the AUTHORITATIVE `hdfc_status`, NOT the derived `status`. The upstream
    // pg-check service sets `status: "TXN"` for BOTH real successes (hdfc_status
    // CHARGED) and non-successes (hdfc_status FORWARDED), so `status` cannot be
    // trusted to credit money.
    const normalizedStatus = normalizeHdfcStatus(result.hdfc_status);
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
    // Read the AUTHORITATIVE `razorpay_status` (CAPTURED = paid). NEVER fall back to
    // the derived `status`, which is "TXN" even for some captured/failed states.
    const normalizedStatus = normalizeRazorpayStatus(result.razorpay_status);
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

// --- normalizers (read the AUTHORITATIVE per-gateway status, never the derived `status`) ---

// AirPay's real `airpay_status`. Success only on SUCCESS (carries a UTR).
function normalizeAirpayStatus(apStatus) {
  if (!apStatus) return 'pending';
  const s = String(apStatus).toUpperCase();
  if (s === 'SUCCESS' || s === 'TXN' || s === 'CHARGED') return 'success';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ABORTED', 'ERROR', 'EXPIRED', 'DECLINED'].includes(s)) return 'failed';
  return 'pending';
}

// Maps HDFC/Juspay's real `hdfc_status`. ONLY `CHARGED` (money actually captured,
// carries a real UTR) is a success. `FORWARDED` is NOT a success — it's the value
// that was being mis-reported as TXN/success and caused failed payins to look paid.
function normalizeHdfcStatus(hdfcStatus) {
  if (!hdfcStatus) return 'pending';
  const s = String(hdfcStatus).toUpperCase();
  if (s === 'CHARGED' || s === 'SUCCESS') return 'success';
  if (['FORWARDED', 'FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ABORTED', 'ERROR',
    'AUTHORIZATION_FAILED', 'JUSPAY_DECLINED', 'PAYMENT_FAILED', 'DECLINED'].includes(s)) return 'failed';
  return 'pending';
}

// Maps Razorpay's real `razorpay_status`. ONLY `CAPTURED` (money captured, carries
// a UTR) is a success — NOT the derived `TXN`, and NOT `FORWARDED`.
function normalizeRazorpayStatus(rpStatus) {
  if (!rpStatus) return 'pending';
  const s = String(rpStatus).toUpperCase();
  if (s === 'CAPTURED' || s === 'SUCCESS') return 'success';
  if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ERROR', 'EXPIRED', 'DECLINED'].includes(s)) return 'failed';
  return 'pending';
}

const SUPPORTED_PAYIN_GATEWAYS = Object.freeze(['AirPay', 'HDFC', 'Razorpay']);

module.exports = { checkPayinStatus, SUPPORTED_PAYIN_GATEWAYS };
