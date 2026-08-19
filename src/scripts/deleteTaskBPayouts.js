/**
 * PERMANENTLY DELETE the "Task B" payout objects: the DummyGateway payouts for
 * merchant user_id 50 that were marked FAILED (without refund) on 2026-08-19.
 *
 * ⚠️ HARD DELETE + FINANCIAL RECORDS. This removes payout documents from Mongo
 * entirely — they will no longer appear in any report, reconciliation, or audit.
 * There is NO undo except restoring from the backup this script writes first.
 *
 * ⚠️ MUST BE RUN ON THE PROD SERVER, whose .env points MONGODB_URI at the DB that
 * actually holds these payouts (148.135.136.184 / test). Running it against any
 * other Mongo will do nothing (or delete the wrong data).
 *
 * DRY-RUN by default. It ALWAYS writes a full JSON backup of every matched document
 * (even in dry-run) to ./backups/ before considering a delete. Nothing is deleted
 * until --confirm.
 *
 * Exact selection (cannot be widened by flags — this is a one-time cleanup):
 *   - user.user_id === '50'
 *   - metadata.gateway_name === 'DummyGateway'
 *   - status === 'failed'
 *   - updatedAt in [2026-08-19, 2026-08-20)  (the day Task B ran)
 *   - reference_id NOT in the 42 Task A refs (those were the refunded set — never deleted)
 * This resolves to the 248 Task B objects and nothing else (the 108 payouts failed on
 * earlier dates are excluded by the date window).
 *
 * Usage (on prod):
 *   node src/scripts/deleteTaskBPayouts.js            # DRY RUN + backup, no delete
 *   node src/scripts/deleteTaskBPayouts.js --confirm  # backup, then DELETE
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectMongo } = require('../config/mongoConnect');
const PayoutTransaction = require('../models/payoutTransaction.model');

// The 42 Task A refs — the refunded set. NEVER delete these.
const TASK_A_REFS = new Set([
  'W04AA533C18CC66079BEB3F16','W0570ECD6DE27B24CC747E469','W098CB63CB76DBF6AA009B263',
  'W0A4970310DBFBE5C1B0FA41A','W0BF7ADF161C44C4EA69152C9','W0C3E8DE54654F1B8E0832D4C',
  'W0F06C444E43CC7EC2D4BE24F','W0FD655819C41C8BEB796A593','W12E989A9F3054D414BF18DCB',
  'W1868BA11A1F1359E1CE13D1E','W1BB0325ABA6EA9AB5EFC6B8A','W221116D4CE2A4ED4C4895F9A',
  'W25934C71433ED726B01D0992','W27819E73194DC305E38F9D42','W29E849A73EE186270213C7B0',
  'W31FA1944A30726F2F704DEAC','W3AFEC72B8FAD01A5DF6E8600','W3DC81704CEA1B4AF17F3E4B4',
  'W47FEFB11917BEFE437D5707E','W4A5749AE62D40F4D4BD48767','W4AF1A27274BFD645609D9A5E',
  'W4BCD326C6B36D40D600CEC45','W5B31E2184625238688D952E6','W5EA1380FE23C8D96EE811551',
  'W6B1C6770BD7E6C20786CC947','W7FF66E4AFC0A0514E407B21C','W9129D72B6F4A33FB15CF55DA',
  'W932D00891A29940DF1FF3279','W94FF7E8730476437B2942BB8','WA59CDBF489C72E9FA7585ACE',
  'WA9887A9640A27FADCACEC60B','WB68C03FDE429C4EDFC476A97','WB72A332886DC30239938DDD3',
  'WBF653F9B854B85E1E441F30C','WC18E630E5987509ED575945A','WCEB3BB78B27C0D2C20BF07B5',
  'WD5F715A9974A9442B7DF41E1','WE30C09F0E6A099F00D136332','WEA37DAFD78804392B6CCBED7',
  'WEDA9FFBF5FED3131BF4FD770','WF388723FC5B09F1173E29886','WF748490EC8BC5A36B80EA295',
]);

const WINDOW_FROM = new Date('2026-08-19T00:00:00.000Z');
const WINDOW_TO   = new Date('2026-08-20T00:00:00.000Z');

async function main() {
  const confirm = process.argv.includes('--confirm');

  await connectMongo();

  const query = {
    'user.user_id': '50',
    'metadata.gateway_name': 'DummyGateway',
    status: 'failed',
    updatedAt: { $gte: WINDOW_FROM, $lt: WINDOW_TO },
  };

  let docs = await PayoutTransaction.find(query).lean();
  docs = docs.filter(d => !TASK_A_REFS.has(d.reference_id)); // never touch the refunded 42

  const totalAmount = docs.reduce((s, d) => s + (d.amount || 0), 0);

  // Always write a backup first (even in dry-run) so the delete is recoverable.
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `taskB_payouts_backup_${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));

  console.log('======================================================');
  console.log('  DELETE Task B payout objects (user 50, dummy, failed 2026-08-19)');
  console.log('======================================================');
  console.log(`  Mode:     ${confirm ? 'CONFIRM (WILL DELETE)' : 'DRY RUN (no delete)'}`);
  console.log(`  Matched:  ${docs.length} document(s)`);
  console.log(`  Amount:   ${totalAmount} (sum of amount)`);
  console.log(`  Backup:   ${backupFile}`);
  console.log('------------------------------------------------------');

  if (docs.length === 0) { await mongoose.disconnect(); process.exit(0); }

  if (!confirm) {
    console.log('  DRY RUN — nothing deleted. Backup written above.');
    console.log('  Re-run with --confirm to permanently delete these documents.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const ids = docs.map(d => d._id);
  const res = await PayoutTransaction.deleteMany({ _id: { $in: ids } });
  console.log(`  Deleted: ${res.deletedCount} document(s).`);
  console.log(`  Restore if needed:  mongoimport --uri "<MONGODB_URI>" --collection payouttransactions --file "${backupFile}" --jsonArray`);
  console.log('======================================================');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
