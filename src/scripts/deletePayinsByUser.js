/**
 * Delete PayinTransaction records for one or more users from MongoDB.
 *
 * SAFETY: this is DESTRUCTIVE and PERMANENT. It runs in DRY-RUN mode by default —
 * it will only show you what WOULD be deleted. Nothing is removed until you
 * re-run the exact same command with the `--confirm` flag.
 *
 * Matching is an EXACT match on `user.user_id` (never a partial/regex match), so
 * passing `3` deletes only user "3", not "30" / "13" / etc.
 *
 * Usage:
 *   # Dry run (safe) — see the impact first
 *   node src/scripts/deletePayinsByUser.js 30
 *   node src/scripts/deletePayinsByUser.js 30 32 45
 *   node src/scripts/deletePayinsByUser.js 30,32,45
 *
 *   # Narrow to certain statuses (optional)
 *   node src/scripts/deletePayinsByUser.js 30 --status failed
 *   node src/scripts/deletePayinsByUser.js 30 --status failed,payin_qr_generated
 *
 *   # Actually delete (only after reviewing the dry run)
 *   node src/scripts/deletePayinsByUser.js 30 --confirm
 *
 * Flags:
 *   --status   optional; comma-separated subset of:
 *              pending | completed | failed | payin_qr_generated
 *   --confirm  perform the deletion. Without it, the script only reports.
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const PayinTransaction = require('../models/payinTransaction.model');

const VALID_STATUSES = ['pending', 'completed', 'failed', 'payin_qr_generated'];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { userIds: [], statuses: null, confirm: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--confirm') {
      opts.confirm = true;
    } else if (arg === '--status') {
      const val = args[i + 1];
      i++;
      if (val) {
        opts.statuses = val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (arg.startsWith('--')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else {
      // Positional user id(s): allow space- or comma-separated.
      arg.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => opts.userIds.push(id));
    }
  }

  // De-duplicate, keep as strings (user.user_id is a String in the schema).
  opts.userIds = [...new Set(opts.userIds.map(String))];
  return opts;
}

async function main() {
  const opts = parseArgs();

  if (opts.userIds.length === 0) {
    console.error('Error: provide at least one user id.');
    console.error('Usage: node src/scripts/deletePayinsByUser.js <userId> [userId2 ...] [--status s1,s2] [--confirm]');
    process.exit(1);
  }

  if (opts.statuses) {
    const invalid = opts.statuses.filter((s) => !VALID_STATUSES.includes(s));
    if (invalid.length) {
      console.error(`Error: invalid status value(s): ${invalid.join(', ')}`);
      console.error(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
      process.exit(1);
    }
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGODB_URI is not set in the environment.');
    process.exit(1);
  }

  // Exact match on user.user_id; optional status narrowing.
  const query = { 'user.user_id': { $in: opts.userIds } };
  if (opts.statuses) {
    query.status = { $in: opts.statuses };
  }

  await mongoose.connect(mongoUri);

  try {
    const total = await PayinTransaction.countDocuments(query);

    console.log('======================================================');
    console.log('  Delete Payin Transactions by User');
    console.log('======================================================');
    console.log(`  Mode:      ${opts.confirm ? 'CONFIRM (will delete)' : 'DRY RUN (no changes)'}`);
    console.log(`  User IDs:  ${opts.userIds.join(', ')}`);
    console.log(`  Statuses:  ${opts.statuses ? opts.statuses.join(', ') : 'ALL'}`);
    console.log(`  Matched:   ${total} document(s)`);
    console.log('------------------------------------------------------');

    // Per-user, per-status breakdown so you can eyeball the impact.
    const breakdown = await PayinTransaction.aggregate([
      { $match: query },
      { $group: { _id: { user_id: '$user.user_id', status: '$status' }, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      { $sort: { '_id.user_id': 1, '_id.status': 1 } },
    ]);

    if (breakdown.length === 0) {
      console.log('  Nothing matches — no documents to delete.');
    } else {
      for (const row of breakdown) {
        console.log(
          `  user ${row._id.user_id} | ${String(row._id.status).padEnd(20)} | ` +
          `${String(row.count).padStart(6)} txn | amount ${row.amount}`
        );
      }
    }
    console.log('------------------------------------------------------');

    if (total === 0) {
      await mongoose.disconnect();
      process.exit(0);
    }

    if (!opts.confirm) {
      console.log('  DRY RUN — nothing was deleted.');
      console.log('  Re-run with --confirm to permanently delete the above.');
      console.log('======================================================');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`  Deleting ${total} document(s)...`);
    const result = await PayinTransaction.deleteMany(query);
    console.log(`  Done. Deleted ${result.deletedCount} document(s).`);
    console.log('======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error while deleting payin transactions:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  process.exit(1);
});
