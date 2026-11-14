const mongoose = require('mongoose');

/**
 * Sandbox (API Playground) transactions.
 *
 * Kept in their OWN collection, completely separate from PayinTransaction /
 * PayoutTransaction, so playground traffic can never reach live reports,
 * settlement, wallet balances, commissions or reconciliation jobs. No gateway
 * is ever called for these records and no money moves.
 *
 * Documents expire automatically after SANDBOX_TTL_DAYS.
 */
const SANDBOX_TTL_DAYS = 7;

const callbackAttemptSchema = new mongoose.Schema({
  attempt: Number,
  status_code: { type: Number, default: null },
  error: { type: String, default: null },
  response_snippet: { type: String, default: null },
  latency_ms: Number,
  at: { type: Date, default: Date.now }
}, { _id: false });

const sandboxTransactionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { type: String, enum: ['payin', 'payout'], required: true },
  reference_id: { type: String, required: true },
  transaction_id: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' },
  // Outcome the merchant asked the sandbox to simulate.
  requested_outcome: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  utr: { type: String, default: null },
  request_body: { type: mongoose.Schema.Types.Mixed, default: {} },
  callback: {
    url: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    delivered: { type: Boolean, default: false },
    attempts: { type: [callbackAttemptSchema], default: [] },
    last_attempt_at: { type: Date, default: null }
  },
  finalized_at: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'sandbox_transactions'
});

sandboxTransactionSchema.index({ user_id: 1, type: 1, reference_id: 1 }, { unique: true });
sandboxTransactionSchema.index({ user_id: 1, createdAt: -1 });
sandboxTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: SANDBOX_TTL_DAYS * 24 * 60 * 60 });

const SandboxTransaction = mongoose.model('SandboxTransaction', sandboxTransactionSchema);

module.exports = SandboxTransaction;
module.exports.SANDBOX_TTL_DAYS = SANDBOX_TTL_DAYS;
