/**
 * READ-ONLY diagnostic. Dumps a payin transaction's stored record plus its full
 * event timeline (transactionEvent collection) so you can see exactly when and by
 * what it was marked failed. Makes NO writes.
 *
 * Usage:
 *   node src/scripts/inspectPayinTrace.js <reference_id> [reference_id2 ...]
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const PayinTransaction = require('../models/payinTransaction.model');
const TransactionEvent = require('../models/transactionEvent.model');

async function main() {
  const refs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (refs.length === 0) {
    console.error('Usage: node src/scripts/inspectPayinTrace.js <reference_id> [reference_id2 ...]');
    process.exit(1);
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri);

  for (const ref of refs) {
    console.log('\n============================================================');
    console.log(`  reference_id: ${ref}`);
    console.log('============================================================');

    const txn = await PayinTransaction.findOne({ reference_id: ref }).lean();
    if (!txn) {
      console.log('  >>> No PayinTransaction found for this reference_id.');
    } else {
      console.log('  STORED RECORD:');
      console.log(`    status:        ${txn.status}`);
      console.log(`    gateway_name:  ${txn.metadata?.gateway_name}`);
      console.log(`    amount:        ${txn.amount}`);
      console.log(`    user.user_id:  ${txn.user?.user_id}`);
      console.log(`    createdAt:     ${txn.createdAt?.toISOString?.() || txn.createdAt}`);
      console.log(`    updatedAt:     ${txn.updatedAt?.toISOString?.() || txn.updatedAt}`);
      console.log(`    callback_received_at: ${txn.metadata?.callback_received_at || 'null'}`);
      console.log(`    gateway_response:`);
      console.log(`      status:        ${txn.gateway_response?.status}`);
      console.log(`      message:       ${txn.gateway_response?.message}`);
      console.log(`      failure_reason:${txn.gateway_response?.failure_reason}`);
      console.log(`      utr:           ${txn.gateway_response?.utr}`);
    }

    const events = await TransactionEvent.find({ reference_id: ref }).sort({ ts: 1, createdAt: 1 }).lean();
    console.log(`\n  TIMELINE (${events.length} event(s)):`);
    if (events.length === 0) {
      console.log('    (no trace events recorded)');
    }
    for (const e of events) {
      const when = (e.ts || e.createdAt)?.toISOString?.() || e.ts || e.createdAt;
      console.log(
        `    ${when} | ${String(e.stage).padEnd(24)} | ${String(e.status).padEnd(8)} | ` +
        `src=${String(e.source || '-').padEnd(7)} | gw=${e.gateway_name || '-'}`
      );
      if (e.detail) console.log(`        detail: ${e.detail}`);
      if (e.error)  console.log(`        error:  ${e.error}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
