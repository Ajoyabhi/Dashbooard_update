/**
 * API Playground — sandbox endpoints for merchants.
 *
 * Mirrors the live merchant API (/api/payments/payin, /payout, status lookups)
 * request validation and response shapes, but:
 *   - never calls a payment gateway,
 *   - never touches wallet / settlement balances, charges or reports,
 *   - stores records only in the separate `sandbox_transactions` collection,
 *   - marks every id / UTR / callback clearly as SANDBOX.
 *
 * Account-level checks the live API enforces (IP whitelist, balance, account
 * status flags, charge brackets) are NOT enforced here — they are reported back
 * under `sandbox.live_checks` so the merchant can see whether the same request
 * would be accepted on the live API.
 *
 * After a short delay the simulated outcome is applied and the standard
 * callback payload (plus `sandbox: true`) is POSTed to the merchant's configured
 * webhook URL, so they can test their webhook handler end to end.
 */
const axios = require('axios');
const { randomUUID, randomInt } = require('crypto');
const { logger } = require('../utils/logger');
const SandboxTransaction = require('../models/sandboxTransaction.model');
const { User, UserStatus, MerchantDetails, MerchantCharges, FinancialDetails, UserIPs, PlatformCharges } = require('../models');
const { validatePaymentRequest, validatePaymentRequestpayin } = require('./payment.controller');

const FINALIZE_DELAY_MS = parseInt(process.env.SANDBOX_FINALIZE_DELAY_MS, 10) || 5000;
const CALLBACK_TIMEOUT_MS = 10000;
const CALLBACK_MAX_RETRIES = 3;
const RATE_LIMIT_PER_MIN = parseInt(process.env.SANDBOX_RATE_LIMIT_PER_MIN, 10) || 30;
const OUTCOMES = ['success', 'failed', 'pending'];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress;

// Simple per-user, per-minute limiter for create calls (in-memory; sandbox only).
const rateWindows = new Map();
const isRateLimited = (userId) => {
  const now = Date.now();
  const w = rateWindows.get(userId);
  if (!w || now - w.start >= 60000) {
    rateWindows.set(userId, { start: now, count: 1 });
    return false;
  }
  w.count += 1;
  return w.count > RATE_LIMIT_PER_MIN;
};

const sandboxUtr = () => `SANDBOX${String(randomInt(0, 1000000)).padStart(6, '0')}`;
const sandboxTxnId = () => `sbx_${randomUUID()}`;

const parseOutcome = (raw) => {
  const o = String(raw || 'success').toLowerCase();
  return OUTCOMES.includes(o) ? o : null;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Same charge maths as the live payin/payout paths — informational only. */
const computeCharges = (brackets, amount, type, platformCharges, gstRate) => {
  const start = (b) => parseFloat(b[`${type}_start_amount`] ?? b.start_amount);
  const end = (b) => parseFloat(b[`${type}_end_amount`] ?? b.end_amount);
  const bracket = (brackets || [])
    .slice()
    .sort((a, b) => start(a) - start(b))
    .find((b) => amount >= start(b) && amount <= end(b));
  if (!bracket) return null;

  const adminCharge = bracket[`admin_${type}_charge_type`] === 'percentage'
    ? (amount * parseFloat(bracket[`admin_${type}_charge`])) / 100
    : parseFloat(bracket[`admin_${type}_charge`]);
  const platformFee = platformCharges?.charge ? (adminCharge * parseFloat(platformCharges.charge)) / 100 : 0;
  const gstAmount = gstRate ? (adminCharge * parseFloat(gstRate)) / 100 : 0;
  const total = adminCharge + platformFee + gstAmount;
  return {
    admin_charge: round2(adminCharge),
    gst_amount: round2(gstAmount),
    platform_fee: round2(platformFee),
    total_charges: round2(total)
  };
};

/**
 * Evaluate (without enforcing) every account-level check the live API would run,
 * so the merchant can see whether the same request would be accepted live.
 */
const buildLiveChecks = async (req, type, amount) => {
  const user = await User.findByPk(req.user.id, {
    include: [
      { model: UserStatus },
      { model: MerchantDetails },
      { model: MerchantCharges },
      { model: FinancialDetails },
      { model: UserIPs }
    ]
  });
  const platformCharges = await PlatformCharges.findOne({ where: { is_active: true } });
  const ip = getClientIp(req);
  const status = user?.UserStatus || {};
  const checks = [];
  const add = (name, passed, detail) => checks.push({ name, passed, detail });

  add('ip_whitelisted', !!user?.UserIPs?.some((i) => i.ip_address === ip && i.is_active),
    `Request IP ${ip}. Live calls must come from a whitelisted server IP (browser IPs usually are not).`);
  add('account_active', status.status !== 0, status.status === 0 ? 'User is not active' : 'Account active');

  if (type === 'payin') {
    add('payin_enabled', !!status.payin_status && !status.payin_suspended,
      status.payin_suspended ? 'Payin is temporarily suspended' : (status.payin_status ? 'Payin enabled' : 'Payin functionality is disabled'));
  } else {
    add('payout_enabled', !!status.payout_status && !status.payout_suspended,
      status.payout_suspended ? 'Payout is temporarily suspended' : (status.payout_status ? 'Payout enabled' : 'Payout functionality is disabled'));
  }

  const gstRate = user?.MerchantDetail?.gst ?? platformCharges?.gst;
  const charges = computeCharges(user?.MerchantCharges, amount, type, platformCharges, gstRate);
  add('charge_bracket_found', !!charges, charges ? 'Amount falls inside a configured charge bracket' : 'No charge bracket found for the given amount');

  if (type === 'payout') {
    const settlement = parseFloat(user?.FinancialDetail?.settlement) || 0;
    const required = round2(amount + (charges?.total_charges || 0));
    add('sufficient_balance', settlement >= required,
      `Settlement balance ${round2(settlement)} vs required ${required} (amount + charges)`);
  }

  const callbackUrl = type === 'payin' ? user?.MerchantDetail?.payin_callback : user?.MerchantDetail?.payout_callback;
  return {
    live_checks: checks,
    would_pass_live: checks.every((c) => c.passed),
    charges_preview: charges,
    callback_url: callbackUrl || null
  };
};

const toStatusEnvelope = (txn) => {
  const status = txn.status === 'processing' ? 'pending' : txn.status;
  return {
    success: true,
    transaction: {
      reference_id: txn.reference_id,
      type: txn.type,
      status,
      amount: txn.amount,
      utr: status === 'success' ? txn.utr : null,
      message: status === 'success' ? 'Transaction processed' : status === 'failed' ? 'Transaction failed' : 'Transaction is pending',
      timestamp: (txn.updatedAt || txn.createdAt || new Date()).toISOString()
    },
    sandbox: true
  };
};

/** Same body the live callback worker sends, plus `sandbox: true`. */
const buildCallbackPayload = (txn) => ({
  reference_id: txn.reference_id,
  type: txn.type,
  status: txn.status === 'success' ? 'success' : 'failed',
  amount: txn.amount,
  utr: txn.status === 'success' ? txn.utr : null,
  message: txn.status === 'success' ? 'Transaction processed' : 'Transaction failed',
  timestamp: new Date().toISOString(),
  sandbox: true
});

const deliverCallback = async (txnId) => {
  const txn = await SandboxTransaction.findById(txnId);
  if (!txn || !['success', 'failed'].includes(txn.status)) return;

  const md = await MerchantDetails.findOne({ where: { user_id: parseInt(txn.user_id, 10) } });
  const url = txn.type === 'payin' ? md?.payin_callback : md?.payout_callback;
  const payload = buildCallbackPayload(txn);

  txn.callback.url = url || null;
  txn.callback.payload = payload;
  if (!url) {
    txn.callback.delivered = false;
    txn.markModified('callback');
    await txn.save();
    return;
  }

  const attempts = [];
  let delivered = false;
  for (let attempt = 1; attempt <= CALLBACK_MAX_RETRIES && !delivered; attempt++) {
    const started = Date.now();
    try {
      const resp = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json', 'X-AccuzPay-Sandbox': 'true' },
        timeout: CALLBACK_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: () => true
      });
      const snippet = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data ?? '');
      attempts.push({ attempt, status_code: resp.status, response_snippet: (snippet || '').slice(0, 500), latency_ms: Date.now() - started });
      delivered = resp.status >= 200 && resp.status < 300;
    } catch (err) {
      attempts.push({ attempt, error: err.message, latency_ms: Date.now() - started });
    }
    if (!delivered && attempt < CALLBACK_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  txn.callback.attempts = [...(txn.callback.attempts || []), ...attempts];
  txn.callback.delivered = delivered;
  txn.callback.last_attempt_at = new Date();
  txn.markModified('callback');
  await txn.save();
  logger.info('Sandbox callback delivery', { reference_id: txn.reference_id, type: txn.type, delivered, url });
};

/** Atomically move a non-terminal sandbox txn to its outcome, then fire the callback. */
const finalize = async (txnId, outcome) => {
  if (!['success', 'failed'].includes(outcome)) return null;
  const updated = await SandboxTransaction.findOneAndUpdate(
    { _id: txnId, status: { $in: ['pending', 'processing'] } },
    { $set: { status: outcome, utr: outcome === 'success' ? sandboxUtr() : null, finalized_at: new Date() } },
    { new: true }
  );
  if (updated) {
    deliverCallback(updated._id).catch((e) => logger.error('Sandbox callback error', { error: e.message }));
  }
  return updated;
};

const scheduleFinalize = (txnId, outcome) => {
  if (outcome === 'pending') return;
  setTimeout(() => {
    finalize(txnId, outcome).catch((e) => logger.error('Sandbox finalize error', { error: e.message }));
  }, FINALIZE_DELAY_MS);
};

const commonCreateGuards = (req, res, amount, referenceId) => {
  if (isRateLimited(String(req.user.id))) {
    res.status(429).json({ success: false, message: `Sandbox limit reached (${RATE_LIMIT_PER_MIN} requests/minute). Try again shortly.`, sandbox: true });
    return false;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ success: false, message: 'Invalid amount values', sandbox: true });
    return false;
  }
  const ref = String(referenceId);
  if (ref.length < 12 || ref.length > 25) {
    res.status(400).json({ success: false, message: 'Reference number must be between 12 and 25 digits', sandbox: true });
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// handlers
// ---------------------------------------------------------------------------

const sandboxPayin = async (req, res) => {
  try {
    const validation = validatePaymentRequestpayin(req);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: 'Invalid request', errors: validation.errors, sandbox: true });
    }
    const outcome = parseOutcome(req.body.sandbox_outcome);
    if (!outcome) {
      return res.status(400).json({ success: false, message: `sandbox_outcome must be one of ${OUTCOMES.join(', ')}`, sandbox: true });
    }
    const amount = parseFloat(req.body.order_amount);
    const { reference_id } = req.body;
    if (!commonCreateGuards(req, res, amount, reference_id)) return;

    const userId = String(req.user.id);
    const exists = await SandboxTransaction.exists({ user_id: userId, type: 'payin', reference_id: String(reference_id) });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Transaction with this reference ID already exists. Please use a different reference ID for new transactions.',
        sandbox: true
      });
    }

    const info = await buildLiveChecks(req, 'payin', amount);
    const transaction_id = sandboxTxnId();
    const { sandbox_outcome, ...requestBody } = req.body;
    const txn = await SandboxTransaction.create({
      user_id: userId,
      type: 'payin',
      reference_id: String(reference_id),
      transaction_id,
      amount,
      status: 'pending',
      requested_outcome: outcome,
      request_body: requestBody
    });
    scheduleFinalize(txn._id, outcome);

    // Deliberately non-payable intent: invalid VPA + "do not pay" note.
    const paymentUrl = encodeURI(
      `upi://pay?pa=sandbox@sandbox&pn=AccuzPay Sandbox&am=${amount.toFixed(2)}&tr=${reference_id}&tn=SANDBOX - DO NOT PAY`
    );

    return res.status(200).json({
      transaction_id,
      result: { success: true, reference_id: String(reference_id), payment_url: paymentUrl },
      sandbox: { ...info, simulated_outcome: outcome, finalizes_in_ms: outcome === 'pending' ? null : FINALIZE_DELAY_MS }
    });
  } catch (error) {
    logger.error('Sandbox payin error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error processing sandbox payment', sandbox: true });
  }
};

const sandboxPayout = async (req, res) => {
  try {
    const validation = validatePaymentRequest(req);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: 'Invalid request', errors: validation.errors, sandbox: true });
    }
    const outcome = parseOutcome(req.body.sandbox_outcome);
    if (!outcome) {
      return res.status(400).json({ success: false, message: `sandbox_outcome must be one of ${OUTCOMES.join(', ')}`, sandbox: true });
    }
    const amount = parseFloat(req.body.amount);
    const { reference_id } = req.body;
    if (!commonCreateGuards(req, res, amount, reference_id)) return;

    const userId = String(req.user.id);
    const existing = await SandboxTransaction.findOne(
      { user_id: userId, type: 'payout', reference_id: String(reference_id) },
      { _id: 1, status: 1 }
    ).lean();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Transaction already exists',
        transaction_id: existing._id,
        status: existing.status,
        sandbox: true
      });
    }

    const info = await buildLiveChecks(req, 'payout', amount);
    const transaction_id = sandboxTxnId();
    const { sandbox_outcome, ...requestBody } = req.body;
    const txn = await SandboxTransaction.create({
      user_id: userId,
      type: 'payout',
      reference_id: String(reference_id),
      transaction_id,
      amount,
      status: 'processing',
      requested_outcome: outcome,
      request_body: requestBody
    });
    scheduleFinalize(txn._id, outcome);

    return res.status(200).json({
      success: true,
      message: 'Payout initiated, awaiting confirmation',
      reference_id: String(reference_id),
      transaction_id,
      sandbox: { ...info, simulated_outcome: outcome, finalizes_in_ms: outcome === 'pending' ? null : FINALIZE_DELAY_MS }
    });
  } catch (error) {
    logger.error('Sandbox payout error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error processing sandbox payout', sandbox: true });
  }
};

const findOwnTxn = (req, type) =>
  SandboxTransaction.findOne({ user_id: String(req.user.id), type, reference_id: String(req.params.reference_id || '').trim() });

const makeStatusHandler = (type) => async (req, res) => {
  try {
    const txn = await findOwnTxn(req, type);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found', sandbox: true });
    return res.status(200).json(toStatusEnvelope(txn));
  } catch (error) {
    logger.error('Sandbox status error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error getting transaction status', sandbox: true });
  }
};

/** Resolve a still-pending sandbox txn to success/failed on demand. */
const simulateOutcome = async (req, res) => {
  try {
    const { type } = req.params;
    const outcome = String(req.body?.outcome || '').toLowerCase();
    if (!['success', 'failed'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'outcome must be success or failed', sandbox: true });
    }
    const txn = await findOwnTxn(req, type);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found', sandbox: true });
    const updated = await finalize(txn._id, outcome);
    if (!updated) {
      return res.status(409).json({ success: false, message: `Transaction already ${txn.status}`, sandbox: true });
    }
    return res.status(200).json(toStatusEnvelope(updated));
  } catch (error) {
    logger.error('Sandbox simulate error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error simulating outcome', sandbox: true });
  }
};

/** Re-send the callback for a finalized sandbox txn. */
const resendCallback = async (req, res) => {
  try {
    if (isRateLimited(String(req.user.id))) {
      return res.status(429).json({ success: false, message: 'Sandbox limit reached. Try again shortly.', sandbox: true });
    }
    const txn = await findOwnTxn(req, req.params.type);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found', sandbox: true });
    if (!['success', 'failed'].includes(txn.status)) {
      return res.status(409).json({ success: false, message: 'Callbacks are sent only once the transaction is success or failed', sandbox: true });
    }
    await deliverCallback(txn._id);
    const fresh = await SandboxTransaction.findById(txn._id).lean();
    return res.status(200).json({ success: true, callback: fresh.callback, sandbox: true });
  } catch (error) {
    logger.error('Sandbox resend callback error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error sending callback', sandbox: true });
  }
};

const listTransactions = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const rows = await SandboxTransaction.find({ user_id: String(req.user.id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.status(200).json({ success: true, data: rows, sandbox: true });
  } catch (error) {
    logger.error('Sandbox list error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error listing sandbox transactions', sandbox: true });
  }
};

module.exports = {
  sandboxPayin,
  sandboxPayout,
  getSandboxPayinStatus: makeStatusHandler('payin'),
  getSandboxPayoutStatus: makeStatusHandler('payout'),
  simulateOutcome,
  resendCallback,
  listTransactions
};
