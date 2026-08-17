const path = require('path');
const { Op, fn, col } = require('sequelize');
const { User, MerchantCharges, AgentCommissionSettlement, sequelize } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { commissionReportQueue } = require('../config/queue.config');

/**
 * Admin-facing agent-commission reporting & settlement, keyed PER USER (merchant).
 *
 * Each row is one merchant we have. For each we show:
 *   - total_charges we collected (payin & payout)
 *   - agent commission accrued = SUM(agent_charge) on their COMPLETED txns
 *   - settled / payable (payable = accrued - settled), tracked per payin/payout
 *   - the current agent charge % (editable inline; a single rate applied across
 *     all of that user's charge slabs)
 *
 * The merchant is charged `total_charges` (== admin_charge); `agent_charge` is
 * CARVED OUT of it (never added on top). Platform net = total_charges - agent_charge.
 */

// Merchant user types (exclude admin/agent/staff).
const MERCHANT_TYPES = ['payin_payout', 'payin_only', 'payout_only'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function buildDateFilter(startDate, endDate) {
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

// Aggregate commission + total charges per user over COMPLETED txns.
async function aggregateByUser(Model, userIds, dateRange) {
  if (!userIds.length) return [];
  const match = { 'user.user_id': { $in: userIds }, status: 'completed' };
  if (dateRange) match.createdAt = dateRange;
  return Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$user.user_id',
        commission: { $sum: { $ifNull: ['$charges.agent_charge', 0] } },
        total_charges: { $sum: { $ifNull: ['$charges.total_charges', 0] } },
        count: { $sum: 1 }
      }
    }
  ]);
}

// Sum settled amounts grouped by user_id + type.
async function settledByUser(userIds) {
  if (!userIds.length) return {};
  const rows = await AgentCommissionSettlement.findAll({
    attributes: ['user_id', 'type', [fn('SUM', col('amount')), 'total']],
    where: { user_id: { [Op.in]: userIds } },
    group: ['user_id', 'type'],
    raw: true
  });
  const map = {};
  rows.forEach((r) => {
    const a = map[r.user_id] || { payin: 0, payout: 0 };
    a[r.type] = round2(r.total);
    map[r.user_id] = a;
  });
  return map;
}

// Representative configured agent rate (%) per user, from their charge slabs.
// Inline override sets all slabs uniformly, so the first bracket is representative.
async function agentRatesByUser(userIds) {
  if (!userIds.length) return {};
  const rows = await MerchantCharges.findAll({
    where: { user_id: { [Op.in]: userIds } },
    attributes: ['user_id', 'agent_payin_charge', 'agent_payout_charge', 'start_amount'],
    order: [['start_amount', 'ASC']],
    raw: true
  });
  const map = {};
  rows.forEach((r) => {
    if (map[r.user_id]) return; // keep the first (lowest band)
    map[r.user_id] = {
      agent_payin_charge: round2(r.agent_payin_charge),
      agent_payout_charge: round2(r.agent_payout_charge)
    };
  });
  return map;
}

/**
 * GET /admin/agent-commission
 * One row per merchant: total charges, accrued/settled/payable, current agent rate.
 */
const getAgentCommissionSummary = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { user_type: { [Op.in]: MERCHANT_TYPES } },
      attributes: ['id', 'name', 'user_name', 'user_type'],
      raw: true
    });
    if (!users.length) return res.json({ success: true, data: [] });

    const userIdsInt = users.map((u) => u.id);
    const userIds = users.map((u) => u.id.toString());

    const [payinAgg, payoutAgg, settledMap, ratesMap] = await Promise.all([
      aggregateByUser(PayinTransaction, userIds, null),
      aggregateByUser(PayoutTransaction, userIds, null),
      settledByUser(userIdsInt),
      agentRatesByUser(userIdsInt)
    ]);

    const payinMap = Object.fromEntries(payinAgg.map((r) => [r._id, r]));
    const payoutMap = Object.fromEntries(payoutAgg.map((r) => [r._id, r]));

    const data = users.map((u) => {
      const key = u.id.toString();
      const pi = payinMap[key] || {};
      const po = payoutMap[key] || {};
      const set = settledMap[u.id] || { payin: 0, payout: 0 };
      const rates = ratesMap[u.id] || { agent_payin_charge: 0, agent_payout_charge: 0 };

      const payinAccrued = round2(pi.commission || 0);
      const payoutAccrued = round2(po.commission || 0);

      return {
        user_id: u.id,
        name: u.name,
        user_name: u.user_name,
        user_type: u.user_type,
        payin_total_charges: round2(pi.total_charges || 0),
        payout_total_charges: round2(po.total_charges || 0),
        agent_payin_charge: rates.agent_payin_charge,
        agent_payout_charge: rates.agent_payout_charge,
        payin_accrued: payinAccrued,
        payout_accrued: payoutAccrued,
        payin_settled: set.payin,
        payout_settled: set.payout,
        payin_payable: round2(payinAccrued - set.payin),
        payout_payable: round2(payoutAccrued - set.payout)
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAgentCommissionSummary:', error);
    res.status(500).json({ success: false, message: 'Error fetching commission summary', error: error.message });
  }
};

// All-time payable per type for a single user (used by the settle guard).
async function computeUserPayable(userId) {
  const uid = [userId.toString()];
  const [payinAgg, payoutAgg, settledMap] = await Promise.all([
    aggregateByUser(PayinTransaction, uid, null),
    aggregateByUser(PayoutTransaction, uid, null),
    settledByUser([userId])
  ]);
  const payinAccrued = round2((payinAgg[0] || {}).commission || 0);
  const payoutAccrued = round2((payoutAgg[0] || {}).commission || 0);
  const set = settledMap[userId] || { payin: 0, payout: 0 };
  return {
    payin: { accrued: payinAccrued, settled: set.payin, payable: round2(payinAccrued - set.payin) },
    payout: { accrued: payoutAccrued, settled: set.payout, payable: round2(payoutAccrued - set.payout) }
  };
}

/**
 * PUT /admin/agent-commission/user/:userId/agent-charge
 * Body: { agent_payin_charge, agent_payout_charge }  (percentages)
 * Sets a single agent rate across ALL of the user's charge slabs. This is the
 * inline per-user override and it flows into live transaction commission.
 */
const setUserAgentCharge = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = parseInt(req.params.userId, 10);
    const payin = parseFloat(req.body.agent_payin_charge);
    const payout = parseFloat(req.body.agent_payout_charge);

    if (!userId) { await t.rollback(); return res.status(400).json({ success: false, message: 'Invalid user id' }); }
    if (isNaN(payin) || payin < 0 || isNaN(payout) || payout < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Agent charges must be valid non-negative numbers' });
    }

    const brackets = await MerchantCharges.findAll({ where: { user_id: userId }, transaction: t });
    if (!brackets.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No charge slabs configured for this user yet' });
    }

    // Invariant: agent cut cannot exceed the admin (total) charge on any slab
    // (compared as percentages against percentage admin charges).
    for (const b of brackets) {
      if (b.admin_payin_charge_type === 'percentage' && payin > parseFloat(b.admin_payin_charge)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Agent payin ${payin}% exceeds admin payin charge ${b.admin_payin_charge}% on one of the slabs` });
      }
      if (b.admin_payout_charge_type === 'percentage' && payout > parseFloat(b.admin_payout_charge)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Agent payout ${payout}% exceeds admin payout charge ${b.admin_payout_charge}% on one of the slabs` });
      }
    }

    for (const b of brackets) {
      await b.update({
        agent_payin_charge: payin,
        agent_payout_charge: payout,
        agent_payin_charge_type: 'percentage',
        agent_payout_charge_type: 'percentage',
        updated_by: req.user?.id || null
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: 'Agent charge updated for user' });
  } catch (error) {
    await t.rollback();
    console.error('Error in setUserAgentCharge:', error);
    res.status(500).json({ success: false, message: 'Error updating agent charge', error: error.message });
  }
};

/**
 * POST /admin/agent-commission/user/:userId/settle
 * Body: { type, amount, note }
 */
const settleUserCommission = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = parseInt(req.params.userId, 10);
    const { type, amount, note } = req.body;
    const value = parseFloat(amount);

    if (!userId) { await t.rollback(); return res.status(400).json({ success: false, message: 'Invalid user id' }); }
    if (!['payin', 'payout'].includes(type)) { await t.rollback(); return res.status(400).json({ success: false, message: "type must be 'payin' or 'payout'" }); }
    if (!value || value <= 0) { await t.rollback(); return res.status(400).json({ success: false, message: 'amount must be greater than 0' }); }

    const totals = await computeUserPayable(userId);
    const payable = totals[type].payable;
    if (value > payable + 0.001) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Amount exceeds payable ${type} commission (${payable.toFixed(2)})` });
    }

    const record = await AgentCommissionSettlement.create({
      user_id: userId,
      type,
      amount: round2(value),
      note: note || null,
      settled_by: req.user?.id || null
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Commission settled successfully', data: { id: record.id } });
  } catch (error) {
    await t.rollback();
    console.error('Error in settleUserCommission:', error);
    res.status(500).json({ success: false, message: 'Error settling commission', error: error.message });
  }
};

/**
 * GET /admin/agent-commission/user/:userId/settlements
 */
const getUserSettlements = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id' });

    const rows = await AgentCommissionSettlement.findAll({
      where: { user_id: userId },
      include: [{ model: User, as: 'settledByUser', attributes: ['name'] }],
      order: [['created_at', 'DESC']]
    });

    const data = rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: round2(r.amount),
      note: r.note,
      settled_by_name: r.settledByUser?.name || null,
      created_at: r.created_at
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getUserSettlements:', error);
    res.status(500).json({ success: false, message: 'Error fetching settlements', error: error.message });
  }
};

/**
 * POST /admin/agent-commission/user/:userId/report
 * Enqueue a per-user Excel report (background worker). Optional override rates.
 */
const createCommissionReport = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user id' });

    const user = await User.findByPk(userId, { attributes: ['id', 'user_name'], raw: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const body = req.body || {};
    const job = await commissionReportQueue.add(
      {
        userId,
        userUsername: user.user_name,
        startDate: req.query.startDate || body.startDate || null,
        endDate: req.query.endDate || body.endDate || null,
        // Optional override rates (%). Blank => worker uses the user's configured
        // agent charge. Applies to historical txns too (recomputes commission).
        overridePayinRate: body.overridePayinRate ?? req.query.overridePayinRate ?? null,
        overridePayoutRate: body.overridePayoutRate ?? req.query.overridePayoutRate ?? null,
        requestedBy: req.user?.id || null
      },
      { removeOnComplete: 100, removeOnFail: 50 }
    );

    res.json({ success: true, data: { jobId: String(job.id) } });
  } catch (error) {
    console.error('Error in createCommissionReport:', error);
    res.status(500).json({ success: false, message: 'Error starting report', error: error.message });
  }
};

/**
 * GET /admin/agent-commission/report/:jobId/status
 */
const getReportStatus = async (req, res) => {
  try {
    const job = await commissionReportQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Report job not found' });

    const rawState = await job.getState();
    let state = rawState;
    if (rawState === 'waiting' || rawState === 'delayed') state = 'pending';
    else if (rawState === 'active') state = 'processing';

    res.json({ success: true, data: { state, ready: rawState === 'completed' } });
  } catch (error) {
    console.error('Error in getReportStatus:', error);
    res.status(500).json({ success: false, message: 'Error checking report status', error: error.message });
  }
};

/**
 * GET /admin/agent-commission/report/:jobId/download
 */
const downloadReport = async (req, res) => {
  try {
    const job = await commissionReportQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Report job not found' });

    const state = await job.getState();
    if (state !== 'completed') {
      return res.status(400).json({ success: false, message: 'Report is not ready yet' });
    }

    const filePath = job.returnvalue?.filePath;
    if (!filePath) return res.status(404).json({ success: false, message: 'Report file not available' });

    return res.download(path.resolve(filePath), path.basename(filePath), (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: 'Error sending report file' });
      }
    });
  } catch (error) {
    console.error('Error in downloadReport:', error);
    res.status(500).json({ success: false, message: 'Error downloading report', error: error.message });
  }
};

module.exports = {
  getAgentCommissionSummary,
  setUserAgentCharge,
  settleUserCommission,
  getUserSettlements,
  createCommissionReport,
  getReportStatus,
  downloadReport
};
