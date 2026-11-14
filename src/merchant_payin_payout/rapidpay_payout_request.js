const PayoutTransaction = require('../models/payoutTransaction.model');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const { logger } = require('../utils/logger');
const axios = require('axios');
require('dotenv').config();

/**
 * RapidPay payout (RAPIDPAY_ACCUZPAY_CONTRACT.md §4).
 *
 * POST {ECOMMERCE_API_URL}/api/v1/payments/rapidpay/payout/rpp-initiate  (x-api-key)
 *
 * Same downstream (anpamart) + shared-secret convention as the AirPay / Razorpay
 * payins. Email / mobile are ignored by RapidPay, so none are sent.
 *
 * Outcome mapping — the important rule is: NEVER refund a payout whose outcome is
 * unknown (contract: "Never retry a PROCESSING payout"), or we could pay twice
 * and also refund the merchant.
 *
 *   200 success + status PROCESSING             -> processing (final via §7 / §5)
 *   200 success + PROCESSING + "outcome unknown" -> processing (poll; may have paid)
 *   200 status FAILED                           -> failed  (instant reject, final)
 *   400 / 502                                   -> failed  (nothing was sent)
 *   409 duplicate                               -> processing (an earlier attempt exists
 *                                                  downstream; let status check resolve it)
 *   timeout / network / other 5xx               -> processing (outcome unknown)
 *
 * Return envelope matches bluswapPayout / mizorpayPayout:
 *   { data: { status: 'processing'|'failed'|'error', message, apitxnid, transaction_id }, status }
 */
function rapidpayErrorMessage(body, fallback = 'Payout processing failed') {
    if (!body || typeof body !== 'object') return fallback;
    const msg = typeof body.message === 'string' ? body.message.trim() : '';
    if (msg) return msg;
    if (body.provider_error) {
        try { return JSON.stringify(body.provider_error); } catch (_) { /* ignore */ }
    }
    return fallback;
}

async function markProcessing(referenceId, payoutId, message) {
    await PayoutTransaction.updateOne(
        { reference_id: referenceId, status: { $in: ['pending', 'processing'] } },
        {
            $set: {
                status: 'processing',
                gateway_response: {
                    merchant_response: payoutId || null,
                    status: 'processing',
                    message,
                    utr: null
                }
            }
        }
    );
}

async function rapidpayPayout(payoutData) {
    const startTime = Date.now();
    const referenceId = payoutData.reference_id;
    logger.info('Starting rapidpayPayout process', { reference: referenceId });

    try {
        const baseUrl = process.env.ECOMMERCE_API_URL;
        const apiKey = process.env.RAPIDPAY_SHARED_SECRET;
        if (!baseUrl || !apiKey) {
            throw new Error('RapidPay shared secret or ECOMMERCE_API_URL not set in environment variables');
        }
        const url = `${baseUrl}/api/v1/payments/rapidpay/payout/rpp-initiate`;

        const b = payoutData.beneficiary_details || {};
        const payload = {
            reference_id: referenceId,
            amount: String(Number(payoutData.amount)),
            account_number: b.account_number,
            account_ifsc: b.account_ifsc,
            bank_name: b.bank_name,
            beneficiary_name: b.beneficiary_name,
            request_type: payoutData.request_type || 'IMPS'
        };

        recordTraceEvent({
            reference_id: referenceId, trace_type: 'payout', stage: STAGES.GATEWAY_REQUEST,
            status: 'pending', source: 'api', gateway_name: 'RapidPay',
            http: { method: 'POST', url },
            detail: 'Initiating payout with RapidPay',
            payload: { reference_id: referenceId, amount: payload.amount, request_type: payload.request_type }
        });

        let result = null;
        let httpStatus = null;
        let networkError = null;
        try {
            const response = await axios.post(url, payload, {
                headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
                timeout: 60000
            });
            result = response.data;
            httpStatus = response.status;
        } catch (err) {
            if (err.response) {
                result = err.response.data;
                httpStatus = err.response.status;
            } else {
                networkError = err.message;
            }
        }

        const gwStatus = String(result?.status || '').toUpperCase();
        const payoutId = result?.rapidpay_payout_id || null;

        // Classify the outcome.
        let outcome;
        if (networkError) outcome = 'unknown';
        else if (httpStatus === 200 && gwStatus === 'FAILED') outcome = 'failed';
        else if (httpStatus === 200 && result?.success === true) outcome = 'processing';
        else if (httpStatus === 400 || httpStatus === 401 || httpStatus === 502) outcome = 'failed';
        else if (httpStatus === 409) outcome = 'unknown';
        else outcome = 'unknown'; // other 5xx / unexpected shapes — may have gone through

        logger.info('Received response from RapidPay payout API', {
            reference: referenceId, httpStatus, gwStatus, outcome, networkError
        });

        recordTraceEvent({
            reference_id: referenceId, trace_type: 'payout', stage: STAGES.GATEWAY_RESPONSE,
            status: outcome === 'failed' ? 'failed' : outcome === 'processing' ? 'ok' : 'pending',
            source: 'api', gateway_name: 'RapidPay',
            latency_ms: Date.now() - startTime,
            detail: outcome === 'processing'
                ? 'RapidPay accepted payout (processing)'
                : outcome === 'failed'
                    ? 'RapidPay rejected payout'
                    : 'RapidPay payout outcome unknown — left processing for status check / callback',
            error: outcome === 'processing' ? null : (networkError || rapidpayErrorMessage(result, null)),
            payload: { httpStatus, status: result?.status || null, rapidpay_payout_id: payoutId }
        });

        if (outcome === 'failed') {
            // Refund + status change happen in initiatePayout -> failPayoutWithRefund()
            // -> finalizePayout() (idempotent), so the §7 FAILED callback that follows
            // an instant 200/FAILED is a harmless no-op.
            return {
                data: {
                    status: 'failed',
                    message: rapidpayErrorMessage(result, 'Payout processing failed'),
                    apitxnid: referenceId
                },
                status: 400
            };
        }

        const message = outcome === 'processing'
            ? (result?.message || 'Payout accepted, processing')
            : 'Payout submitted, awaiting confirmation';
        try {
            await markProcessing(referenceId, payoutId, message);
        } catch (dbErr) {
            // Never let a DB hiccup here turn an in-flight payout into a refund —
            // the record stays pending and the callback / reconcile finalizes it.
            logger.error('Failed to mark RapidPay payout processing', { reference: referenceId, error: dbErr.message });
        }

        return {
            data: {
                status: 'processing',
                message: 'Payout initiated, awaiting confirmation',
                utr: null,
                apitxnid: referenceId,
                transaction_id: payoutId
            },
            status: 200
        };
    } catch (error) {
        logger.error('Error in rapidpayPayout', { error: error.message, stack: error.stack, reference: referenceId });
        // Only reachable before the HTTP call (e.g. missing config), so nothing was
        // sent to RapidPay and failing + refunding is safe.
        return { data: { status: 'error', message: error.message }, status: 500 };
    }
}

module.exports = { rapidpayPayout };
