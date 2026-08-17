const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { commissionReportQueue } = require('../config/queue.config');
const { connectMongo } = require('../config/mongoConnect');
const { logger } = require('../utils/logger');
const { Op } = require('sequelize');
const { User, MerchantCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');

// Where generated .xlsx files are written. The API's download endpoint reads
// from this same local dir (worker + API run on the same host — see deploy.sh).
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

connectMongo()
  .then(() => logger.info('MongoDB connected successfully in commission report worker'))
  .catch((err) => {
    logger.error('MongoDB connection error in commission report worker:', err);
    process.exit(1);
  });

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function buildDateRange(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

async function fetchCompleted(Model, userIds, dateRange) {
  if (!userIds.length) return [];
  const filter = { 'user.user_id': { $in: userIds }, status: 'completed' };
  if (dateRange) filter.createdAt = dateRange;
  return Model.find(filter).sort({ createdAt: -1 }).lean();
}

const num = (v) => (v === null || v === undefined || v === '' || isNaN(v) ? null : parseFloat(v));

/**
 * Commission for one transaction, RECOMPUTED (not read from the stored value):
 *   - If an override rate (%) was supplied for this leg, apply it to the amount.
 *     This is how historical transactions (stored agent_charge = 0) get a real
 *     figure for the statement.
 *   - Otherwise fall back to the merchant's currently-configured agent charge:
 *     find the amount bracket in MerchantCharges and use its agent rate (percentage
 *     -> amount*rate/100, fixed -> the fixed value).
 */
function computeCommission(type, txn, overrideRate, brackets) {
  const amount = parseFloat(txn.amount) || 0;

  if (overrideRate != null) {
    return round2((amount * overrideRate) / 100);
  }

  const startOf = type === 'payin'
    ? (b) => parseFloat(b.payin_start_amount ?? b.start_amount)
    : (b) => parseFloat(b.payout_start_amount ?? b.start_amount);
  const endOf = type === 'payin'
    ? (b) => parseFloat(b.payin_end_amount ?? b.end_amount)
    : (b) => parseFloat(b.payout_end_amount ?? b.end_amount);

  const bracket = (brackets || []).find((b) => amount >= startOf(b) && amount <= endOf(b));
  if (!bracket) return 0;

  const rate = type === 'payin' ? bracket.agent_payin_charge : bracket.agent_payout_charge;
  const rtype = type === 'payin' ? bracket.agent_payin_charge_type : bracket.agent_payout_charge_type;
  if (rtype === 'fixed') return round2(parseFloat(rate) || 0);
  return round2((amount * (parseFloat(rate) || 0)) / 100);
}

function addTxnRow(sheet, type, txn, commission) {
  const total = txn.charges?.total_charges || 0;
  sheet.addRow({
    type,
    reference_id: txn.reference_id,
    utr: txn.gateway_response?.utr || 'N/A',
    merchant_name: txn.user?.name || 'N/A',
    merchant_username: txn.user?.user_id || 'N/A',
    amount: round2(txn.amount),
    merchant_charge: round2(total),
    agent_commission: round2(commission),
    platform_net: round2(total - commission),
    status: txn.status,
    created_date: txn.createdAt ? new Date(txn.createdAt).toLocaleString('en-IN') : 'N/A'
  });
}

commissionReportQueue.process(async (job) => {
  const { userId, userUsername, startDate, endDate, overridePayinRate, overridePayoutRate } = job.data;
  logger.info('Processing commission report job', { jobId: job.id, userId, startDate, endDate, overridePayinRate, overridePayoutRate });

  // Optional override rates (%). null => fall back to configured agent charge.
  const ovPayin = num(overridePayinRate);
  const ovPayout = num(overridePayoutRate);

  const user = await User.findByPk(userId, { attributes: ['id', 'name', 'user_name'], raw: true });
  if (!user) throw new Error(`User ${userId} not found`);

  const userIds = [userId.toString()];
  const dateRange = buildDateRange(startDate, endDate);

  // The user's own configured agent-charge slabs (used when no override is given).
  const brackets = await MerchantCharges.findAll({ where: { user_id: userId }, raw: true });

  const [payins, payouts] = await Promise.all([
    fetchCompleted(PayinTransaction, userIds, dateRange),
    fetchCompleted(PayoutTransaction, userIds, dateRange)
  ]);

  // Commission per transaction (override or the user's configured slab fallback).
  const commissionOf = (type, txn) =>
    computeCommission(type, txn, type === 'payin' ? ovPayin : ovPayout, brackets);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PayVex';
  workbook.created = new Date();

  // ---- Sheet 1: per-transaction detail ----
  const detail = workbook.addWorksheet('Commission Detail');
  detail.columns = [
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Reference ID', key: 'reference_id', width: 26 },
    { header: 'UTR', key: 'utr', width: 22 },
    { header: 'Merchant', key: 'merchant_name', width: 22 },
    { header: 'Merchant ID', key: 'merchant_username', width: 12 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Total Charge Taken', key: 'merchant_charge', width: 18 },
    { header: 'Agent Commission', key: 'agent_commission', width: 18 },
    { header: 'Platform Net', key: 'platform_net', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Created Date', key: 'created_date', width: 22 }
  ];
  detail.getRow(1).font = { bold: true };
  detail.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  let gPayinCount = 0, gPayinComm = 0, gPayinCharge = 0;
  let gPayoutCount = 0, gPayoutComm = 0, gPayoutCharge = 0;

  payins.forEach((t) => {
    const c = commissionOf('payin', t);
    addTxnRow(detail, 'payin', t, c);
    gPayinCount += 1; gPayinComm += c; gPayinCharge += (t.charges?.total_charges || 0);
  });
  payouts.forEach((t) => {
    const c = commissionOf('payout', t);
    addTxnRow(detail, 'payout', t, c);
    gPayoutCount += 1; gPayoutComm += c; gPayoutCharge += (t.charges?.total_charges || 0);
  });

  // ---- Sheet 2: report meta / totals ----
  const meta = workbook.addWorksheet('Report Info');
  meta.columns = [{ header: 'Field', key: 'field', width: 28 }, { header: 'Value', key: 'value', width: 44 }];
  meta.getRow(1).font = { bold: true };
  [
    { field: 'Merchant', value: `${user.name} (${user.user_name})` },
    { field: 'Date From', value: startDate || 'All time' },
    { field: 'Date To', value: endDate || 'All time' },
    { field: 'Payin Rate Basis', value: ovPayin != null ? `Override ${ovPayin}%` : "User's configured agent charge" },
    { field: 'Payout Rate Basis', value: ovPayout != null ? `Override ${ovPayout}%` : "User's configured agent charge" },
    { field: 'Payin Txns', value: gPayinCount },
    { field: 'Total Payin Charge Taken', value: round2(gPayinCharge) },
    { field: 'Payin Agent Commission', value: round2(gPayinComm) },
    { field: 'Payout Txns', value: gPayoutCount },
    { field: 'Total Payout Charge Taken', value: round2(gPayoutCharge) },
    { field: 'Payout Agent Commission', value: round2(gPayoutComm) },
    { field: 'Generated At', value: new Date().toLocaleString('en-IN') }
  ].forEach((r) => meta.addRow(r));

  const safeUser = String(userUsername || user.user_name || userId).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `agent-commission-${safeUser}-${Date.now()}.xlsx`;
  const filePath = path.join(REPORTS_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);

  logger.info('Commission report generated', { jobId: job.id, filePath, payins: payins.length, payouts: payouts.length });
  return { filePath, fileName, payinCount: payins.length, payoutCount: payouts.length };
});

commissionReportQueue.on('completed', (job) => {
  logger.info('Commission report job completed', { jobId: job.id });
});

logger.info('Commission report worker started');
