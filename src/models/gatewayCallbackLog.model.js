const mongoose = require('mongoose');

/**
 * Verbatim record of every inbound payment-gateway callback (HDFC, Razorpay,
 * AirPay, ...). We store the payload exactly as received — BEFORE any of our
 * normalization — so failed transactions can be investigated and the real
 * failure reason surfaced to admin/user.
 *
 * This is an append-only audit log; it is never the source of truth for wallet
 * balances (that stays with PayinTransaction).
 */
const gatewayCallbackLogSchema = new mongoose.Schema(
  {
    gateway: { type: String, required: true, index: true }, // 'hdfc' | 'razorpay' | 'airpay'
    reference_id: { type: String, index: true },
    http_method: String,
    status_raw: String, // exact status value the gateway sent
    mapped_status: String, // our interpretation: 'completed' | 'failed'
    failure_reason: String, // best-effort extracted reason (null if none found)
    headers: mongoose.Schema.Types.Mixed, // secrets redacted
    query: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed, // the raw payload, AS-IS
  },
  { timestamps: true }
);

gatewayCallbackLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('GatewayCallbackLog', gatewayCallbackLogSchema);
