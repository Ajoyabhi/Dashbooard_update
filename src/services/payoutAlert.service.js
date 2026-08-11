const config = require('../config/config');
const { logger } = require('../utils/logger');
const { sendTelegramMessage, escapeHtml } = require('./telegram.service');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { User } = require('../models');

/** Format an amount as Indian-grouped rupees, e.g. 125000 -> "₹1,25,000". */
function formatAmount(amount) {
  const n = Number(amount || 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Format a Date in IST for human-readable alerts. */
function formatIst(date) {
  if (!date) return 'unknown';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

/** Turn a millisecond gap into "2h 15m" / "3d 4h" style text. */
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/**
 * Fire a one-time "wake-up" Telegram alert when a merchant resumes payouts
 * after a quiet period longer than the configured pause window.
 *
 * Best-effort and non-throwing — safe to call fire-and-forget right after a
 * payout is created. It never blocks or breaks the payout flow.
 *
 * @param {Object} params
 * @param {Object} params.user    Sequelize User (must carry payout_alert_enabled).
 * @param {Object} params.payout  The freshly-created PayoutTransaction doc.
 */
async function notifyPayoutWakeup({ user, payout }) {
  try {
    if (!user || !user.payout_alert_enabled) return;

    const pauseMs = (config.telegram?.payoutAlertPauseMinutes || 120) * 60 * 1000;
    const currentTime = payout.createdAt ? new Date(payout.createdAt) : new Date();

    // The most recent *prior* payout for this merchant (exclude the one we just
    // created). If there is none, this is their first payout ever — treat as a
    // wake-up. Otherwise only alert when the gap exceeds the pause window.
    const previous = await PayoutTransaction.findOne({
      'user.user_id': String(payout.user.user_id),
      _id: { $ne: payout._id }
    })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    let gapText;
    if (previous && previous.createdAt) {
      const gapMs = currentTime - new Date(previous.createdAt);
      if (gapMs <= pauseMs) return; // still active — stay silent
      gapText = `after a pause of ${formatDuration(gapMs)}`;
    } else {
      gapText = '(first payout)';
    }

    const merchantName = escapeHtml(payout.user?.name || user.name || 'Unknown merchant');
    const message =
      `🟢 <b>Payout resumed</b> ${escapeHtml(gapText)}\n\n` +
      `<b>Merchant:</b> ${merchantName} (ID ${escapeHtml(payout.user.user_id)})\n` +
      `<b>Amount:</b> ${escapeHtml(formatAmount(payout.amount))}\n` +
      `<b>Reference:</b> <code>${escapeHtml(payout.reference_id)}</code>\n` +
      `<b>Time:</b> ${escapeHtml(formatIst(currentTime))}`;

    await sendTelegramMessage(message);
  } catch (error) {
    logger.error('notifyPayoutWakeup failed', { error: error.message, reference_id: payout?.reference_id });
  }
}

/**
 * Fire a Telegram alert when a payout fails, if the merchant has alerts enabled.
 * Best-effort and non-throwing.
 *
 * @param {Object} params
 * @param {Object} params.payout  The PayoutTransaction doc (lean or hydrated).
 * @param {string} [params.reason] Optional failure reason/message.
 */
async function notifyPayoutFailure({ payout, reason }) {
  try {
    if (!payout || !payout.user) return;

    const userId = payout.user.user_id;
    const merchant = await User.findByPk(parseInt(userId, 10), {
      attributes: ['name', 'payout_alert_enabled']
    });
    if (!merchant || !merchant.payout_alert_enabled) return;

    const merchantName = escapeHtml(payout.user?.name || merchant.name || 'Unknown merchant');
    const message =
      `🔴 <b>Payout failed</b>\n\n` +
      `<b>Merchant:</b> ${merchantName} (ID ${escapeHtml(userId)})\n` +
      `<b>Amount:</b> ${escapeHtml(formatAmount(payout.amount))}\n` +
      `<b>Reference:</b> <code>${escapeHtml(payout.reference_id)}</code>\n` +
      `<b>Reason:</b> ${escapeHtml(reason || 'Transaction failed')}\n` +
      `<b>Time:</b> ${escapeHtml(formatIst(new Date()))}`;

    await sendTelegramMessage(message);
  } catch (error) {
    logger.error('notifyPayoutFailure failed', { error: error.message, reference_id: payout?.reference_id });
  }
}

module.exports = { notifyPayoutWakeup, notifyPayoutFailure };
