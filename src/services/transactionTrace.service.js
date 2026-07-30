const TransactionEvent = require('../models/transactionEvent.model');
const { logger } = require('../utils/logger');

/**
 * The single seam for recording a payment's journey (payin + payout).
 *
 * Every checkpoint in the codebase calls `recordTraceEvent(...)` and never cares
 * how it is persisted. Today that is a BATCHED, fire-and-forget insert: events
 * are buffered in-process and flushed via insertMany on a size/time threshold,
 * so the payment path is never blocked and a trace failure can never fail a
 * transaction. If volume ever demands it, this one file can be swapped to push
 * onto a Redis/Bull queue with zero changes at any call site.
 */

// Canonical lifecycle stages, shared by payin and payout so the timeline reads
// consistently regardless of flow.
const STAGES = Object.freeze({
  INITIATED: 'INITIATED',                       // request received
  VALIDATED: 'VALIDATED',                        // validation / IP / duplicate checks passed
  GATEWAY_REQUEST: 'GATEWAY_REQUEST',            // outbound call to the gateway (was ApiLogs)
  GATEWAY_RESPONSE: 'GATEWAY_RESPONSE',          // gateway replied
  CALLBACK_RECEIVED: 'CALLBACK_RECEIVED',        // inbound gateway callback (was GatewayCallbackLog)
  QUEUED: 'QUEUED',                              // enqueued to a Bull queue for async processing
  LEDGER_UPDATED: 'LEDGER_UPDATED',              // wallet credit (payin) / refund-on-failure (payout) + status change
  MERCHANT_CALLBACK_ATTEMPT: 'MERCHANT_CALLBACK_ATTEMPT', // POST to the merchant's callback URL
  MERCHANT_CALLBACK_SENT: 'MERCHANT_CALLBACK_SENT',       // merchant acked
  MERCHANT_CALLBACK_FAILED: 'MERCHANT_CALLBACK_FAILED',   // gave up after retries
  RECONCILED: 'RECONCILED',                      // status resolved by a reconcile / status-check path
  REJECTED: 'REJECTED',                          // terminal failure at our side (validation, unsupported gateway, ...)
});

// Header keys that must never be persisted (they carry shared secrets).
const REDACTED_HEADERS = new Set(['x-api-key', 'authorization', 'cookie', 'signature', 'access_key', 'api-key']);
// Body/query keys whose values are sensitive and must be masked.
const SENSITIVE_KEYS = new Set([
  'account_number', 'account', 'bank_account_number', 'number',
  'token', 'secret', 'api_key', 'apikey', 'password', 'aeskey', 'aesiv',
]);
const MAX_PAYLOAD_BYTES = 8 * 1024; // cap a single event's payload snapshot

// Mask an account/card-like value, keeping only the last 4 chars for support.
function maskValue(v) {
  const s = String(v);
  if (s.length <= 4) return 'XXXX';
  return 'XXXXXX' + s.slice(-4);
}

// Best-effort deep redaction + size cap. Never throws.
function sanitizePayload(payload) {
  if (payload == null) return null;
  try {
    const seen = new WeakSet();
    const walk = (val) => {
      if (val == null || typeof val !== 'object') return val;
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (Array.isArray(val)) return val.map(walk);
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        const lk = k.toLowerCase();
        if (REDACTED_HEADERS.has(lk)) out[k] = '[REDACTED]';
        else if (SENSITIVE_KEYS.has(lk)) out[k] = maskValue(v);
        else out[k] = walk(v);
      }
      return out;
    };
    let clean = walk(payload);
    let json = JSON.stringify(clean);
    if (json.length > MAX_PAYLOAD_BYTES) {
      clean = { _truncated: true, preview: json.slice(0, MAX_PAYLOAD_BYTES) };
    }
    return clean;
  } catch (err) {
    return { _unserializable: true, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Batched, fire-and-forget buffer.
// ---------------------------------------------------------------------------
const FLUSH_SIZE = 200;      // flush once this many events are buffered
const FLUSH_INTERVAL_MS = 1000;
let buffer = [];
let flushTimer = null;

async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await TransactionEvent.insertMany(batch, { ordered: false });
  } catch (err) {
    // Never surface a trace-write failure to the payment path.
    logger.error('Failed to flush transaction trace events', { count: batch.length, error: err.message });
  }
}

function scheduleFlush() {
  if (buffer.length >= FLUSH_SIZE) {
    flush();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
    if (flushTimer.unref) flushTimer.unref(); // don't keep the process alive just for a flush
  }
}

/**
 * Record one checkpoint in a transaction's journey. Fire-and-forget: returns
 * immediately, never awaits the DB, never throws.
 *
 * @param {Object} e
 * @param {string} e.reference_id   correlation id (required; silently dropped if missing)
 * @param {'payin'|'payout'} e.trace_type
 * @param {string} e.stage          one of STAGES
 * @param {'ok'|'pending'|'failed'|'info'} [e.status]
 * @param {'api'|'worker'|'gateway_callback'|'reconcile'|'admin'} [e.source]
 * @param {string} [e.gateway_name]
 * @param {{method?:string,url?:string,status_code?:number}} [e.http]
 * @param {number} [e.latency_ms]
 * @param {number} [e.attempt]
 * @param {string} [e.detail]
 * @param {Object} [e.payload]      redacted + capped before storage
 * @param {string} [e.error]
 * @param {Date}   [e.ts]
 */
function recordTraceEvent(e = {}) {
  try {
    if (!e.reference_id || !e.trace_type || !e.stage) return; // nothing to correlate on
    buffer.push({
      reference_id: String(e.reference_id),
      trace_type: e.trace_type,
      stage: e.stage,
      status: e.status || 'info',
      source: e.source || 'api',
      gateway_name: e.gateway_name || null,
      http: {
        method: e.http?.method || null,
        url: e.http?.url || null,
        status_code: e.http?.status_code ?? null,
      },
      latency_ms: e.latency_ms ?? null,
      attempt: e.attempt ?? null,
      detail: e.detail || null,
      payload: sanitizePayload(e.payload),
      error: e.error || null,
      ts: e.ts || new Date(),
    });
    scheduleFlush();
  } catch (err) {
    // Absolutely never let tracing break a payment.
    logger.error('recordTraceEvent failed', { error: err.message });
  }
}

/**
 * Read one transaction's full ordered journey. Forces a flush first so a trace
 * requested immediately after an event still includes it.
 *
 * @param {string} referenceId
 * @returns {Promise<Array>} events ordered oldest → newest
 */
async function getTransactionTrace(referenceId) {
  await flush();
  return TransactionEvent.find({ reference_id: String(referenceId) })
    .sort({ ts: 1, createdAt: 1 })
    .lean();
}

module.exports = {
  STAGES,
  recordTraceEvent,
  getTransactionTrace,
  sanitizePayload, // exported for tests
  _flush: flush,   // exported for graceful shutdown / tests
};
