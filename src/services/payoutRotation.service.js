'use strict';

const PayoutRotationState = require('../models/payoutRotationState.model');
const { logger } = require('../utils/logger');

/**
 * Stable key for a rotation pool + run-length. Baking the config into the
 * counter key means a config change starts a fresh sequence rather than
 * reinterpreting an in-flight run. e.g. ['BluSwap','Mizorpay'], 3 -> "BluSwap>Mizorpay@3".
 */
function poolKeyFor(pool, rotateEvery) {
  return `${pool.join('>')}@${rotateEvery}`;
}

/**
 * Advance the per-(user, amount) rotation counter one step and return the
 * gateway this payout should use.
 *
 * The counter is bumped with an atomic `$inc`, so N concurrent payouts of the
 * same amount get N distinct sequence numbers and therefore consistent,
 * non-overlapping gateway assignments — every dispatch consumes exactly one
 * slot regardless of whether it later succeeds or fails.
 *
 * @param {{ userId: string|number, amount: number|string, pool: string[], rotateEvery: number }} args
 * @returns {Promise<{ gateway: string, index: number, seq: number, poolKey: string, detail: string }>}
 */
async function applyAmountRotation({ userId, amount, pool, rotateEvery }) {
  const len = pool.length;
  const runLength = Math.max(1, parseInt(rotateEvery, 10) || 1);
  const poolKey = poolKeyFor(pool, runLength);
  const filter = { user_id: String(userId), amount: Number(amount), poolKey };

  // Atomic bump. Rare first-insert races on the unique index surface as E11000;
  // one retry resolves them because the document then already exists.
  let doc;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      doc = await PayoutRotationState.findOneAndUpdate(
        filter,
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      break;
    } catch (err) {
      if (err && err.code === 11000 && attempt === 0) continue;
      throw err;
    }
  }

  const n = doc.seq - 1;                               // 0-based dispatch index
  const index = Math.floor(n / runLength) % len;       // which gateway in the pool
  const gateway = pool[index];

  // Best-effort trace fields; not part of the atomic step, so ignore failures.
  PayoutRotationState.updateOne(filter, { $set: { last_gateway: gateway, last_index: index } })
    .catch((e) => logger.warn('rotation trace update failed', { error: e.message }));

  const slotInRun = (n % runLength) + 1;               // 1..runLength within this gateway's run
  const detail = `Rotation pool [${pool.join(', ')}] every ${runLength}: seq #${doc.seq} -> ${gateway} (${slotInRun}/${runLength} of its run)`;

  return { gateway, index, seq: doc.seq, poolKey, detail };
}

module.exports = { applyAmountRotation, poolKeyFor };
