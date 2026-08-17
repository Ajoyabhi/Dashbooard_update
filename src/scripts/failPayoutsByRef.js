/**
 * Reverse a FIXED LIST of COMPLETED DummyGateway payouts to FAILED, refund each
 * payout's OWN merchant settlement wallet, and (optionally) fire a failure callback.
 *
 * This is the per-reference_id sibling of failDummyPayouts.js. Instead of scoping by
 * --user, it operates on the hardcoded REFERENCE_IDS list below. Because the list can
 * span multiple merchants, the refund for each payout is credited to THAT payout's own
 * user (payout.user.user_id) — never a single --user. Mirrors exactly what the per-row
 * "Fail payout" button does (failCompletedDummyPayout in payoutReconciliation.service).
 *
 * ⚠️ MUST BE RUN ON THE PROD SERVER. The refund is written to MySQL (FinancialDetails)
 * via Sequelize using the app's .env — running it anywhere the .env points at a
 * different MySQL/Mongo will corrupt balances. It uses the same prod .env the app uses.
 *
 * ⚠️ DESTRUCTIVE + FINANCIAL. DRY-RUN by default. Nothing changes until --confirm.
 *
 * Safety rails (hardcoded, cannot be widened by flags):
 *   - only status === 'completed'                     (already-failed refs are skipped)
 *   - only metadata.gateway_name === 'DummyGateway'   (real gateways are never touched)
 *   - only reference_ids in the REFERENCE_IDS list    (nothing else can be touched)
 *
 * What it does per matched payout (identical to failDummyPayouts.js):
 *   1. status completed -> failed (guarded: only flips a still-'completed' doc → idempotent)
 *   2. refund settlement += amount + total_charges + gst_amount + platform_fee   (unless --no-refund)
 *   3. TransactionCharges -> failed
 *   4. trace event (LEDGER_UPDATED)
 *   5. POST failed callback to the payout's merchant payout_callback              (unless --no-callback)
 *
 * Usage (on prod):
 *   node src/scripts/failPayoutsByRef.js                    # DRY RUN (audit the list)
 *   node src/scripts/failPayoutsByRef.js --confirm          # EXECUTE
 *   node src/scripts/failPayoutsByRef.js --no-callback --confirm
 *
 * Flags:
 *   --no-refund   skip the settlement refund (status/callback only)
 *   --no-callback skip the merchant failure callback
 *   --limit <n>   cap number processed
 *   --confirm     actually perform the changes (otherwise dry run)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectMongo } = require('../config/mongoConnect');
const { logger } = require('../utils/logger');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { FinancialDetails, TransactionCharges, MerchantDetails } = require('../models');
const { sendMerchantPayoutCallback } = require('../services/payoutReconciliation.service');
const traceSvc = require('../services/transactionTrace.service');
const { recordTraceEvent, STAGES } = traceSvc;

const GATEWAY = 'DummyGateway'; // hardcoded safety rail

// The exact reference_ids to reverse. Deduped from the provided list.
const REFERENCE_IDS = [
  'W6EEFE8FD4699936D52C4CB47',
  'WE400503E2186031134C21D76',
  'WBC923B6A1FDA891A44A3E6D6',
  'W3E28CD501A5449A0524105AA',
  'W39B22BDCDBA179BCBBF7818B',
  'W9D3872AFFE645929AA43D8D1',
  'W726CD3D98B34161D62DE43F6',
  'W38E7D6FD041449801E7D532B',
  'W8DD07F016136247092E4B10F',
  'W620CDF63C6E0E9F5881315FB',
  'WDA91FE95A5A4A64B7FB1CD8A',
  'W722C4EF1E580CB8396C59D29',
  'W461D205C3A4E224296DB1431',
  'W0BED9519391145C854228F4A',
  'W4F48DFFB37384557FF0E0695',
  'W6B9B159249D416D11F088F8A',
  'W51D659F383038C7539EAF770',
  'WE9CA508B00B2501BDEA2D8D7',
  'W991E1D939FAA45FE800533D7',
  'WF1ADA0307F8943AD65336CA0',
  'W1BD27E171FD8A5965CFEC930',
  'W1E8B3C7E5AAD3773342D8085',
  'W3A70992D618D1ECD7A95CC38',
  'WB2434F9A484D7DF091BC2638',
  'WFEC58436C0341F01623CF2AD',
  'WD881AB90EEB49B124058BF81',
  'WD3F6043752B39AA1E9283D84',
  'WC108423306D1842C767D1E35',
  'W58927803B5D595B5548D0640',
];

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { refund: true, callback: true, confirm: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--confirm') o.confirm = true;
    else if (k === '--no-refund') o.refund = false;
    else if (k === '--no-callback') o.callback = false;
    else if (k === '--limit') o.limit = parseInt(a[++i], 10);
    else { console.error(`Unknown arg: ${k}`); process.exit(1); }
  }
  return o;
}

function refundOf(p) {
  return parseFloat((
    parseFloat(p.amount || 0) +
    parseFloat(p.charges?.total_charges || 0) +
    parseFloat(p.gst_amount || 0) +
    parseFloat(p.platform_fee || 0)
  ).toFixed(2));
}

async function main() {
  const o = parseArgs();
  const ids = [...new Set(REFERENCE_IDS)];

  await connectMongo();

  // Pull EVERY doc for these refs (regardless of status/gateway) so the audit can
  // report exactly why anything is skipped. Only completed+dummy are eligible.
  const all = await PayoutTransaction.find({ reference_id: { $in: ids } }).lean();
  const byRef = new Map(all.map(p => [p.reference_id, p]));

  const eligible = [];
  const skips = [];
  for (const id of ids) {
    const p = byRef.get(id);
    if (!p) { skips.push({ id, reason: 'not_found' }); continue; }
    if (p.metadata?.gateway_name !== GATEWAY) { skips.push({ id, reason: `not_dummy(${p.metadata?.gateway_name || 'none'})` }); continue; }
    if (p.status !== 'completed') { skips.push({ id, reason: `not_completed(${p.status})` }); continue; }
    eligible.push(p);
  }

  let docs = eligible.sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
  if (o.limit) docs = docs.slice(0, o.limit);

  const totalRefund = docs.reduce((s, p) => s + refundOf(p), 0);
  const users = [...new Set(docs.map(p => p.user?.user_id))];

  console.log('======================================================');
  console.log('  Fail DummyGateway payouts by reference_id (completed -> failed)');
  console.log('======================================================');
  console.log(`  Mode:      ${o.confirm ? 'CONFIRM (WILL WRITE)' : 'DRY RUN (no changes)'}`);
  console.log(`  Gateway:   ${GATEWAY} (only)`);
  console.log(`  Refund:    ${o.refund ? 'YES (per-payout, to that payout\'s own user)' : 'NO'}`);
  console.log(`  Callback:  ${o.callback ? 'YES (POST failed to merchant)' : 'NO'}`);
  console.log(`  Ref IDs:   ${ids.length} distinct`);
  console.log(`  Eligible:  ${docs.length} payout(s) across user(s): ${users.join(', ') || 'none'}`);
  console.log(`  Skipped:   ${skips.length}`);
  console.log(`  Total refund if applied: ${totalRefund.toFixed(2)}`);
  console.log('------------------------------------------------------');
  if (skips.length) {
    console.log('  Skipped refs:');
    skips.forEach(s => console.log(`    ${s.id} | ${s.reason}`));
    console.log('------------------------------------------------------');
  }

  if (docs.length === 0) { await mongoose.disconnect(); process.exit(0); }

  if (!o.confirm) {
    docs.forEach(p => console.log(`  ${p.reference_id} | user ${p.user?.user_id} | ${p.amount} | refund ${refundOf(p)} | ${new Date(p.createdAt).toISOString()}`));
    console.log('------------------------------------------------------');
    console.log('  DRY RUN — nothing changed. Re-run with --confirm to apply.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const stats = { failed: 0, refunded: 0, refundTotal: 0, callbackSent: 0, skipped: 0, errors: 0 };
  // Cache merchant callback URL per user_id so we don't refetch per payout.
  const callbackCache = new Map();
  async function callbackUrlFor(userId) {
    const key = String(userId);
    if (callbackCache.has(key)) return callbackCache.get(key);
    const m = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
    const url = m?.payout_callback || null;
    callbackCache.set(key, url);
    return url;
  }

  for (const p of docs) {
    const userId = p.user?.user_id;
    try {
      // Idempotent claim: only flip a doc that is still 'completed' AND dummy.
      const claim = await PayoutTransaction.updateOne(
        { reference_id: p.reference_id, status: 'completed', 'metadata.gateway_name': GATEWAY },
        { $set: { status: 'failed', gateway_response: {
          merchant_response: p.gateway_response?.merchant_response || p.transaction_id,
          status: 'failed', message: 'Transaction failed', utr: null,
        } } }
      );
      if (claim.modifiedCount === 0) { stats.skipped++; continue; }
      stats.failed++;

      await TransactionCharges.update({ status: 'failed', transaction_utr: null }, { where: { reference_id: p.reference_id } });

      if (o.refund) {
        const amt = refundOf(p);
        await FinancialDetails.increment('settlement', { by: amt, where: { user_id: parseInt(userId, 10) } });
        stats.refunded++; stats.refundTotal += amt;
      }

      recordTraceEvent({
        reference_id: p.reference_id, trace_type: 'payout', stage: STAGES.LEDGER_UPDATED,
        status: 'failed', source: 'script',
        detail: o.refund ? 'Manual reversal: payout marked failed, settlement refunded' : 'Manual reversal: payout marked failed (no refund)',
        payload: { previous_status: 'completed', script: 'failPayoutsByRef' },
      });

      if (o.callback) {
        const callbackUrl = await callbackUrlFor(userId);
        if (callbackUrl) {
          const sent = await sendMerchantPayoutCallback(callbackUrl, {
            reference_id: p.reference_id, type: 'payout', status: 'failed',
            amount: p.amount, utr: null, message: 'Transaction failed', timestamp: new Date().toISOString(),
          });
          if (sent) stats.callbackSent++;
        }
      }
      console.log(`  OK ${p.reference_id} | user ${userId} | failed${o.refund ? ` | refunded ${refundOf(p)}` : ''}`);
    } catch (err) {
      stats.errors++;
      logger.error('failPayoutsByRef: error processing payout', { reference_id: p.reference_id, error: err.message });
      console.error(`  ERROR ${p.reference_id}: ${err.message}`);
    }
  }

  console.log('------------------------------------------------------');
  console.log(`  Done. failed=${stats.failed} refunded=${stats.refunded} refundTotal=${stats.refundTotal.toFixed(2)} callbackSent=${stats.callbackSent} skipped=${stats.skipped} errors=${stats.errors}`);
  console.log('======================================================');

  // Flush buffered journey events BEFORE closing the connection (trace buffer flushes
  // on a 1s unref'd timer that won't fire before we exit).
  try { await traceSvc._flush(); } catch (_) {}
  await new Promise((r) => setTimeout(r, 500));
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
