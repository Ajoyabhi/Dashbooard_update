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

// Acceptance message returned on the immediate response. MUST match the real
// gateway's message verbatim so a test payout is indistinguishable from a real
// one. Overridable via env if the real gateway's wording ever changes.
const DUMMY_PAYOUT_ACCEPT_MESSAGE = process.env.DUMMY_PAYOUT_ACCEPT_MESSAGE || 'Payout Initiated Successfully';

// How many leading digits to lift from a recent real UTR when auto-deriving the
// dummy prefix. Real bank UTRs share a bank/scheme lead, so borrowing the first
// 7 makes the synthetic UTR resemble this merchant's genuine ones.
const DERIVED_UTR_PREFIX_LEN = parseInt(process.env.DUMMY_PAYOUT_DERIVED_PREFIX_LEN, 10) || 7;

/**
 * Derive a UTR prefix from this merchant's most recent REAL (non-dummy) successful
 * payout: strip its UTR to digits and take the leading DERIVED_UTR_PREFIX_LEN.
 *
 * Only completed payouts processed by a gateway other than DummyGateway are
 * considered, so we never compound a prefix off a previous synthetic UTR. Returns
 * null when the merchant has no usable real payout yet (caller then falls back to
 * a fully random UTR).
 */
async function recentRealUtrPrefix(userId) {
    if (!userId && userId !== 0) return null;
    try {
        const candidates = await PayoutTransaction.find({
            'user.user_id': String(userId),
            status: 'completed',
            'metadata.gateway_name': { $ne: 'DummyGateway' },
            'gateway_response.utr': { $type: 'string' }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('gateway_response.utr')
            .lean();

        for (const c of candidates) {
            const digits = String(c?.gateway_response?.utr || '').replace(/\D/g, '');
            if (digits.length >= DERIVED_UTR_PREFIX_LEN) {
                return digits.slice(0, DERIVED_UTR_PREFIX_LEN);
            }
        }
    } catch (error) {
        logger.error('Failed to derive UTR prefix from recent payout', { error: error.message, userId });
    }
    return null;
}

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

        // Resolve the UTR prefix. Precedence:
        //   1. admin-configured dummy_utr_prefix (explicit override), else
        //   2. digits derived from this merchant's most recent real payout UTR, else
        //   3. nothing -> fakeUtr() produces a fully random UTR.
        let prefix = String(payoutData.dummy_utr_prefix ?? '').replace(/\D/g, '');
        let prefixSource = prefix ? 'configured' : 'random';
        if (!prefix) {
            const derived = await recentRealUtrPrefix(payoutData.user_id);
            if (derived) {
                prefix = derived;
                prefixSource = 'derived-from-recent-payout';
            }
        }
        const utr = fakeUtr(prefix);

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_REQUEST,
            status: 'pending', source: 'api', gateway_name: 'DummyGateway',
            detail: 'Initiating payout with DummyGateway (simulated)',
            payload: { amount: Number(payoutData.amount).toFixed(2), request_type: payoutData.request_type || 'IMPS', utr_prefix_source: prefixSource }
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
                        message: DUMMY_PAYOUT_ACCEPT_MESSAGE,
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
                message: DUMMY_PAYOUT_ACCEPT_MESSAGE,
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
