/**
 * Reverse COMPLETED DummyGateway payouts to FAILED for a given merchant, refund the
 * merchant's settlement wallet, and (optionally) fire a failure callback.
 *
 * ⚠️ MUST BE RUN ON THE PROD SERVER. The refund is written to MySQL (FinancialDetails)
 * via Sequelize using the app's .env — running it anywhere the .env points at a
 * different MySQL/Mongo will corrupt balances. It uses the same prod .env the app uses.
 *
 * ⚠️ DESTRUCTIVE + FINANCIAL. DRY-RUN by default. Nothing changes until --confirm.
 *
 * Safety rails (hardcoded, cannot be widened by flags):
 *   - only status === 'completed'
 *   - only metadata.gateway_name === 'DummyGateway'   (real gateways are never touched)
 *   - --user is REQUIRED (no unscoped runs)
 *
 * What it does per matched payout (mirrors finalizePayout's failure branch, which
 * refuses already-completed txns — hence this dedicated reversal):
 *   1. status completed -> failed (guarded: only flips a still-'completed' doc → idempotent)
 *   2. refund settlement += amount + total_charges + gst_amount + platform_fee   (unless --no-refund)
 *   3. TransactionCharges -> failed
 *   4. trace event (LEDGER_UPDATED)
 *   5. POST failed callback to merchant's payout_callback                         (unless --no-callback)
 *
 * Usage (on prod):
 *   node src/scripts/failDummyPayouts.js --user 50                       # DRY RUN (all dummy completed)
 *   node src/scripts/failDummyPayouts.js --user 50 --from 2026-08-12     # DRY RUN, only from this date
 *   node src/scripts/failDummyPayouts.js --user 50 --confirm             # EXECUTE
 *   node src/scripts/failDummyPayouts.js --user 50 --no-callback --confirm
 *
 * Flags:
 *   --user <id>   REQUIRED merchant user_id (e.g. 50)
 *   --from <d>    only payouts createdAt >= d (any Date-parseable string)
 *   --to <d>      only payouts createdAt <= d
 *   --limit <n>   cap number processed
 *   --no-refund   skip the settlement refund (status/callback only)
 *   --no-callback skip the merchant failure callback
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

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { refund: true, callback: true, confirm: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--confirm') o.confirm = true;
    else if (k === '--no-refund') o.refund = false;
    else if (k === '--no-callback') o.callback = false;
    else if (k === '--user') o.user = a[++i];
    else if (k === '--from') o.from = a[++i];
    else if (k === '--to') o.to = a[++i];
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
  if (!o.user) {
    console.error('Error: --user <merchant user_id> is required.');
    process.exit(1);
  }

  const query = { 'user.user_id': String(o.user), status: 'completed', 'metadata.gateway_name': GATEWAY };
  if (o.from || o.to) {
    query.createdAt = {};
    if (o.from) query.createdAt.$gte = new Date(o.from);
    if (o.to) query.createdAt.$lte = new Date(o.to);
  }

  await connectMongo();

  let docs = await PayoutTransaction.find(query).sort({ createdAt: 1 }).lean();
  if (o.limit) docs = docs.slice(0, o.limit);

  const totalRefund = docs.reduce((s, p) => s + refundOf(p), 0);

  console.log('======================================================');
  console.log('  Fail DummyGateway payouts (completed -> failed)');
  console.log('======================================================');
  console.log(`  Mode:      ${o.confirm ? 'CONFIRM (WILL WRITE)' : 'DRY RUN (no changes)'}`);
  console.log(`  Merchant:  user_id ${o.user}`);
  console.log(`  Gateway:   ${GATEWAY} (only)`);
  console.log(`  Date:      ${o.from || 'any'} -> ${o.to || 'any'}`);
  console.log(`  Refund:    ${o.refund ? 'YES (settlement += amount+charges+gst+pf)' : 'NO'}`);
  console.log(`  Callback:  ${o.callback ? 'YES (POST failed to merchant)' : 'NO'}`);
  console.log(`  Matched:   ${docs.length} payout(s)`);
  console.log(`  Total refund if applied: ${totalRefund.toFixed(2)}`);
  console.log('------------------------------------------------------');

  if (docs.length === 0) { await mongoose.disconnect(); process.exit(0); }

  if (!o.confirm) {
    docs.slice(0, 10).forEach(p => console.log(`  ${p.reference_id} | ${p.amount} | refund ${refundOf(p)} | ${new Date(p.createdAt).toISOString()}`));
    if (docs.length > 10) console.log(`  ... and ${docs.length - 10} more`);
    console.log('------------------------------------------------------');
    console.log('  DRY RUN — nothing changed. Re-run with --confirm to apply.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const stats = { failed: 0, refunded: 0, refundTotal: 0, callbackSent: 0, skipped: 0, errors: 0 };
  const merchant = o.callback ? await MerchantDetails.findOne({ where: { user_id: parseInt(o.user, 10) } }) : null;
  const callbackUrl = merchant?.payout_callback || null;

  for (const p of docs) {
    try {
      // Idempotent claim: only flip a doc that is still 'completed'.
      const claim = await PayoutTransaction.updateOne(
        { reference_id: p.reference_id, status: 'completed' },
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
        await FinancialDetails.increment('settlement', { by: amt, where: { user_id: parseInt(o.user, 10) } });
        stats.refunded++; stats.refundTotal += amt;
      }

      recordTraceEvent({
        reference_id: p.reference_id, trace_type: 'payout', stage: STAGES.LEDGER_UPDATED,
        status: 'failed', source: 'script',
        detail: o.refund ? 'Manual reversal: payout marked failed, settlement refunded' : 'Manual reversal: payout marked failed (no refund)',
        payload: { previous_status: 'completed', script: 'failDummyPayouts' },
      });

      if (o.callback && callbackUrl) {
        const sent = await sendMerchantPayoutCallback(callbackUrl, {
          reference_id: p.reference_id, type: 'payout', status: 'failed',
          amount: p.amount, utr: null, message: 'Transaction failed', timestamp: new Date().toISOString(),
        });
        if (sent) stats.callbackSent++;
      }
    } catch (err) {
      stats.errors++;
      logger.error('failDummyPayouts: error processing payout', { reference_id: p.reference_id, error: err.message });
      console.error(`  ERROR ${p.reference_id}: ${err.message}`);
    }
  }

  console.log(`  Done. failed=${stats.failed} refunded=${stats.refunded} refundTotal=${stats.refundTotal.toFixed(2)} callbackSent=${stats.callbackSent} skipped=${stats.skipped} errors=${stats.errors}`);
  if (o.callback && !callbackUrl) console.log('  NOTE: merchant has no payout_callback URL — no callbacks sent.');
  console.log('======================================================');

  // Flush buffered journey events BEFORE closing the connection, otherwise the
  // reversal's LEDGER_UPDATED / MERCHANT_CALLBACK_SENT events are lost (the trace
  // buffer flushes on a 1s unref'd timer that won't fire before we exit).
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
