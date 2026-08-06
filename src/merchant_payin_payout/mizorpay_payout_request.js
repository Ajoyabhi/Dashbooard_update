const PayoutTransaction = require('../models/payoutTransaction.model');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();

// Configure logger (mirrors merchant_payout_request.js / BluSwap)
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

/**
 * Build a human-readable error message from a MizorPay error body.
 *
 * Per the contract, MizorPay errors are `{ success: false, message: "...",
 * provider_error?: { ... } }`. We prefer the top-level `message`, falling back
 * to a stringified `provider_error` when present.
 */
function mizorpayErrorMessage(body, fallback = 'Payout processing failed') {
    if (!body || typeof body !== 'object') return fallback;
    const { message, provider_error } = body;
    const msg = typeof message === 'string' ? message.trim() : '';
    if (msg) return msg;
    if (provider_error) {
        try { return JSON.stringify(provider_error); } catch (_) { /* ignore */ }
    }
    return fallback;
}

/**
 * Initiate a payout with MizorPay.
 *
 * Contract: POST {MIZORPAY_BASE_URL}/initiate  (auth: x-api-key).
 * Unlike BluSwap there is no separate "create contact" step — the beneficiary
 * details are sent inline. `email` and `mobile` are REQUIRED by MizorPay and are
 * injected upstream (from the synthetic pool) by the caller.
 *
 * Return envelope matches bluswapPayout so initiatePayout can treat both the
 * same way:
 *   { data: { status: 'processing'|'failed'|'error', message, apitxnid, transaction_id }, status }
 */
async function mizorpayPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting mizorpayPayout process', { reference: payoutData.reference_id });
    try {
        const baseUrl = process.env.MIZORPAY_BASE_URL;
        const apiKey = process.env.MIZORPAY_API_KEY;
        if (!baseUrl || !apiKey) {
            throw new Error('MizorPay credentials or base URL not set in environment variables');
        }

        const b = payoutData.beneficiary_details || {};
        const payload = {
            reference_id: payoutData.reference_id,
            amount: Number(payoutData.amount).toFixed(2),
            account_number: b.account_number,
            account_ifsc: b.account_ifsc,
            bank_name: b.bank_name || undefined,
            beneficiary_name: b.beneficiary_name,
            request_type: payoutData.request_type || 'IMPS',
            // Required by MizorPay; supplied from the synthetic pool by the caller.
            email: b.email,
            mobile: b.mobile
        };

        logger.info('Preparing payout request for MizorPay', {
            reference: payoutData.reference_id, amount: payload.amount, request_type: payload.request_type
        });

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_REQUEST,
            status: 'pending', source: 'api', gateway_name: 'MizorPay',
            http: { method: 'POST', url: `${baseUrl}/initiate` },
            detail: 'Initiating payout with MizorPay',
            payload: { reference_id: payload.reference_id, amount: payload.amount, request_type: payload.request_type }
        });

        let result;
        let httpStatus;
        try {
            const response = await axios.post(`${baseUrl}/initiate`, payload, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            result = response.data;
            httpStatus = response.status;
        } catch (err) {
            result = err.response ? err.response.data : { success: false, message: err.message };
            httpStatus = err.response?.status || 500;
        }

        logger.info('Received response from MizorPay API', { httpStatus, success: result?.success, status: result?.status });

        const accepted = result?.success === true;

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_RESPONSE,
            status: accepted ? 'ok' : 'failed', source: 'api', gateway_name: 'MizorPay',
            latency_ms: Date.now() - startTime,
            detail: accepted ? 'MizorPay accepted payout (processing)' : 'MizorPay rejected payout',
            error: accepted ? null : mizorpayErrorMessage(result, null),
            payload: { httpStatus, status: result?.status || null, payout_order_id: result?.payout_order_id || null }
        });

        if (accepted) {
            // MizorPay returns status: PROCESSING here — final settlement is
            // confirmed later via the result callback / status check, so we don't
            // mark this completed yet. payout_order_id is MizorPay's handle.
            const payoutOrderId = result.payout_order_id || null;

            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'processing',
                        gateway_response: {
                            merchant_response: payoutOrderId,
                            status: 'processing',
                            message: result.message || 'Payout accepted, processing',
                            utr: null
                        }
                    }
                }
            );
            logger.info('Payout transaction updated (MizorPay)', { reference: payoutData.reference_id });

            return {
                data: {
                    status: 'processing',
                    message: result.message || 'Payout accepted, processing',
                    utr: null,
                    apitxnid: payoutData.reference_id,
                    transaction_id: payoutOrderId
                },
                status: 200
            };
        }

        // MizorPay did not accept the payout. Do NOT refund or change status here;
        // the caller (initiatePayout) runs failPayoutWithRefund() -> finalizePayout(),
        // which atomically refunds and marks the transaction failed. Keeping it in
        // one place prevents double refunds and keeps the ledger consistent.
        logger.info('MizorPay did not accept payout — deferring refund/status to finalizePayout', {
            reference: payoutData.reference_id,
            message: result?.message
        });

        return {
            data: {
                status: 'failed',
                message: mizorpayErrorMessage(result, 'Payout processing failed'),
                apitxnid: payoutData.reference_id
            },
            status: 400
        };
    } catch (error) {
        logger.error('Error in mizorpayPayout', {
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
    mizorpayPayout
};
