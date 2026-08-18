const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { commissionReportQueue } = require('../config/queue.config');
const { connectMongo } = require('../config/mongoConnect');
const { logger } = require('../utils/logger');
const { User, MerchantCharges, AgentCommissionRate } = require('../models');
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
 * Commission for one transaction, RECOMPUTED from a RATE (report-only) — never
 * from the value stored on the transaction:
 *   commission = amount * effectiveRate / 100
 * where effectiveRate = override rate if supplied, else the user's configured
 * report-only agent rate. This is fully independent of the live charge logic and
 * gives real figures for historical transactions too.
 */
function computeCommission(txn, effectiveRate) {
  const amount = parseFloat(txn.amount) || 0;
  return round2((amount * (effectiveRate || 0)) / 100);
}

// Total charge for a transaction, computed from the CURRENT configured charge
// rate (not the historical stored value), so the statement reflects the agreed
// structure consistently: percentage => amount*rate/100, fixed => the flat value.
function computeTotalCharge(txn, rate, type) {
  const amount = parseFloat(txn.amount) || 0;
  if (type === 'fixed') return round2(rate || 0);
  return round2((amount * (rate || 0)) / 100);
}

function addTxnRow(sheet, type, txn, totalCharge, commission) {
  sheet.addRow({
    type,
    reference_id: txn.reference_id,
    utr: txn.gateway_response?.utr || 'N/A',
    merchant_name: txn.user?.name || 'N/A',
    merchant_username: txn.user?.user_id || 'N/A',
    amount: round2(txn.amount),
    merchant_charge: round2(totalCharge),
    agent_commission: round2(commission),
    platform_net: round2(totalCharge - commission),
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

  // The user's report-only agent rate (used when no override is supplied).
  const rateRow = await AgentCommissionRate.findOne({ where: { user_id: userId }, raw: true });
  const cfgPayin = rateRow ? parseFloat(rateRow.agent_payin_rate) || 0 : 0;
  const cfgPayout = rateRow ? parseFloat(rateRow.agent_payout_rate) || 0 : 0;

  const effPayin = ovPayin != null ? ovPayin : cfgPayin;
  const effPayout = ovPayout != null ? ovPayout : cfgPayout;

  // The user's CURRENT configured charge rate (representative = lowest band), used
  // to compute the total charge consistently with the agent cut.
  const chargeRow = await MerchantCharges.findOne({ where: { user_id: userId }, order: [['start_amount', 'ASC']], raw: true });
  const chgPayin = chargeRow ? parseFloat(chargeRow.admin_payin_charge) || 0 : 0;
  const chgPayout = chargeRow ? parseFloat(chargeRow.admin_payout_charge) || 0 : 0;
  const chgPayinType = chargeRow ? chargeRow.admin_payin_charge_type : 'percentage';
  const chgPayoutType = chargeRow ? chargeRow.admin_payout_charge_type : 'percentage';

  const [payins, payouts] = await Promise.all([
    fetchCompleted(PayinTransaction, userIds, dateRange),
    fetchCompleted(PayoutTransaction, userIds, dateRange)
  ]);

  // Per transaction: total charge from the configured charge rate, agent from the
  // effective agent rate; both consistent so net = total - agent.
  const commissionOf = (type, txn) => computeCommission(txn, type === 'payin' ? effPayin : effPayout);
  const totalChargeOf = (type, txn) =>
    type === 'payin' ? computeTotalCharge(txn, chgPayin, chgPayinType) : computeTotalCharge(txn, chgPayout, chgPayoutType);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PayVex';
  workbook.created = new Date();

  // Build a transaction-detail sheet (one per leg — the tab name is the type).
  const buildDetailSheet = (name) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
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
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    return sheet;
  };

  // ---- Sheet 1: Payin ----
  const payinSheet = buildDetailSheet('Payin');
  let gPayinCount = 0, gPayinComm = 0, gPayinCharge = 0;
  payins.forEach((t) => {
    const total = totalChargeOf('payin', t);
    const c = commissionOf('payin', t);
    addTxnRow(payinSheet, 'payin', t, total, c);
    gPayinCount += 1; gPayinComm += c; gPayinCharge += total;
  });
  const payinTotalRow = payinSheet.addRow({
    reference_id: 'TOTAL', merchant_charge: round2(gPayinCharge),
    agent_commission: round2(gPayinComm), platform_net: round2(gPayinCharge - gPayinComm)
  });
  payinTotalRow.font = { bold: true };

  // ---- Sheet 2: Payout ----
  const payoutSheet = buildDetailSheet('Payout');
  let gPayoutCount = 0, gPayoutComm = 0, gPayoutCharge = 0;
  payouts.forEach((t) => {
    const total = totalChargeOf('payout', t);
    const c = commissionOf('payout', t);
    addTxnRow(payoutSheet, 'payout', t, total, c);
    gPayoutCount += 1; gPayoutComm += c; gPayoutCharge += total;
  });
  const payoutTotalRow = payoutSheet.addRow({
    reference_id: 'TOTAL', merchant_charge: round2(gPayoutCharge),
    agent_commission: round2(gPayoutComm), platform_net: round2(gPayoutCharge - gPayoutComm)
  });
  payoutTotalRow.font = { bold: true };

  // ---- Sheet 3: report meta / totals ----
  const meta = workbook.addWorksheet('Report Info');
  meta.columns = [{ header: 'Field', key: 'field', width: 28 }, { header: 'Value', key: 'value', width: 44 }];
  meta.getRow(1).font = { bold: true };
  [
    { field: 'Merchant', value: `${user.name} (${user.user_name})` },
    { field: 'Date From', value: startDate || 'All time' },
    { field: 'Date To', value: endDate || 'All time' },
    { field: 'Payin Rate Applied', value: `${effPayin}% ${ovPayin != null ? '(override)' : '(configured)'}` },
    { field: 'Payout Rate Applied', value: `${effPayout}% ${ovPayout != null ? '(override)' : '(configured)'}` },
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
