/**
 * Payin reconciliation worker.
 *
 * Runs as its OWN PM2 process (like callback.worker.js). Every N minutes it:
 *   1. Finds payins still "not final" (status in {pending, payin_qr_generated})
 *      that are older than the reconcile window.
 *   2. Re-hits the transaction's gateway status-check API (AirPay / HDFC / Razorpay).
 *   3. Finalizes each one by enqueueing onto the SHARED callbackQueue — the same
 *      path a real gateway callback takes — so wallet credit, ledger, merchant
 *      webhook, trace events and idempotency are all reused, never duplicated:
 *        - gateway says success            -> enqueue as TXN  (credit + notify)
 *        - gateway says failed OR still
 *          pending/processing after window -> enqueue as FAILED (mark failed + notify)
 *
 * Transactions on a legacy/unknown gateway (no external status API) are SKIPPED —
 * there is no source of truth, so we never fail them on age alone.
 *
 * Scheduling uses a Bull REPEATABLE (cron) job so it survives restarts and
 * single-fires across multiple deployed instances.
 *
 * Tunables (env):
 *   PAYIN_RECON_CRON          cron expr           (default '*​/30 * * * *' — every 30 min)
 *   PAYIN_RECON_AGE_MINUTES   min age to sweep    (default 30)
 *   PAYIN_RECON_BATCH_LIMIT   max txns per run    (default 500)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { callbackQueue, payinReconciliationQueue } = require('../config/queue.config');
const { connectMongo } = require('../config/mongoConnect');
const { logger } = require('../utils/logger');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const PayinTransaction = require('../models/payinTransaction.model');
const { checkPayinStatus, SUPPORTED_PAYIN_GATEWAYS } = require('../services/payinStatusCheck.service');
const { sendTelegramMessage, escapeHtml } = require('../services/telegram.service');

const RECONCILE_CRON = process.env.PAYIN_RECON_CRON || '*/30 * * * *';
const AGE_MINUTES = parseInt(process.env.PAYIN_RECON_AGE_MINUTES || '30', 10);
const BATCH_LIMIT = parseInt(process.env.PAYIN_RECON_BATCH_LIMIT || '500', 10);
const NON_FINAL_STATUSES = ['pending', 'payin_qr_generated'];

payinReconciliationQueue.setMaxListeners(0);
payinReconciliationQueue.on('error', (error) => {
  logger.error('Payin reconciliation queue error:', error);
});

connectMongo()
  .then(() => logger.info('MongoDB connected successfully in payin reconciliation worker'))
  .catch((err) => {
    logger.error('MongoDB connection error in payin reconciliation worker:', err);
    process.exit(1);
  });

/**
 * Enqueue a synthetic callback onto callbackQueue, shaped exactly like the real
 * gateway-callback jobs the callback worker already consumes.
 * @param {'TXN'|'FAILED'} statuscode
 */
function enqueueCallback(statuscode, txn, result, failureReason) {
  const isSuccess = statuscode === 'TXN';
  return callbackQueue.add(
    {
      statuscode,
      amount: (isSuccess && result?.amount != null) ? result.amount : txn.amount,
      apitxnid: txn.reference_id,
      txnid: txn.transaction_id,
      utr: isSuccess ? (result?.utr || null) : null,
      message: isSuccess ? 'Transaction processed' : 'Transaction failed',
      failureReason: failureReason || null,
      rawBody: result?.raw || null,
    },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
}

payinReconciliationQueue.process(async function (job) {
  const runStart = Date.now();
  const cutoff = new Date(Date.now() - AGE_MINUTES * 60 * 1000);

  const stale = await PayinTransaction.find({
    status: { $in: NON_FINAL_STATUSES },
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  const stats = { scanned: stale.length, checked: 0, completed: 0, failed: 0, autoFailed: 0, skipped: 0, errored: 0 };
  logger.info('Payin reconciliation run started', { jobId: job.id, cutoff, ageMinutes: AGE_MINUTES, candidates: stale.length });

  // Alert the Telegram channel that a sweep has kicked off. Best-effort &
  // non-throwing — a failed alert must never break the reconciliation run.
  sendTelegramMessage(
    `🔄 <b>Payin reconciliation started</b>\n` +
    `Candidates: <b>${escapeHtml(stale.length)}</b> (not-final &amp; older than ${escapeHtml(AGE_MINUTES)}m)\n` +
    `Cutoff: <code>${escapeHtml(cutoff.toISOString())}</code>`
  );

  for (const txn of stale) {
    const gateway = txn.metadata?.gateway_name;

    // No external status API for legacy/unknown gateways -> leave untouched.
    if (!SUPPORTED_PAYIN_GATEWAYS.includes(gateway)) {
      stats.skipped++;
      continue;
    }

    let result;
    try {
      result = await checkPayinStatus({ gateway, reference_id: txn.reference_id });
    } catch (err) {
      // Network/gateway error: skip this run, it will be retried next sweep.
      stats.errored++;
      logger.warn('Payin status check failed, will retry next run', {
        reference_id: txn.reference_id, gateway, error: err.message, status_code: err.response?.status,
      });
      continue;
    }

    stats.checked++;
    const s = result.normalizedStatus;

    try {
      if (s === 'success') {
        await enqueueCallback('TXN', txn, result, null);
        stats.completed++;
        recordTraceEvent({
          reference_id: txn.reference_id, trace_type: 'payin', stage: STAGES.RECONCILED,
          status: 'ok', source: 'worker', gateway_name: gateway,
          detail: 'Reconcile: gateway confirmed success, enqueued for completion',
          payload: { previous_status: txn.status, gateway_status: s },
        });
      } else {
        // failed, pending or processing -> per policy, after the window this is FAILED.
        const auto = s !== 'failed';
        const reason = auto
          ? `Auto-failed by reconciliation: still ${s} after ${AGE_MINUTES}m`
          : 'Gateway reported failure';
        await enqueueCallback('FAILED', txn, result, reason);
        stats.failed++;
        if (auto) stats.autoFailed++;
        recordTraceEvent({
          reference_id: txn.reference_id, trace_type: 'payin', stage: STAGES.RECONCILED,
          status: 'failed', source: 'worker', gateway_name: gateway,
          detail: reason,
          payload: { previous_status: txn.status, gateway_status: s },
        });
      }
    } catch (err) {
      stats.errored++;
      logger.error('Failed to enqueue reconciliation callback', { reference_id: txn.reference_id, error: err.message });
    }
  }

  const durationMs = Date.now() - runStart;
  logger.info('Payin reconciliation run finished', { jobId: job.id, ...stats, durationMs });

  // Completion summary to the Telegram channel. Best-effort & non-throwing.
  sendTelegramMessage(
    `✅ <b>Payin reconciliation finished</b>\n` +
    `Checked: <b>${escapeHtml(stats.checked)}</b> · ` +
    `Completed: <b>${escapeHtml(stats.completed)}</b> · ` +
    `Failed: <b>${escapeHtml(stats.failed)}</b> (auto ${escapeHtml(stats.autoFailed)})\n` +
    `Skipped: ${escapeHtml(stats.skipped)} · Errors: ${escapeHtml(stats.errored)} · ` +
    `Took ${escapeHtml((durationMs / 1000).toFixed(1))}s`
  );

  return stats;
});

/**
 * Register exactly one repeatable job for the current cron. On boot we clear any
 * previously-registered repeatables (their cron may have changed via env) and add
 * a fresh one, so there is never a duplicate or stale schedule.
 */
async function scheduleRepeatable() {
  try {
    const existing = await payinReconciliationQueue.getRepeatableJobs();
    await Promise.all(existing.map((r) => payinReconciliationQueue.removeRepeatableByKey(r.key)));
    await payinReconciliationQueue.add(
      {},
      { repeat: { cron: RECONCILE_CRON }, removeOnComplete: true, removeOnFail: 50 }
    );
    logger.info('Payin reconciliation schedule registered', { cron: RECONCILE_CRON, ageMinutes: AGE_MINUTES, batchLimit: BATCH_LIMIT });
  } catch (err) {
    logger.error('Failed to register payin reconciliation schedule', { error: err.message });
    process.exit(1);
  }
}
scheduleRepeatable();

payinReconciliationQueue.on('completed', (job, result) => {
  logger.info('Payin reconciliation job completed', { jobId: job.id, result });
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down payin reconciliation worker...');
  await mongoose.connection.close();
  await payinReconciliationQueue.close();
  process.exit(0);
});

logger.info('Payin reconciliation worker started');
