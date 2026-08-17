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
  const { agentId, agentUsername, startDate, endDate, overridePayinRate, overridePayoutRate } = job.data;
  logger.info('Processing commission report job', { jobId: job.id, agentId, startDate, endDate, overridePayinRate, overridePayoutRate });

  // Optional override rates (%). null => fall back to configured agent charge.
  const ovPayin = num(overridePayinRate);
  const ovPayout = num(overridePayoutRate);

  const agent = await User.findByPk(agentId, { attributes: ['id', 'name', 'user_name'], raw: true });
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const merchants = await User.findAll({ where: { created_by: agentId }, attributes: ['id', 'name', 'user_name'], raw: true });
  const merchantIds = merchants.map((m) => m.id.toString());
  const dateRange = buildDateRange(startDate, endDate);

  // Configured agent-charge brackets per merchant (used when no override is given).
  const bracketRows = merchants.length
    ? await MerchantCharges.findAll({ where: { user_id: { [Op.in]: merchants.map((m) => m.id) } }, raw: true })
    : [];
  const bracketsByMerchant = {};
  bracketRows.forEach((r) => {
    (bracketsByMerchant[r.user_id.toString()] = bracketsByMerchant[r.user_id.toString()] || []).push(r);
  });

  const [payins, payouts] = await Promise.all([
    fetchCompleted(PayinTransaction, merchantIds, dateRange),
    fetchCompleted(PayoutTransaction, merchantIds, dateRange)
  ]);

  // Precompute commission per transaction (override or configured fallback).
  const commissionOf = (type, txn) =>
    computeCommission(type, txn, type === 'payin' ? ovPayin : ovPayout, bracketsByMerchant[txn.user?.user_id] || []);

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
    { header: 'Merchant Charge', key: 'merchant_charge', width: 16 },
    { header: 'Agent Commission', key: 'agent_commission', width: 18 },
    { header: 'Platform Net', key: 'platform_net', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Created Date', key: 'created_date', width: 22 }
  ];
  detail.getRow(1).font = { bold: true };
  detail.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  payins.forEach((t) => addTxnRow(detail, 'payin', t, commissionOf('payin', t)));
  payouts.forEach((t) => addTxnRow(detail, 'payout', t, commissionOf('payout', t)));

  // ---- Sheet 2: per-merchant summary ----
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Merchant', key: 'merchant_name', width: 24 },
    { header: 'Merchant ID', key: 'merchant_id', width: 12 },
    { header: 'Payin Txns', key: 'payin_count', width: 12 },
    { header: 'Payin Commission', key: 'payin_commission', width: 18 },
    { header: 'Payout Txns', key: 'payout_count', width: 12 },
    { header: 'Payout Commission', key: 'payout_commission', width: 18 }
  ];
  summary.getRow(1).font = { bold: true };
  summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  const acc = {}; // merchantIdStr -> { payinCount, payinComm, payoutCount, payoutComm }
  const bump = (id, key, amount) => {
    const a = acc[id] || { payinCount: 0, payinComm: 0, payoutCount: 0, payoutComm: 0 };
    if (key === 'payin') { a.payinCount += 1; a.payinComm += (amount || 0); }
    else { a.payoutCount += 1; a.payoutComm += (amount || 0); }
    acc[id] = a;
  };
  payins.forEach((t) => bump(t.user?.user_id, 'payin', commissionOf('payin', t)));
  payouts.forEach((t) => bump(t.user?.user_id, 'payout', commissionOf('payout', t)));

  let gPayinCount = 0, gPayinComm = 0, gPayoutCount = 0, gPayoutComm = 0;
  merchants.forEach((m) => {
    const a = acc[m.id.toString()] || { payinCount: 0, payinComm: 0, payoutCount: 0, payoutComm: 0 };
    gPayinCount += a.payinCount; gPayinComm += a.payinComm;
    gPayoutCount += a.payoutCount; gPayoutComm += a.payoutComm;
    summary.addRow({
      merchant_name: m.name,
      merchant_id: m.id,
      payin_count: a.payinCount,
      payin_commission: round2(a.payinComm),
      payout_count: a.payoutCount,
      payout_commission: round2(a.payoutComm)
    });
  });

  const totalRow = summary.addRow({
    merchant_name: 'TOTAL',
    merchant_id: '',
    payin_count: gPayinCount,
    payin_commission: round2(gPayinComm),
    payout_count: gPayoutCount,
    payout_commission: round2(gPayoutComm)
  });
  totalRow.font = { bold: true };

  // ---- Sheet 3: report meta ----
  const meta = workbook.addWorksheet('Report Info');
  meta.columns = [{ header: 'Field', key: 'field', width: 24 }, { header: 'Value', key: 'value', width: 40 }];
  meta.getRow(1).font = { bold: true };
  [
    { field: 'Agent', value: `${agent.name} (${agent.user_name})` },
    { field: 'Merchants', value: merchants.length },
    { field: 'Date From', value: startDate || 'All time' },
    { field: 'Date To', value: endDate || 'All time' },
    { field: 'Payin Rate Basis', value: ovPayin != null ? `Override ${ovPayin}%` : "Merchant's configured agent charge" },
    { field: 'Payout Rate Basis', value: ovPayout != null ? `Override ${ovPayout}%` : "Merchant's configured agent charge" },
    { field: 'Payin Commission (range)', value: round2(gPayinComm) },
    { field: 'Payout Commission (range)', value: round2(gPayoutComm) },
    { field: 'Generated At', value: new Date().toLocaleString('en-IN') }
  ].forEach((r) => meta.addRow(r));

  const safeAgent = String(agentUsername || agent.user_name || agentId).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `agent-commission-${safeAgent}-${Date.now()}.xlsx`;
  const filePath = path.join(REPORTS_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);

  logger.info('Commission report generated', { jobId: job.id, filePath, payins: payins.length, payouts: payouts.length });
  return { filePath, fileName, payinCount: payins.length, payoutCount: payouts.length };
});

commissionReportQueue.on('completed', (job) => {
  logger.info('Commission report job completed', { jobId: job.id });
});

logger.info('Commission report worker started');
