/**
 * Best-effort extraction of a human-readable failure reason from a raw gateway
 * callback body. Different acquirers use different field names, and we don't yet
 * know exactly what HDFC / Razorpay send on failure — so this scans a
 * prioritized list of common keys at the top level and one level deep.
 *
 * Once the real payloads are captured (see GatewayCallbackLog) this list can be
 * tuned to the exact fields each gateway uses.
 *
 * @param {object} body - parsed callback payload
 * @returns {string|null}
 */
const REASON_KEYS = [
  'failure_reason', 'failureReason',
  'error_description', 'error_reason', 'error_message', 'errorMessage',
  'decline_reason', 'declineReason',
  'response_message', 'bank_message', 'status_message', 'statusMessage',
  'reason', 'remark', 'remarks', 'description', 'message',
  'error_code', 'errorCode', 'response_code',
];

const NESTED_PARENTS = ['error', 'data', 'payment', 'response', 'result', 'payload', 'gateway_response'];

function pickReason(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of REASON_KEYS) {
    const val = obj[key];
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  return null;
}

function extractFailureReason(body) {
  if (!body || typeof body !== 'object') return null;

  const direct = pickReason(body);
  if (direct) return direct;

  for (const parent of NESTED_PARENTS) {
    const nested = pickReason(body[parent]);
    if (nested) return nested;
  }

  return null;
}

module.exports = { extractFailureReason, REASON_KEYS };
