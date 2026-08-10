'use strict';

const PayoutRotationState = require('../models/payoutRotationState.model');
const { logger } = require('../utils/logger');

/**
 * Stable key for a rotation pattern. Baking the config into the counter key
 * means a config change starts a fresh sequence rather than reinterpreting an
 * in-flight run. e.g. [{A,3},{B,1}] -> "A:3>B:1".
 */
function patternKeyFor(rotation) {
  return rotation.map((e) => `${e.gateway}:${e.times}`).join('>');
}

/**
 * Expand a per-gateway rotation pattern into the flat cycle it repeats, e.g.
 * [{A,3},{B,1}] -> ['A','A','A','B']. The concrete gateway for dispatch n is
 * simply cycle[n % cycle.length].
 */
function buildCycle(rotation) {
  const cycle = [];
  for (const e of rotation) {
    const times = Math.max(1, parseInt(e.times, 10) || 1);
    for (let i = 0; i < times; i++) cycle.push(e.gateway);
  }
  return cycle;
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
 * @param {{ userId: string|number, amount: number|string,
 *           rotation: Array<{gateway: string, times: number}> }} args
 * @returns {Promise<{ gateway: string, index: number, seq: number, poolKey: string, detail: string }>}
 */
async function applyAmountRotation({ userId, amount, rotation }) {
  const cycle = buildCycle(rotation);
  const cycleLen = cycle.length;
  const poolKey = patternKeyFor(rotation);
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

  const n = doc.seq - 1;                 // 0-based dispatch index
  const posInCycle = n % cycleLen;       // where we are within one full pattern
  const gateway = cycle[posInCycle];

  // Best-effort trace fields; not part of the atomic step, so ignore failures.
  PayoutRotationState.updateOne(filter, { $set: { last_gateway: gateway, last_index: posInCycle } })
    .catch((e) => logger.warn('rotation trace update failed', { error: e.message }));

  const pattern = rotation.map((e) => `${e.gateway}×${e.times}`).join(', ');
  const detail = `Rotation [${pattern}] (cycle ${cycle.join('')}): seq #${doc.seq} -> ${gateway} (pos ${posInCycle + 1}/${cycleLen})`;

  return { gateway, index: posInCycle, seq: doc.seq, poolKey, detail };
}

module.exports = { applyAmountRotation, patternKeyFor, buildCycle };
