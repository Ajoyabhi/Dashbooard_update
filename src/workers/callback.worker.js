const { callbackQueue, bluswapPayoutQueue, mizorpayPayoutQueue, dummyPayoutQueue } = require('../config/queue.config');
const { finalizePayout } = require('../services/payoutReconciliation.service');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { checkPayinStatus, SUPPORTED_PAYIN_GATEWAYS } = require('../services/payinStatusCheck.service');
const { TransactionCharges, FinancialDetails, MerchantDetails } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');
const axios = require('axios');

// Configure queue with retry and timeout settings
callbackQueue.setMaxListeners(0); // Prevent memory leaks
callbackQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

// Connect to MongoDB (shared, warm-pooled, Atlas-correct connector)
const { connectMongo } = require('../config/mongoConnect');
connectMongo()
  .then(() => {
    logger.info('MongoDB connected successfully in callback worker');
  })
  .catch((err) => {
    logger.error('MongoDB connection error in callback worker:', err);
    process.exit(1);
  });

// Process callback jobs
callbackQueue.process(async function (job) {
  const startTime = Date.now();
  let timeout = null;
  try {
    logger.info('Processing callback job', { jobId: job.id, attempts: job.attemptsMade });

    timeout = setTimeout(() => {
      logger.error('Job processing timeout', { jobId: job.id });
      throw new Error('Job processing timeout');
    }, 300000);

    const { statuscode, amount, apitxnid, txnid, message, rawBody, failureReason } = job.data;
    let utr = job.data.utr;

    let mappedStatus = (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';

    const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });

    if (!payinTransaction) {
      logger.error('PayinTransaction not found', { jobId: job.id, apitxnid });
      throw new Error('Transaction record not found');
    }

    // Guard against FALSE 'FAILED' callbacks. HDFC (and potentially other gateways)
    // have been observed pushing a FAILED callback for a payment they actually
    // CHARGED — which would mark a real success as failed and never credit the
    // merchant. Before failing, verify the AUTHORITATIVE gateway status; if it
    // reports success, treat the payment as completed and use the gateway's UTR.
    if (mappedStatus === 'failed') {
      const gw = payinTransaction.metadata?.gateway_name;
      if (gw && SUPPORTED_PAYIN_GATEWAYS.includes(gw)) {
        try {
          const check = await checkPayinStatus({ gateway: gw, reference_id: apitxnid });
          if (check.normalizedStatus === 'success') {
            logger.warn('Callback reported FAILED but gateway reports SUCCESS — overriding to completed', {
              jobId: job.id, apitxnid, gateway: gw, gatewayUtr: check.utr,
            });
            mappedStatus = 'completed';
            utr = check.utr || utr;
            recordTraceEvent({
              reference_id: apitxnid, trace_type: 'payin', stage: STAGES.RECONCILED,
              status: 'ok', source: 'worker', gateway_name: gw,
              detail: 'False FAILED callback overridden: gateway pg-check reports success',
              payload: { gatewayUtr: check.utr },
            });
          }
        } catch (e) {
          logger.warn('pg-check verification on FAILED callback errored; proceeding with callback status', {
            jobId: job.id, apitxnid, error: e.message,
          });
        }
      }
    }

    const userId = payinTransaction.user.user_id;
    const alreadyCompleted = payinTransaction.status === 'completed';

    // Only credit wallet if not already done
    if (!alreadyCompleted) {
      // Use the transaction's real gateway (set at initiation) — the inbound
      // `message` from the controller is derived from the callback endpoint and
      // can be wrong (e.g. "HDFC UPI payment" for a Razorpay txn).
      const gatewayName = payinTransaction.metadata?.gateway_name || null;

      const updateData = {
        status: mappedStatus,
        gateway_response: {
          utr,
          status: mappedStatus,
          message: gatewayName ? `${gatewayName} UPI payment` : (message || 'Transaction processed'),
          // Store the acquirer's failure reason so admin/user can see WHY it failed.
          failure_reason: mappedStatus === 'failed' ? (failureReason || null) : null,
          // Persist the ORIGINAL gateway payload (falls back to the normalized job
          // data for older callbacks that didn't forward rawBody).
          raw_response: rawBody || job.data
        }
      };

      if (mappedStatus === 'completed') {
        const transactionAmount = parseFloat(amount || 0);
        const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
        const platformFee = parseFloat(payinTransaction.platform_fee || 0);
        const gstAmount = parseFloat(payinTransaction.gst_amount || 0);
        const amountToAdd = transactionAmount - adminCharge - platformFee - gstAmount;

        const financialDetails = await FinancialDetails.findOne({ where: { user_id: userId } });
        if (financialDetails) {
          await financialDetails.increment('wallet', { by: amountToAdd });
        } else {
          await FinancialDetails.create({ user_id: userId, wallet: amountToAdd, settlement: 0, lien: 0, rolling_reserve: 0 });
        }
        logger.info('Wallet updated', { user_id: userId, amountToAdd, reference_id: apitxnid });
      }

      await Promise.all([
        PayinTransaction.updateOne({ reference_id: apitxnid }, { $set: updateData }),
        TransactionCharges.update(
          { status: mappedStatus, transaction_utr: utr },
          { where: { reference_id: apitxnid } }
        )
      ]);
      logger.info('Transaction records updated', { jobId: job.id, apitxnid, status: mappedStatus });
      recordTraceEvent({
        reference_id: apitxnid, trace_type: 'payin', stage: STAGES.LEDGER_UPDATED,
        status: mappedStatus === 'completed' ? 'ok' : 'failed', source: 'worker',
        detail: mappedStatus === 'completed' ? 'Wallet credited, transaction marked completed' : 'Transaction marked failed',
        payload: { new_status: mappedStatus, utr }
      });
    } else {
      logger.warn('Wallet already credited — skipping, will still attempt webhook', { jobId: job.id, apitxnid });
    }

    // Always attempt webhook — even if wallet was already credited
    // Skip only if webhook was already successfully delivered
    const webhookAlreadySent = !!payinTransaction.metadata?.callback_received_at;
    if (webhookAlreadySent) {
      logger.info('Webhook already delivered, skipping', { jobId: job.id, apitxnid });
      clearTimeout(timeout);
      return { success: true, reference_id: apitxnid, status: mappedStatus, skipped: true };
    }

    const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });

    if (merchantDetails?.payin_callback) {
      const maxRetries = 3;
      const baseDelay = 1000;

      const callbackData = {
        reference_id: apitxnid,
        type: 'payin',
        status: mappedStatus === 'completed' ? 'success' : 'failed',
        amount,
        utr,
        // Standardized, gateway-agnostic message — never forward the acquirer's
        // own text (it can contain the gateway/bank name, e.g. "HDFC UPI payment").
        message: mappedStatus === 'completed' ? 'Transaction processed' : 'Transaction failed',
        timestamp: new Date().toISOString()
      };

      let webhookSent = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const attemptStartedAt = Date.now();
        recordTraceEvent({
          reference_id: apitxnid, trace_type: 'payin', stage: STAGES.MERCHANT_CALLBACK_ATTEMPT,
          status: 'pending', source: 'worker', attempt,
          http: { method: 'POST', url: merchantDetails.payin_callback },
          detail: `Posting result to merchant callback (attempt ${attempt}/${maxRetries})`
        });
        try {
          const response = await axios.post(merchantDetails.payin_callback, callbackData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          logger.info('Merchant callback sent', { reference_id: apitxnid, status: response.status, attempt });

          await PayinTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: { 'metadata.callback_received_at': new Date() } }
          );
          recordTraceEvent({
            reference_id: apitxnid, trace_type: 'payin', stage: STAGES.MERCHANT_CALLBACK_SENT,
            status: 'ok', source: 'worker', attempt,
            http: { method: 'POST', url: merchantDetails.payin_callback, status_code: response.status },
            latency_ms: Date.now() - attemptStartedAt, detail: 'Merchant acknowledged'
          });
          webhookSent = true;
          break;
        } catch (error) {
          logger.warn('Callback attempt failed', {
            reference_id: apitxnid,
            error: error.message,
            response_status: error.response?.status,
            response_body: error.response?.data,
            attempt
          });
          recordTraceEvent({
            reference_id: apitxnid, trace_type: 'payin', stage: STAGES.MERCHANT_CALLBACK_ATTEMPT,
            status: 'failed', source: 'worker', attempt,
            http: { method: 'POST', url: merchantDetails.payin_callback, status_code: error.response?.status || null },
            latency_ms: Date.now() - attemptStartedAt, detail: `Attempt ${attempt} failed`, error: error.message
          });
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
          }
        }
      }

      if (!webhookSent) {
        recordTraceEvent({
          reference_id: apitxnid, trace_type: 'payin', stage: STAGES.MERCHANT_CALLBACK_FAILED,
          status: 'failed', source: 'worker',
          http: { method: 'POST', url: merchantDetails.payin_callback },
          detail: `Merchant webhook delivery failed after ${maxRetries} attempts`
        });
        // Throw so Bull retries the whole job — webhook delivery is mandatory
        throw new Error(`Merchant webhook delivery failed for ${apitxnid} after ${maxRetries} attempts`);
      }
    } else {
      logger.warn('No payin callback URL for merchant', { reference_id: apitxnid, user_id: userId });
    }

    // Clear timeout on successful completion
    if (timeout) {
      clearTimeout(timeout);
    }

    const processingTime = Date.now() - startTime;
    logger.info('Callback processed successfully', {
      reference_id: apitxnid,
      status: mappedStatus,
      utr,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      reference_id: apitxnid,
      status: mappedStatus
    };

  } catch (error) {
    // Clear timeout in case of error
    if (timeout) {
      clearTimeout(timeout);
    }

    logger.error('Error processing callback', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });

    if (job.attemptsMade >= 3) {
      logger.error('Job failed permanently after max retries', {
        jobId: job.id,
        attempts: job.attemptsMade
      });
      return { success: false, error: 'Max retries exceeded' };
    }

    throw error;
  }
});

// Handle job events
callbackQueue.on('completed', (job, result) => {
  logger.info('Callback job completed successfully', {
    jobId: job.id,
    result
  });
});

callbackQueue.on('failed', (job, error) => {
  logger.error('Callback job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

callbackQueue.on('stalled', (job) => {
  logger.warn('Callback job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});

bluswapPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing bluswap payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is bluswap payout job data", job.data)

    const trxStatus = (job.data.data?.trx_status || '').toUpperCase();
    const referenceId = job.data.data?.order_id;
    const utr = job.data.data?.utr || null;
    const bluswapTransactionId = job.data.data?.transaction_id || null;
    const isSuccess = trxStatus === 'SUCCESS';

    // Shared, idempotent finalization — same path used by the reconcile routes.
    // Guards against double refund / duplicate callback if a late webhook and a
    // manual reconcile race each other.
    const result = await finalizePayout({
      referenceId,
      isSuccess,
      utr,
      gatewayTransactionId: bluswapTransactionId,
      message: job.data.data?.trx_message || job.data.message || null
    });

    logger.info('BluSwap payout finalized via callback', { jobId: job.id, referenceId, result });
    return { success: true, jobId: job.id, ...result };
  } catch (error) {
    logger.error('Error processing bluswap payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

bluswapPayoutQueue.on('completed', (job, result) => {
  logger.info('BluSwap payout job completed successfully', {
    jobId: job.id,
    result
  });
});

bluswapPayoutQueue.on('failed', (job, error) => {
  logger.error('BluSwap payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

bluswapPayoutQueue.on('stalled', (job) => {
  logger.warn('BluSwap payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


mizorpayPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing mizorpay payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });

    // MizorPay result callback (contract §3):
    // { reference_id, status: 'TXN'|'FAILED', utr, amount, payment_id, error_message }
    const status = String(job.data?.status || '').toUpperCase();
    const referenceId = job.data?.reference_id;
    const utr = job.data?.utr || null;
    const paymentId = job.data?.payment_id || null;
    const isSuccess = status === 'TXN';

    // Shared, idempotent finalization — same path used by BluSwap and the
    // reconcile routes. Guards against double refund / duplicate merchant
    // callback if a late webhook and a manual reconcile race each other.
    const result = await finalizePayout({
      referenceId,
      isSuccess,
      utr,
      gatewayTransactionId: paymentId,
      message: job.data?.error_message || null
    });

    logger.info('MizorPay payout finalized via callback', { jobId: job.id, referenceId, result });
    return { success: true, jobId: job.id, ...result };
  } catch (error) {
    logger.error('Error processing mizorpay payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

mizorpayPayoutQueue.on('completed', (job, result) => {
  logger.info('MizorPay payout job completed successfully', { jobId: job.id, result });
});

mizorpayPayoutQueue.on('failed', (job, error) => {
  logger.error('MizorPay payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

mizorpayPayoutQueue.on('stalled', (job) => {
  logger.warn('MizorPay payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


// Dummy/test payout — the simulated async settlement "callback".
// Enqueued (with a delay) by dummy_payout_request.js instead of arriving from a
// real gateway. Finalizes through the SAME idempotent finalizePayout() path as
// BluSwap/MizorPay, so the ledger update + standard merchant callback are
// identical to production. Always success (synthetic UTR) per configuration.
dummyPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing dummy payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });

    const { referenceId, isSuccess, utr, gatewayTransactionId } = job.data;

    const result = await finalizePayout({
      referenceId,
      isSuccess: isSuccess !== false,
      utr: utr || null,
      gatewayTransactionId: gatewayTransactionId || null
    });

    logger.info('Dummy payout finalized via simulated callback', { jobId: job.id, referenceId, result });
    return { success: true, jobId: job.id, ...result };
  } catch (error) {
    logger.error('Error processing dummy payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

dummyPayoutQueue.on('completed', (job, result) => {
  logger.info('Dummy payout job completed successfully', { jobId: job.id, result });
});

dummyPayoutQueue.on('failed', (job, error) => {
  logger.error('Dummy payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

dummyPayoutQueue.on('stalled', (job) => {
  logger.warn('Dummy payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down callback worker...');
  await mongoose.connection.close();
  await callbackQueue.close();
  await bluswapPayoutQueue.close();
  await mizorpayPayoutQueue.close();
  await dummyPayoutQueue.close();
  process.exit(0);
});

// Log worker start
logger.info('Callback worker started and processing jobs'); 