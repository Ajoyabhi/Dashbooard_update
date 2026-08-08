const { v4: uuidv4 } = require('uuid');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { dummyPayoutQueue } = require('../config/queue.config');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const winston = require('winston');
require('dotenv').config();

// Configure logger (mirrors merchant_payout_request.js / BluSwap / MizorPay)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: '../../error.log', level: 'error' }),
        new winston.transports.File({ filename: '../../combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// How long after the immediate response we simulate the gateway's async
// settlement callback. Overridable via env; defaults to 8s.
const DUMMY_PAYOUT_DELAY_MS = parseInt(process.env.DUMMY_PAYOUT_DELAY_MS, 10) || 8000;

// Total length of the synthetic UTR. Real bank UTRs/RRNs are 12 digits.
// Overridable via env; defaults to 12.
const DUMMY_PAYOUT_UTR_LENGTH = parseInt(process.env.DUMMY_PAYOUT_UTR_LENGTH, 10) || 12;

/**
 * Build a synthetic UTR of exactly DUMMY_PAYOUT_UTR_LENGTH digits.
 *
 * The admin-configured `prefix` (digits only) supplies the leading digits and the
 * remainder is filled with random digits — e.g. prefix '6220133' at length 12
 * yields '6220133' + 5 random digits. A prefix longer than the total length is
 * clipped to it; an empty/blank prefix produces a fully random UTR.
 */
function fakeUtr(prefix) {
    const len = DUMMY_PAYOUT_UTR_LENGTH;
    let utr = String(prefix ?? '').replace(/\D/g, '').slice(0, len);
    while (utr.length < len) utr += Math.floor(Math.random() * 10);
    return utr;
}

/**
 * Dummy / test payout.
 *
 * Runs the ENTIRE real pipeline (validation, IP whitelist, charges, settlement
 * debit, PayoutTransaction/TransactionCharges creation — all done by the caller
 * before we're invoked) and produces the exact same immediate `processing`
 * response BluSwap/MizorPay return. The only difference is that instead of
 * calling a real gateway we:
 *   1. mark the payout `processing` with a synthetic gateway handle, then
 *   2. enqueue a DELAYED job that, after DUMMY_PAYOUT_DELAY_MS, finalizes the
 *      payout through finalizePayout() — the exact same shared path a real
 *      gateway webhook uses. That fires the standard merchant callback and
 *      updates the ledger/dashboard identically to production.
 *
 * Outcome is always success (synthetic UTR). No real money moves.
 *
 * Return envelope matches bluswapPayout/mizorpayPayout so initiatePayout can
 * treat all three the same way:
 *   { data: { status, message, utr, apitxnid, transaction_id }, status }
 */
async function dummyPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting dummyPayout process', { reference: payoutData.reference_id });
    try {
        // Use the payout record's REAL internal transaction_id (the uuid assigned to
        // every payout at creation) so the dummy is indistinguishable from a real
        // payout — same id shape the merchant/dashboard gets for BluSwap/MizorPay.
        // Fall back to a fresh uuid only if the caller didn't pass it.
        const transactionId = payoutData.transaction_id || uuidv4();
        const utr = fakeUtr(payoutData.dummy_utr_prefix);

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_REQUEST,
            status: 'pending', source: 'api', gateway_name: 'DummyGateway',
            detail: 'Initiating payout with DummyGateway (simulated)',
            payload: { amount: Number(payoutData.amount).toFixed(2), request_type: payoutData.request_type || 'IMPS' }
        });

        // Mark processing with the synthetic gateway handle — mirrors the real
        // gateways, which leave the payout non-terminal until the async callback.
        await PayoutTransaction.updateOne(
            { reference_id: payoutData.reference_id },
            {
                $set: {
                    status: 'processing',
                    gateway_response: {
                        merchant_response: transactionId,
                        status: 'processing',
                        message: 'Payout accepted, processing',
                        utr: null
                    }
                }
            }
        );

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_RESPONSE,
            status: 'ok', source: 'api', gateway_name: 'DummyGateway',
            latency_ms: Date.now() - startTime,
            detail: 'DummyGateway accepted payout (processing)',
            payload: { transaction_id: transactionId }
        });

        // Schedule the simulated async settlement callback. The worker calls
        // finalizePayout() exactly like a real gateway webhook would.
        await dummyPayoutQueue.add(
            {
                referenceId: payoutData.reference_id,
                isSuccess: true,
                utr,
                gatewayTransactionId: transactionId
            },
            { delay: DUMMY_PAYOUT_DELAY_MS }
        );

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.QUEUED,
            status: 'ok', source: 'api', gateway_name: 'DummyGateway',
            detail: `Simulated settlement callback scheduled in ${DUMMY_PAYOUT_DELAY_MS}ms`,
            payload: { delay_ms: DUMMY_PAYOUT_DELAY_MS }
        });

        logger.info('Dummy payout accepted, finalize scheduled', {
            reference: payoutData.reference_id, delay_ms: DUMMY_PAYOUT_DELAY_MS
        });

        return {
            data: {
                status: 'processing',
                message: 'Payout accepted, processing',
                utr: null,
                apitxnid: payoutData.reference_id,
                transaction_id: transactionId
            },
            status: 200
        };
    } catch (error) {
        logger.error('Error in dummyPayout', {
            error: error.message,
            stack: error.stack,
            reference: payoutData.reference_id
        });

        return {
            data: {
                status: 'error',
                message: error.message
            },
            status: 500
        };
    }
}

module.exports = {
    dummyPayout
};
