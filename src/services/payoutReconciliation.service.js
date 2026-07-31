const axios = require('axios');
const { logger } = require('../utils/logger');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { TransactionCharges, FinancialDetails, MerchantDetails } = require('../models');
const { bluswapTransactionStatus } = require('../transactionStatusCheck/TransactionCheck');
const { recordTraceEvent, STAGES } = require('./transactionTrace.service');

/**
 * Post a payout status update to the merchant's registered callback URL.
 * Retries with exponential backoff. Returns true if delivered, false otherwise.
 */
async function sendMerchantPayoutCallback(callbackUrl, callbackData) {
  const maxRetries = 3;
  const baseDelay = 2000;

  // Print the exact payload being POSTed so it's visible in the server terminal / PM2 logs.
  // console.log('===== Payout webhook send =====');
  // console.log('URL   :', callbackUrl);
  // console.log('BODY  :', JSON.stringify(callbackData, null, 2));
  // console.log('===============================');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptStartedAt = Date.now();
    recordTraceEvent({
      reference_id: callbackData.reference_id, trace_type: 'payout', stage: STAGES.MERCHANT_CALLBACK_ATTEMPT,
      status: 'pending', source: 'worker', attempt,
      http: { method: 'POST', url: callbackUrl },
      detail: `Posting result to merchant callback (attempt ${attempt}/${maxRetries})`
    });
    try {
      const response = await axios.post(callbackUrl, callbackData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      logger.info('Payout callback sent to merchant', {
        reference_id: callbackData.reference_id,
        callback_url: callbackUrl,
        response_status: response.status,
        attempt
      });
      recordTraceEvent({
        reference_id: callbackData.reference_id, trace_type: 'payout', stage: STAGES.MERCHANT_CALLBACK_SENT,
        status: 'ok', source: 'worker', attempt,
        http: { method: 'POST', url: callbackUrl, status_code: response.status },
        latency_ms: Date.now() - attemptStartedAt, detail: 'Merchant acknowledged'
      });
      return true;
    } catch (error) {
      logger.warn('Payout callback attempt failed', {
        reference_id: callbackData.reference_id,
        callback_url: callbackUrl,
        error: error.message,
        response_status: error.response?.status,
        attempt,
        maxRetries
      });
      recordTraceEvent({
        reference_id: callbackData.reference_id, trace_type: 'payout', stage: STAGES.MERCHANT_CALLBACK_ATTEMPT,
        status: 'failed', source: 'worker', attempt,
        http: { method: 'POST', url: callbackUrl, status_code: error.response?.status || null },
        latency_ms: Date.now() - attemptStartedAt, detail: `Attempt ${attempt} failed`, error: error.message
      });
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
  }

  logger.error('Failed to send payout callback after all retries', {
    reference_id: callbackData.reference_id,
    callback_url: callbackUrl
  });
  recordTraceEvent({
    reference_id: callbackData.reference_id, trace_type: 'payout', stage: STAGES.MERCHANT_CALLBACK_FAILED,
    status: 'failed', source: 'worker', http: { method: 'POST', url: callbackUrl },
    detail: 'Merchant payout callback failed after all retries'
  });
  return false;
}

/**
 * Idempotently finalize a payout that is currently in a non-terminal state.
 *
 * Used by BOTH the gateway callback worker and the manual reconciliation routes,
 * so a stuck payout resolves identically regardless of what triggers it.
 *
 * A conditional (status: pending|processing) update acts as an atomic claim:
 * whichever caller wins performs the side effects (charges update, refund,
 * merchant callback) exactly once. Any later caller sees a terminal status and
 * short-circuits, preventing double refunds / duplicate callbacks.
 *
 * @returns {{ changed: boolean, reason?: string, newStatus?: string, callbackSent?: boolean }}
 */
async function finalizePayout({ referenceId, isSuccess, utr = null, gatewayTransactionId = null, message = null, notifyMerchant = true }) {
  const payout = await PayoutTransaction.findOne({ reference_id: referenceId });
  if (!payout) {
    return { changed: false, reason: 'not_found' };
  }
  if (!['pending', 'processing'].includes(payout.status)) {
    return { changed: false, reason: 'already_finalized', currentStatus: payout.status };
  }

  const userId = payout.user.user_id;
  const dbStatus = isSuccess ? 'completed' : 'failed';
  const gatewayStatus = isSuccess ? 'success' : 'failed';
  const finalMessage = message || (isSuccess ? 'Transaction processed' : 'Transaction failed');

  // Atomic claim — only one caller may transition it out of a non-terminal state
  const claim = await PayoutTransaction.updateOne(
    { reference_id: referenceId, status: { $in: ['pending', 'processing'] } },
    {
      $set: {
        status: dbStatus,
        gateway_response: {
          merchant_response: gatewayTransactionId,
          status: gatewayStatus,
          message: finalMessage,
          utr
        }
      }
    }
  );

  if (claim.modifiedCount === 0) {
    // Someone else (worker or a concurrent reconcile) already finalized it
    return { changed: false, reason: 'already_finalized' };
  }

  await TransactionCharges.update(
    { status: dbStatus, transaction_utr: utr },
    { where: { reference_id: referenceId } }
  );

  // Refund the full deducted amount (amount + charges + gst + platform fee) on failure
  if (!isSuccess) {
    const refundAmount = parseFloat((
      parseFloat(payout.amount || 0) +
      parseFloat(payout.charges?.total_charges || 0) +
      parseFloat(payout.gst_amount || 0) +
      parseFloat(payout.platform_fee || 0)
    ).toFixed(2));

    // Atomic credit — MUST NOT read-then-write. A failed-payout refund can race
    // with a concurrent debit (another payout) or another refund for the same
    // merchant; an absolute write would clobber the other and drift the balance.
    // increment issues a single `SET settlement = settlement + :refundAmount`, so
    // concurrent balance changes compose correctly.
    await FinancialDetails.increment(
      'settlement',
      { by: refundAmount, where: { user_id: parseInt(userId, 10) } }
    );

    const financial = await FinancialDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
    logger.info('Settlement refunded for failed payout', {
      reference_id: referenceId,
      user_id: userId,
      amount_refunded: refundAmount,
      new_settlement_balance: financial ? parseFloat(financial.settlement) : null
    });
  }

  recordTraceEvent({
    reference_id: referenceId, trace_type: 'payout', stage: STAGES.LEDGER_UPDATED,
    status: isSuccess ? 'ok' : 'failed', source: 'worker',
    detail: isSuccess ? 'Payout marked completed' : 'Payout marked failed, settlement refunded',
    payload: { new_status: dbStatus, utr }
  });

  // Notify the merchant of the resolved status. Skipped for synchronous
  // rejections at creation time, where the caller already returns the failure
  // in the HTTP response and a webhook would be redundant.
  let callbackSent = false;
  const merchantDetails = notifyMerchant
    ? await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } })
    : null;
  if (notifyMerchant && merchantDetails?.payout_callback) {
    callbackSent = await sendMerchantPayoutCallback(merchantDetails.payout_callback, {
      reference_id: referenceId,
      type: 'payout',
      status: gatewayStatus,
      amount: payout.amount,
      utr,
      // Standardized message — do not forward the gateway's own text, which may
      // expose the acquirer/gateway name to the merchant.
      message: isSuccess ? 'Transaction processed' : 'Transaction failed',
      timestamp: new Date().toISOString()
    });
  } else if (notifyMerchant) {
    logger.warn('No payout callback URL configured for merchant', { reference_id: referenceId, user_id: userId });
  }

  return { changed: true, newStatus: dbStatus, callbackSent };
}

/**
 * Reconcile one payout by querying the gateway's status API and finalizing it
 * if the gateway reports a terminal status. Safe to call on any payout — it
 * no-ops when the gateway still reports pending or the payout is already done.
 *
 * @param {Object} payoutTransaction - a PayoutTransaction doc or lean object
 */
async function reconcilePayoutTransaction(payoutTransaction) {
  const referenceId = payoutTransaction.reference_id;
  const userId = payoutTransaction.user?.user_id;

  const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
  const merchantName = merchantDetails?.payout_merchant_name;

  let derived, utr = null, gatewayTransactionId = null, message = null;

  if (merchantName === 'BluSwap') {
    const statusResult = await bluswapTransactionStatus(referenceId);
    const gatewayData = statusResult?.data?.response?.data || {};
    derived = statusResult?.data?.status; // 'success' | 'failed' | 'pending'
    utr = gatewayData.utr || null;
    gatewayTransactionId = gatewayData.bluswap_transaction_id || null;
    message = gatewayData.status_description || null;
  } else {
    return { referenceId, changed: false, reason: 'unsupported_gateway', merchant: merchantName || null };
  }

  if (derived !== 'success' && derived !== 'failed') {
    return { referenceId, changed: false, reason: 'still_pending', gatewayStatus: derived || 'unknown' };
  }

  recordTraceEvent({
    reference_id: referenceId, trace_type: 'payout', stage: STAGES.RECONCILED,
    status: derived === 'success' ? 'ok' : 'failed', source: 'reconcile', gateway_name: merchantName,
    detail: `Reconcile resolved gateway status: ${derived}`, payload: { utr, gatewayTransactionId }
  });

  const result = await finalizePayout({
    referenceId,
    isSuccess: derived === 'success',
    utr,
    gatewayTransactionId,
    message
  });

  return { referenceId, gatewayStatus: derived, ...result };
}

module.exports = {
  finalizePayout,
  sendMerchantPayoutCallback,
  reconcilePayoutTransaction
};
