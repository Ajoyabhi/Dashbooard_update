const PayoutTransaction = require('../models/payoutTransaction.model');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();


// Configure logger
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

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

async function createBluswapContact(payoutData) {
    const baseUrl = process.env.BLUSWAP_BASE_URL;
    const apiKey = process.env.BLUSWAP_API_KEY;
    const ip = process.env.BLUSWAP_IP || '0.0.0.0';

    const payload = {
        bank_account_number: payoutData.beneficiary_details.account_number,
        ifsc: payoutData.beneficiary_details.account_ifsc,
        name: payoutData.beneficiary_details.beneficiary_name,
        contact_number: payoutData.beneficiary_details.mobile,
        email_id: payoutData.beneficiary_details.email,
        account_type: payoutData.beneficiary_details.account_type || 'Savings'
    };

    const response = await axios.post(`${baseUrl}/contacts_for_cust`, payload, {
        headers: {
            'x-api-key': apiKey,
            'X-Real-IP': ip,
            'Content-Type': 'application/json'
        }
    });

    return { data: response.data, request: payload };
}

async function bluswapPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting bluswapPayout process', { reference: payoutData.reference_id });
    try {
        const baseUrl = process.env.BLUSWAP_BASE_URL;
        const apiKey = process.env.BLUSWAP_API_KEY;
        const ip = process.env.BLUSWAP_IP || '0.0.0.0';
        const vaId = process.env.BLUSWAP_VA_ID;
        if (!baseUrl || !apiKey || !vaId) {
            throw new Error('BluSwap credentials or VA ID not set in environment variables');
        }

        // Beneficiary must be registered as a contact before a payout can be initiated
        let contactResponse;
        try {
            contactResponse = await createBluswapContact(payoutData);
        } catch (err) {
            const errData = err.response ? err.response.data : { message: err.message };
            recordTraceEvent({
                reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_RESPONSE,
                status: 'failed', source: 'api', gateway_name: 'BluSwap',
                latency_ms: Date.now() - startTime,
                detail: 'BluSwap create-contact step failed',
                error: errData.message || err.message, payload: { step: 'create_contact', response: errData }
            });
            throw new Error(errData.message || 'Failed to create BluSwap contact');
        }

        const contactId = contactResponse.data?.data?.contact_id;
        if (!contactId) {
            throw new Error(contactResponse.data?.message || 'BluSwap contact creation did not return a contact_id');
        }

        const payload = {
            order_id: payoutData.reference_id,
            contact_id: contactId,
            amount: Number(payoutData.amount).toFixed(2),
            payment_mode: payoutData.request_type || 'IMPS',
            description: payoutData.description || `Payout for ${payoutData.reference_id}`,
            va_id: vaId
        };

        logger.info('Preparing payout request for BluSwap', { payload });

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_REQUEST,
            status: 'pending', source: 'api', gateway_name: 'BluSwap',
            http: { method: 'POST', url: `${baseUrl}/merchants/initiate_pay_out_cust` },
            detail: 'Initiating payout with BluSwap',
            payload: { order_id: payload.order_id, amount: payload.amount, payment_mode: payload.payment_mode }
        });

        let result;
        try {
            const response = await axios.post(`${baseUrl}/merchants/initiate_pay_out_cust`, payload, {
                headers: {
                    'x-api-key': apiKey,
                    'X-Real-IP': ip,
                    'Content-Type': 'application/json'
                }
            });
            result = response.data;
        } catch (err) {
            result = err.response ? err.response.data : { status: 'FAILED', message: err.message };
        }
        console.log("=======================================================")
        console.log("This is part of result", result);
        console.log("=======================================================")

        logger.info('Received response from BluSwap API', { status: result.status, message: result.message });

        recordTraceEvent({
            reference_id: payoutData.reference_id, trace_type: 'payout', stage: STAGES.GATEWAY_RESPONSE,
            status: result.status === 'SUCCESS' ? 'ok' : 'failed', source: 'api', gateway_name: 'BluSwap',
            latency_ms: Date.now() - startTime,
            detail: result.status === 'SUCCESS' ? 'BluSwap accepted payout (processing)' : 'BluSwap rejected payout',
            error: result.status === 'SUCCESS' ? null : (result.message || null),
            payload: { status: result.status, message: result.message, transaction_id: result.data?.bluswap_transaction_id || null }
        });

        if (result.status === 'SUCCESS') {
            // BluSwap returns an INITIATED status here - actual settlement is confirmed
            // later via the transaction status check, so we don't mark this completed yet.
            const bluswapTransactionId = result.data?.bluswap_transaction_id || null;

            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'processing',
                        gateway_response: {
                            merchant_response: bluswapTransactionId,
                            status: 'processing',
                            message: result.message,
                            utr: null
                        }
                    }
                }
            );
            logger.info('Payout transaction updated', { reference: payoutData.reference_id });

            return {
                data: {
                    status: 'processing',
                    message: result.message,
                    utr: null,
                    apitxnid: payoutData.reference_id,
                    contact_id: contactId,
                    transaction_id: bluswapTransactionId
                },
                status: 200
            };
        } else {
            // BluSwap did not accept the payout. Do NOT refund or change status here.
            // The caller (initiatePayout) runs failPayoutWithRefund() -> finalizePayout(),
            // which atomically refunds the exact deducted amount and marks the
            // transaction failed. Keeping it in one place prevents double refunds and
            // keeps the ledger consistent, since the transaction is still 'pending'.
            logger.info('BluSwap did not accept payout — deferring refund/status to finalizePayout', {
                reference: payoutData.reference_id,
                message: result.message
            });

            return {
                data: {
                    status: 'failed',
                    message: result.message || 'Payout processing failed',
                    apitxnid: payoutData.reference_id
                },
                status: 400
            };
        }
    } catch (error) {
        logger.error('Error in bluswapPayout', {
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
    bluswapPayout
}
