const path = require('path');
const { Op, fn, col } = require('sequelize');
const { User, AgentCommissionSettlement, sequelize } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { commissionReportQueue } = require('../config/queue.config');

/**
 * Admin-facing agent commission reporting & settlement.
 *
 * Model recap (see agentCommissionSettlement.model.js):
 *   - The merchant is charged `total_charges` (== admin_charge). The agent's cut,
 *     `agent_charge`, is CARVED OUT of that — it is never added to the merchant's
 *     bill. Platform net on a txn = total_charges - agent_charge.
 *   - accrued(type)  = SUM(agent_charge) over the agent's merchants' COMPLETED txns
 *   - settled(type)  = SUM(amount) from agent_commission_settlements
 *   - payable(type)  = accrued - settled   (always recomputed => never double-pays)
 *   - Payin and payout are independent ledgers.
 *
 * Merchant -> agent link is `User.created_by == agentId`, matching the existing
 * agent-facing reports in agent.controller.js.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Build a Mongo createdAt filter (IST dates come in as ISO strings from the UI).
function buildDateFilter(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    // Make the end date inclusive of the whole day if only a date was given.
    const end = new Date(endDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
}

// Aggregate commission per merchant (user.user_id) over COMPLETED txns.
async function accruedByMerchant(Model, userIds, dateRange) {
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

// Sum settled amounts grouped by agent_id + type.
async function settledByAgent(agentIds) {
  if (!agentIds.length) return {};
  const rows = await AgentCommissionSettlement.findAll({
    attributes: ['agent_id', 'type', [fn('SUM', col('amount')), 'total']],
    where: { agent_id: { [Op.in]: agentIds } },
    group: ['agent_id', 'type'],
    raw: true
  });
  const map = {}; // { agentId: { payin, payout } }
  rows.forEach((r) => {
    const a = map[r.agent_id] || { payin: 0, payout: 0 };
    a[r.type] = round2(r.total);
    map[r.agent_id] = a;
  });
  return map;
}

/**
 * GET /admin/agent-commission
 * Summary row per agent: accrued / settled / payable for payin and payout.
 */
const getAgentCommissionSummary = async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { user_type: 'agent' },
      attributes: ['id', 'name', 'user_name'],
      raw: true
    });
    if (!agents.length) {
      return res.json({ success: true, data: [] });
    }

    const agentIds = agents.map((a) => a.id);

    // Merchants brought by these agents, and merchant -> agent map.
    const merchants = await User.findAll({
      where: { created_by: { [Op.in]: agentIds } },
      attributes: ['id', 'created_by'],
      raw: true
    });

    const merchantToAgent = {};       // "merchantIdStr" -> agentId
    const merchantCount = {};         // agentId -> count
    merchants.forEach((m) => {
      merchantToAgent[m.id.toString()] = m.created_by;
      merchantCount[m.created_by] = (merchantCount[m.created_by] || 0) + 1;
    });

    const allMerchantIds = Object.keys(merchantToAgent);

    const [payinAgg, payoutAgg, settledMap] = await Promise.all([
      accruedByMerchant(PayinTransaction, allMerchantIds, null),
      accruedByMerchant(PayoutTransaction, allMerchantIds, null),
      settledByAgent(agentIds)
    ]);

    // Fold per-merchant accrual up to per-agent.
    const accrued = {}; // agentId -> { payin, payout }
    const fold = (agg, key) => {
      agg.forEach((row) => {
        const agentId = merchantToAgent[row._id];
        if (!agentId) return;
        const a = accrued[agentId] || { payin: 0, payout: 0 };
        a[key] = round2(a[key] + row.commission);
        accrued[agentId] = a;
      });
    };
    fold(payinAgg, 'payin');
    fold(payoutAgg, 'payout');

    const data = agents.map((agent) => {
      const acc = accrued[agent.id] || { payin: 0, payout: 0 };
      const set = settledMap[agent.id] || { payin: 0, payout: 0 };
      return {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_username: agent.user_name,
        merchant_count: merchantCount[agent.id] || 0,
        payin_accrued: acc.payin,
        payin_settled: set.payin,
        payin_payable: round2(acc.payin - set.payin),
        payout_accrued: acc.payout,
        payout_settled: set.payout,
        payout_payable: round2(acc.payout - set.payout)
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getAgentCommissionSummary:', error);
    res.status(500).json({ success: false, message: 'Error fetching agent commission summary', error: error.message });
  }
};

// Compute all-time payable per type for a single agent (used by summary + settle guard).
async function computeAgentPayable(agentId) {
  const merchants = await User.findAll({
    where: { created_by: agentId },
    attributes: ['id'],
    raw: true
  });
  const merchantIds = merchants.map((m) => m.id.toString());

  const [payinAgg, payoutAgg, settledMap] = await Promise.all([
    accruedByMerchant(PayinTransaction, merchantIds, null),
    accruedByMerchant(PayoutTransaction, merchantIds, null),
    settledByAgent([agentId])
  ]);

  const sum = (agg) => round2(agg.reduce((t, r) => t + r.commission, 0));
  const payinAccrued = sum(payinAgg);
  const payoutAccrued = sum(payoutAgg);
  const set = settledMap[agentId] || { payin: 0, payout: 0 };

  return {
    payin: { accrued: payinAccrued, settled: set.payin, payable: round2(payinAccrued - set.payin) },
    payout: { accrued: payoutAccrued, settled: set.payout, payable: round2(payoutAccrued - set.payout) }
  };
}

/**
 * GET /admin/agent-commission/:agentId
 * Per-merchant breakdown (date-filterable) plus the agent's all-time totals.
 */
const getAgentCommissionDetail = async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    if (!agentId) return res.status(400).json({ success: false, message: 'Invalid agent id' });

    const agent = await User.findOne({
      where: { id: agentId, user_type: 'agent' },
      attributes: ['id', 'name', 'user_name'],
      raw: true
    });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const merchants = await User.findAll({
      where: { created_by: agentId },
      attributes: ['id', 'name', 'user_name'],
      raw: true
    });
    const merchantIds = merchants.map((m) => m.id.toString());
    const dateRange = buildDateFilter(req.query.startDate, req.query.endDate);

    const [payinAgg, payoutAgg, totals] = await Promise.all([
      accruedByMerchant(PayinTransaction, merchantIds, dateRange),
      accruedByMerchant(PayoutTransaction, merchantIds, dateRange),
      computeAgentPayable(agentId)
    ]);

    const payinMap = Object.fromEntries(payinAgg.map((r) => [r._id, r]));
    const payoutMap = Object.fromEntries(payoutAgg.map((r) => [r._id, r]));

    const breakdown = merchants.map((m) => {
      const pi = payinMap[m.id.toString()] || {};
      const po = payoutMap[m.id.toString()] || {};
      return {
        user_id: m.id,
        name: m.name,
        user_name: m.user_name,
        payin_txn_count: pi.count || 0,
        payin_commission: round2(pi.commission || 0),
        payout_txn_count: po.count || 0,
        payout_commission: round2(po.commission || 0)
      };
    });

    res.json({
      success: true,
      data: {
        agent: { agent_id: agent.id, agent_name: agent.name, agent_username: agent.user_name, ...totals },
        merchants: breakdown
      }
    });
  } catch (error) {
    console.error('Error in getAgentCommissionDetail:', error);
    res.status(500).json({ success: false, message: 'Error fetching agent commission detail', error: error.message });
  }
};

/**
 * POST /admin/agent-commission/:agentId/settle
 * Body: { type: 'payin'|'payout', amount, note }
 * Records a settlement that advances the watermark. Guarded so it can never
 * exceed the currently payable amount.
 */
const settleAgentCommission = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const agentId = parseInt(req.params.agentId, 10);
    const { type, amount, note } = req.body;
    const value = parseFloat(amount);

    if (!agentId) { await t.rollback(); return res.status(400).json({ success: false, message: 'Invalid agent id' }); }
    if (!['payin', 'payout'].includes(type)) { await t.rollback(); return res.status(400).json({ success: false, message: "type must be 'payin' or 'payout'" }); }
    if (!value || value <= 0) { await t.rollback(); return res.status(400).json({ success: false, message: 'amount must be greater than 0' }); }

    const agent = await User.findOne({ where: { id: agentId, user_type: 'agent' }, attributes: ['id'], raw: true });
    if (!agent) { await t.rollback(); return res.status(404).json({ success: false, message: 'Agent not found' }); }

    // Recompute payable at settlement time so concurrent settles can't overdraw.
    const totals = await computeAgentPayable(agentId);
    const payable = totals[type].payable;
    if (value > payable + 0.001) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Amount exceeds payable ${type} commission (${payable.toFixed(2)})` });
    }

    const record = await AgentCommissionSettlement.create({
      agent_id: agentId,
      type,
      amount: round2(value),
      note: note || null,
      settled_by: req.user?.id || null
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Commission settled successfully', data: { id: record.id } });
  } catch (error) {
    await t.rollback();
    console.error('Error in settleAgentCommission:', error);
    res.status(500).json({ success: false, message: 'Error settling commission', error: error.message });
  }
};

/**
 * GET /admin/agent-commission/:agentId/settlements
 */
const getAgentSettlements = async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    if (!agentId) return res.status(400).json({ success: false, message: 'Invalid agent id' });

    const rows = await AgentCommissionSettlement.findAll({
      where: { agent_id: agentId },
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
    console.error('Error in getAgentSettlements:', error);
    res.status(500).json({ success: false, message: 'Error fetching settlements', error: error.message });
  }
};

/**
 * POST /admin/agent-commission/:agentId/report
 * Enqueue an Excel report job (generated by the background worker).
 */
const createCommissionReport = async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    if (!agentId) return res.status(400).json({ success: false, message: 'Invalid agent id' });

    const agent = await User.findOne({ where: { id: agentId, user_type: 'agent' }, attributes: ['id', 'user_name'], raw: true });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const body = req.body || {};
    const job = await commissionReportQueue.add(
      {
        agentId,
        agentUsername: agent.user_name,
        startDate: req.query.startDate || body.startDate || null,
        endDate: req.query.endDate || body.endDate || null,
        // Optional override rates (%). Blank => worker falls back to each
        // merchant's configured agent charge. Applies to historical txns too.
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

    const rawState = await job.getState(); // waiting | active | completed | failed | delayed
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
 * Streams the finished .xlsx from local disk.
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
  getAgentCommissionDetail,
  settleAgentCommission,
  getAgentSettlements,
  createCommissionReport,
  getReportStatus,
  downloadReport
};
