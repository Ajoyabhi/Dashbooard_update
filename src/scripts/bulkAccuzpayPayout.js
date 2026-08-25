/**
 * Bulk AccuzPay payout — splits each account target into variable-sized payouts
 * (₹300–₹30,000 per txn, not fixed ₹30,000 chunks).
 *
 * Usage:
 *   node src/scripts/bulkAccuzpayPayout.js --dry-run
 *   node src/scripts/bulkAccuzpayPayout.js --execute
 * Options:
 *   --dry-run   Preview split + payloads (default)
 *   --execute   Call the AccuzPay payout API
 */

const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const ACCUZPAY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwidXNlcl90eXBlIjoicGF5aW5fcGF5b3V0IiwiaWF0IjoxNzgzMzIzMTQwLCJleHAiOjE4MTQ4NTkxNDB9.UjXoz-AfNKJzpXcf9OYBavpSssFRj1noszPhTcAycq0';

const PAYOUT_URL = process.env.ACCUZPAY_PAYOUT_URL || 'https://dashboard.accuzpay.in/api/payments/payout';
const MAX_PER_TXN = Number(process.env.PAYOUT_MAX_PER_TXN || 30000);
const MIN_PER_TXN = 300;
const MIN_CHUNK = Number(process.env.PAYOUT_MIN_CHUNK || 5000);
const REQUEST_TYPE = process.env.PAYOUT_REQUEST_TYPE || 'IMPS';
const DELAY_MS = Number(process.env.PAYOUT_DELAY_MS || 2000);

/** Edit account #2 and #3 before running with --execute. Amounts over MAX_PER_TXN are auto-chunked. */
const ACCOUNTS = [
  // {
  //   label: 'Account 4',
  //   amount: 57000,
  //   account_number: '003321715552978',
  //   account_ifsc: 'JIOP0000001',
  //   bank_name: 'JIO BANK',
  //   beneficiary_name: 'Suraj',
  // },
  {
    label: 'Account 1',
    amount: 820000,
    account_number: '50100691061012',
    account_ifsc: 'HDFC0004217',
    bank_name: 'HDFC Bank',
    beneficiary_name: 'Shivam',
  },
  // {
  //   label: 'Account 2',
  //   amount: 200000,
  //   account_number: '4512279701',
  //   account_ifsc: 'KKBK0005024',
  //   bank_name: 'Kotak Mahindra Bank',
  //   beneficiary_name: 'Shakshi',
  // },
  // {
  //   label: 'Account 3',
  //   amount: 250000,
  //   account_number: '497102010031582',
  //   account_ifsc: 'UBIN0549711',
  //   bank_name: 'Union Bank of India',
  //   beneficiary_name: 'Reyan',
  // },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const dryRun = args.includes('--dry-run') || !execute;
  return { dryRun, execute, token: ACCUZPAY_TOKEN };
}

function assertConfig(accounts, execute) {
  if (!execute) return;

  for (const acct of accounts) {
    for (const field of ['account_number', 'account_ifsc', 'bank_name', 'beneficiary_name']) {
      if (!acct[field] || String(acct[field]).includes('REPLACE_ME')) {
        throw new Error(`${acct.label}: set "${field}" before running with --execute.`);
      }
    }
  }
}

function hasPlaceholder(acct) {
  return ['account_number', 'account_ifsc', 'bank_name', 'beneficiary_name'].some(
    (field) => !acct[field] || String(acct[field]).includes('REPLACE_ME')
  );
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Split one account's target into variable-sized payouts (each between min and max),
 * instead of fixed ₹30,000 slices.
 */
function chunkAmount(total, maxPerTxn, minPerTxn = MIN_PER_TXN) {
  if (total < minPerTxn) {
    throw new Error(`Amount ${total} is below minimum payout of ₹${minPerTxn}.`);
  }
  if (total <= maxPerTxn) return [total];

  const floor = Math.max(minPerTxn, MIN_CHUNK);
  if (floor > maxPerTxn) {
    throw new Error(`MIN_CHUNK (${floor}) exceeds max per txn (${maxPerTxn}).`);
  }

  const minChunks = Math.ceil(total / maxPerTxn);
  const maxChunks = Math.floor(total / floor);
  if (minChunks > maxChunks) {
    throw new Error(`Cannot split ₹${total} with floor ₹${floor} and cap ₹${maxPerTxn}.`);
  }

  const extraChunks = Math.min(4, maxChunks - minChunks);
  const numChunks = randomInt(minChunks, minChunks + extraChunks);

  const chunks = Array.from({ length: numChunks }, () => floor);
  let remaining = total - numChunks * floor;

  while (remaining > 0) {
    const idx = randomInt(0, numChunks - 1);
    const headroom = maxPerTxn - chunks[idx];
    if (headroom <= 0) continue;
    const add = randomInt(1, Math.min(headroom, remaining));
    chunks[idx] += add;
    remaining -= add;
  }

  for (let i = chunks.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [chunks[i], chunks[j]] = [chunks[j], chunks[i]];
  }

  return chunks;
}

function buildPayoutPlan(accounts, maxPerTxn) {
  const plan = [];
  let seq = 1;

  for (const acct of accounts) {
    const chunks = chunkAmount(acct.amount, maxPerTxn);
    chunks.forEach((amount, chunkIdx) => {
      plan.push({
        ...acct,
        amount,
        chunk: chunkIdx + 1,
        chunkTotal: chunks.length,
        reference_id: makeReferenceId(seq),
        request_type: REQUEST_TYPE,
      });
      seq += 1;
    });
  }

  return plan;
}

function makeReferenceId(index) {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const id = `PAYOUT${ts}${rand}${index}`;
  return id.slice(0, 25);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initiatePayout(token, payload) {
  const response = await axios.post(PAYOUT_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    validateStatus: () => true,
  });
  return { status: response.status, data: response.data };
}

async function main() {
  const { dryRun, execute, token } = parseArgs();
  assertConfig(ACCOUNTS, execute);

  const totalAmount = ACCOUNTS.reduce((sum, acct) => sum + acct.amount, 0);
  const plan = buildPayoutPlan(ACCOUNTS, MAX_PER_TXN);

  console.log('\n=== AccuzPay bulk payout plan ===');
  console.log(`Total: ₹${totalAmount} | Cap/txn: ₹${MAX_PER_TXN} | Txns: ${plan.length} | Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  let runningTotal = 0;
  for (const row of plan) {
    runningTotal += row.amount;
    const chunkLabel = row.chunkTotal > 1 ? ` (part ${row.chunk}/${row.chunkTotal})` : '';
    console.log(`${row.label}${chunkLabel} — ₹${row.amount}`);
    console.log(`  beneficiary : ${row.beneficiary_name}`);
    console.log(`  account     : ${row.account_number} (${row.account_ifsc})`);
    console.log(`  bank        : ${row.bank_name}`);
    console.log(`  reference_id: ${row.reference_id}`);
    console.log('');
  }
  console.log(`Sum of all txns: ₹${runningTotal}${runningTotal !== totalAmount ? ' (MISMATCH!)' : ''}\n`);

  const unfilled = ACCOUNTS.filter((acct) => hasPlaceholder(acct));
  if (unfilled.length) {
    console.log(`Note: ${unfilled.map((r) => r.label).join(', ')} still have REPLACE_ME placeholders.\n`);
  }

  if (dryRun) {
    console.log('Dry run only. Fill all accounts, then re-run with --execute to call the API.');
    process.exit(unfilled.length ? 1 : 0);
  }

  const results = [];
  for (let i = 0; i < plan.length; i += 1) {
    const row = plan[i];
    const payload = {
      amount: String(row.amount),
      account_number: row.account_number,
      account_ifsc: row.account_ifsc,
      bank_name: row.bank_name,
      beneficiary_name: row.beneficiary_name,
      request_type: row.request_type,
      reference_id: row.reference_id,
    };

    console.log(`[${i + 1}/${plan.length}] POST ${row.reference_id} — ₹${row.amount} → ${row.beneficiary_name}`);
    try {
      const { status, data } = await initiatePayout(token, payload);
      results.push({ reference_id: row.reference_id, httpStatus: status, response: data });
      console.log(`  HTTP ${status}: ${JSON.stringify(data)}`);
      if (status >= 400) {
        console.error('  Stopping after failure.');
        break;
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      results.push({ reference_id: row.reference_id, error: err.message });
      break;
    }

    if (i < plan.length - 1 && DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    if (r.error) {
      console.log(`${r.reference_id}: FAILED — ${r.error}`);
    } else {
      const ok = r.httpStatus < 400 && r.response?.success !== false;
      console.log(`${r.reference_id}: HTTP ${r.httpStatus} — ${ok ? 'OK' : 'FAILED'} — ${JSON.stringify(r.response)}`);
    }
  }

  const allOk = results.length === plan.length && results.every(
    (r) => !r.error && r.httpStatus < 400 && r.response?.success !== false
  );
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
