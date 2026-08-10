const mongoose = require('mongoose');

/**
 * Per-(user, amount) rotation counter for pool-based payout gateway routing.
 *
 * When a matched amount band defines a rotation pool (multiple gateways +
 * `rotateEvery`), we give each gateway a run of `rotateEvery` consecutive
 * payouts of the *same amount* before switching to the next gateway in the
 * pool, wrapping around. The whole rotation is driven by a single monotonic
 * `seq`, atomically bumped with `$inc` so concurrent payouts of the same amount
 * never collide or double-count:
 *
 *   n     = seq - 1                       // 0-based index of this dispatch
 *   index = floor(n / rotateEvery) % len  // which gateway in the pool
 *
 * so seq 1..A -> pool[0], A+1..2A -> pool[1], … (A = rotateEvery).
 *
 * `poolKey` encodes the pool + run-length (`GwA>GwB@3`). Baking it into the key
 * means changing the admin config starts a fresh, independent sequence instead
 * of reinterpreting an in-flight counter mid-run.
 */
const payoutRotationStateSchema = new mongoose.Schema({
  // SQL user id, stored as string to match how it is persisted elsewhere.
  user_id: { type: String, required: true },
  amount: { type: Number, required: true },
  poolKey: { type: String, required: true },
  seq: { type: Number, default: 0 },
  // Best-effort trace fields (not used for the routing math).
  last_gateway: { type: String, default: null },
  last_index: { type: Number, default: null },
}, {
  timestamps: true,
});

// One counter document per distinct (user, amount, pool config).
payoutRotationStateSchema.index({ user_id: 1, amount: 1, poolKey: 1 }, { unique: true });

module.exports = mongoose.model('PayoutRotationState', payoutRotationStateSchema);
