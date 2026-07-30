const mongoose = require('mongoose');

/**
 * Append-only, per-transaction event timeline — the "journey" of a single
 * payment (payin OR payout) from initiation through every gateway hop and
 * callback to the final merchant notification.
 *
 * Correlation key is `reference_id`, the same id used across Mongo, MySQL, the
 * Bull queues and every inbound/outbound callback, so a whole journey is a
 * single `find({ reference_id }).sort({ ts: 1 })`.
 *
 * This is observability only — NEVER a source of truth for balances or status
 * (those stay with PayinTransaction / PayoutTransaction / FinancialDetails).
 *
 * It is the single consolidated store for the whole payment journey: it replaces
 * the old write-only ApiLogs (outbound gateway calls) and GatewayCallbackLog
 * (inbound gateway callbacks). Each event therefore carries its own small,
 * REDACTED, size-capped `payload` snapshot rather than pointing at a separate log.
 */
const transactionEventSchema = new mongoose.Schema(
  {
    reference_id: { type: String, required: true, index: true },
    trace_type: { type: String, enum: ['payin', 'payout'], required: true },

    // Where we are in the lifecycle (see STAGES in transactionTrace.service.js).
    stage: { type: String, required: true },
    // Outcome of this checkpoint.
    status: { type: String, enum: ['ok', 'pending', 'failed', 'info'], default: 'info' },

    // What produced the event.
    source: { type: String, enum: ['api', 'worker', 'gateway_callback', 'reconcile', 'admin'], default: 'api' },
    gateway_name: { type: String, default: null },

    // Optional HTTP context for request/response/callback checkpoints.
    http: {
      method: { type: String, default: null },
      url: { type: String, default: null },
      status_code: { type: Number, default: null },
    },

    latency_ms: { type: Number, default: null }, // duration of the step, when measurable
    attempt: { type: Number, default: null },    // for retried merchant webhooks

    detail: { type: String, default: null },     // short human-readable message
    payload: { type: mongoose.Schema.Types.Mixed, default: null }, // small, REDACTED, size-capped snapshot
    error: { type: String, default: null },

    // Explicit event timestamp (we sort on this, not createdAt, so callers can
    // backfill historical events with a real time).
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Primary access pattern: one transaction's ordered timeline.
transactionEventSchema.index({ reference_id: 1, ts: 1 });

module.exports = mongoose.model('TransactionEvent', transactionEventSchema);
