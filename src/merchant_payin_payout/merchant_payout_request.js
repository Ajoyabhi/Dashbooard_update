const ApiLogs = require('../models/apiLogs.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { TransactionCharges, FinancialDetails } = require('../models');
const winston = require('winston');
const { encryptText } = require('./utils_payout');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
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

async function unpayPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting unpayPayout process', { reference: payoutData.reference_id });
    
    try {
        logger.info('Initializing Unpay client');
        const aesKey = process.env.UNPAY_KEY;
        const aesIV = process.env.UNPAY_IV;
        let pay_load = {
            "partner_id": "1809",
            "mode": "IMPS",
            "mobile": payoutData.beneficiary_details.mobile,
            "name": payoutData.beneficiary_details.beneficiary_name,
            "account": payoutData.beneficiary_details.account_number,
            "ifsc": payoutData.beneficiary_details.account_ifsc,
            "bank": payoutData.beneficiary_details.bank_name,
            "amount": payoutData.amount,
            "webhook": process.env.UNPAY_CALLBACK_URL,
            "latitude": "11.2222",
            "longitude": "11.2222",
            "apitxnid": payoutData.reference_id
        }
        
        logger.info('Preparing payout request', { payload: pay_load });
        
        let aesData = await encryptText(JSON.stringify(pay_load), aesKey, aesIV);
        logger.info('Encrypted payload generated');

        logger.info('Sending request to Unpay API');
        let result = await fetch('https://unpay.in/tech/api/payout/order/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': "6Xe0uR9rkRYT9sfb34u8kHXDCmKfym1C561xIKjp"
            },
            body: JSON.stringify({ body: aesData })
        }).then(response => response.json());
        console.log("=======================================================")
        console.log("This is part of result", result);
        console.log("=======================================================")
        

        logger.info('Received response from Unpay API', { status: result['statuscode'] });

        // Create API log
        const apiLog = await ApiLogs.create({
            request: JSON.stringify(pay_load),
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'UNPAY',
            status: result['statuscode'] === 'TXN' ? 'success' : 'error',
            error_message: result.message || null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        logger.info('API log created', { logId: apiLog._id });

        if (result['statuscode'] == 'TXN') {
            console.log("result in txn status", result);
            let message = result['message'];
            let txn_id = result['txnid'];
            let utr = result['refno'];
            let transaction_id = result['txnid'];
            
            logger.info('Transaction successful', { txn_id, utr });

            // Create transaction charges using Sequelize
            await TransactionCharges.update(
                {
                    status: 'completed',
                    transaction_utr: utr
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }       
                }
            )

            logger.info('Transaction charges stored', { reference: payoutData.reference_id });

            let userTransaction = await UserTransaction.updateOne(
                {
                    reference_id: payoutData.reference_id
                },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            merchant_response: transaction_id,
                            status: 'success',
                            message: message,
                            utr: utr
                        }
                    }
                }
            );
            logger.info('User transaction updated', { reference: payoutData.reference });

            let payoutTransaction = await PayoutTransaction.updateOne(
                {
                    reference_id: payoutData.reference_id
                },
                {
                    $set: {
                        status: 'success',
                        gateway_response: { 
                            merchant_response: transaction_id,
                            status: 'success',
                            message: message,
                            utr: utr
                        }
                    }
                }
            );          
            logger.info('Payout transaction updated', { reference: payoutData.reference_id });

            return {
                data: { 
                    status: result['statuscode'],
                    message: result['message'],
                    utr: utr,
                    apitxnid: payoutData.reference_id
                },
                status: 200
            }
        } else {
            logger.warn('Transaction failed', { 
                status: result['statuscode'],
                message: result['message'] 
            });

            // Create failed transaction charges using Sequelize
            await TransactionCharges.update(
                {
                    status: 'failed',
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );
            // Update settlement in FinancialDetails using Sequelize
            const userFinancial = await FinancialDetails.findOne({
                where: { user_id: payoutData.user_id }
              });
            if (userFinancial) {
                const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(payoutData.amountToDeduct);
                await FinancialDetails.update(
                  { settlement: newSettlement },
                  { where: { user_id: payoutData.user_id } }
                );
            }


            logger.info('Failed transaction charges stored', { reference: payoutData.reference_id });

            let userTransaction = await UserTransaction.updateOne(
                {
                    reference_id: payoutData.reference_id
                },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('User transaction updated to failed', { reference: payoutData.reference });

            let payoutTransaction = await PayoutTransaction.updateOne(
                {   
                    reference_id: payoutData.reference_id
                },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference_id });

            return {
                data: { 
                    status: result['statuscode'],
                    message: result['message'],
                    error: result['error'],
                    apitxnid: payoutData.reference_id
                    
                },
                status: 200
            };
        }
    } catch(error) {
        logger.error('Error in unpayPayout', {
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
        }
    }
}

async function spayPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting spayPayout process', { reference: payoutData.reference_id });
    try {
        const token = process.env.SPAY_TOKEN;
        const payout_id = process.env.SPAY_PAYOUT_ID || '3'; // fallback to 3 if not set
        const pay_load = {
            token: token,
            merchant_order_id: payoutData.reference_id,
            name: payoutData.beneficiary_details.beneficiary_name,
            email: payoutData.beneficiary_details.email,
            mobile: payoutData.beneficiary_details.mobile,
            amount: payoutData.amount,
            account: payoutData.beneficiary_details.account_number,
            ifsc: payoutData.beneficiary_details.account_ifsc,
            payout_id: payout_id,
            address: payoutData.beneficiary_details.address,
            payment_type: payoutData.payment_type || 'IMPS',
            upi_on: payoutData.beneficiary_details.upi_on || ''
        };
        logger.info('Preparing payout request for SPay', { payload: pay_load });
        const response = await axios.post('https://dashboard.spay.live/api/payout/request', pay_load, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = response.data;
        console.log("=======================================================")
        console.log("This is part of result", result);
        console.log("=======================================================")
        logger.info('Received response from SPay API', { status: result.status, message: result.message });
        // Create API log
        const apiLog = await ApiLogs.create({
            request: JSON.stringify(pay_load),
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'SPAY',
            status: result.status === 'success' ? 'success' : 'error',
            error_message: result.message || null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        logger.info('API log created', { logId: apiLog._id });
        if (result.status === 'success') {
            // Update transaction charges
            await TransactionCharges.update(
                {
                    status: 'completed',
                    transaction_utr: result.utr || null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );
            logger.info('Transaction charges stored', { reference: payoutData.reference_id });
            // Update user transaction
            await UserTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            merchant_response: result.merchant_order_id,
                            status: 'success',
                            message: result.message,
                            utr: result.utr || null
                        }
                    }
                }
            );
            logger.info('User transaction updated', { reference: payoutData.reference_id });
            // Update payout transaction
            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            merchant_response: result.merchant_order_id,
                            status: 'success',
                            message: result.message,
                            utr: result.utr || null
                        }
                    }
                }
            );
            logger.info('Payout transaction updated', { reference: payoutData.reference_id });
            return {
                data: {
                    status: result.status,
                    message: result.message,
                    merchant_order_id: result.merchant_order_id,
                    utr: result.utr || null
                },
                status: 200
            };
        } else {
            // Update transaction charges as failed
            await TransactionCharges.update(
                {
                    status: 'failed',
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );
            // Optionally update FinancialDetails if needed (see unpayPayout)
            const userFinancial = await FinancialDetails.findOne({
                where: { user_id: payoutData.user_id }
            });
            if (userFinancial) {
                const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(payoutData.amountToDeduct || 0);
                await FinancialDetails.update(
                    { settlement: newSettlement },
                    { where: { user_id: payoutData.user_id } }
                );
            }
            // Update user transaction as failed
            await UserTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('User transaction updated to failed', { reference: payoutData.reference_id });
            // Update payout transaction as failed
            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference_id });
            return {
                data: {
                    status: result.status,
                    message: result.message,
                    error: result.error || null,
                    merchant_order_id: payoutData.reference_id
                },
                status: 200
            };
        }
    } catch (error) {
        logger.error('Error in spayPayout', {
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

async function philpayPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting philpayPayout process', { reference: payoutData.reference_id });
    try {
        const access_key = process.env.PHILPAY_TOKEN;
        const secret = process.env.PHILPAY_SECRET;
        const domain = process.env.PHILPAY_DOMAIN;
        if (!access_key || !secret || !domain) {
            throw new Error('Philpay credentials or domain not set in environment variables');
        }
        // Payment type mapper
        const paymentTypeMap = {
            'NEFT': 1,
            'UPI': 2,
            'IMPS': 3,
            'RTGS': 4
        };
        const paymentTypeValue = paymentTypeMap[(payoutData.request_type || '').toUpperCase()] || 1;
        // Prepare payload
        const payload = {
            address: payoutData.beneficiary_details.address || 'Noida, Uttar Pradesh, India',
            payment_type: paymentTypeValue, // mapped value
            amount: parseInt(payoutData.amount)*100, // Ensure integer
            email: payoutData.beneficiary_details.email,
            name: payoutData.beneficiary_details.beneficiary_name,
            mobile_number: payoutData.beneficiary_details.mobile,
            account_number: payoutData.beneficiary_details.account_number,
            ifsc_code: payoutData.beneficiary_details.account_ifsc,
            merchant_order_id: payoutData.reference_id
        };  
        const requestData = JSON.stringify(payload);
        const timestamp = Date.now().toString();
        const path = "/api/v1/payout/process";
        // Generate signature
        function generateSignature(timestamp, body, path, queryString = '', method = 'POST') {
            const hmac = crypto.createHmac('sha512', secret);
            hmac.update(method);
            hmac.update('\n');
            hmac.update(path);
            hmac.update('\n');
            hmac.update(queryString);
            hmac.update('\n');
            hmac.update(body);
            hmac.update('\n');
            hmac.update(timestamp);
            hmac.update('\n');
            return hmac.digest('hex');
        }
        const signature = generateSignature(timestamp, requestData, path, '', 'POST');
        // Headers
        const headers = {
            "access_key": access_key,
            "signature": signature,
            "X-Timestamp": timestamp,
            "Content-Type": "application/json"
        };
        // Make the POST request
        const url = `https://${domain}${path}`;
        let result;
        try {
            const response = await axios.post(url, payload, { headers });
            result = response.data;
        } catch (err) {
            result = err.response ? err.response.data : { status: 'error', message: err.message };
        }
        logger.info('Received response from Philpay API', { status: result.status, message: result.message });
        console.log("this is imidiate response of the call", result)
        
        const apiLog = await ApiLogs.create({
            request: requestData,
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'PHILPAY',
            status: result.status === 'success' ? 'success' : 'error',
            error_message: result.message
                ? (typeof result.message === 'string' ? result.message : JSON.stringify(result.message))
                : null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        // logger.info('API log created', { logId: apiLog._id });
        if (result.success === true) {

            return {
                data: {
                    status: result.data.status,
                    merchant_order_id: result.data.merchant_order_id,
                },
                status: 200
            };
        } else {
            // Update transaction charges as failed
            await TransactionCharges.update(
                {
                    status: 'failed',
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );
            // Optionally update FinancialDetails if needed (see unpayPayout)
            const userFinancial = await FinancialDetails.findOne({
                where: { user_id: payoutData.user_id }
            });
            if (userFinancial) {
                const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(payoutData.amountToDeduct || 0);
                await FinancialDetails.update(
                    { settlement: newSettlement },
                    { where: { user_id: payoutData.user_id } }
                );
            }
            // Update user transaction as failed
            await UserTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('User transaction updated to failed', { reference: payoutData.reference_id });
            // Update payout transaction as failed
            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference_id });
            return {
                data: {
                    status: 'failed',
                    message: result.message || 'Payout processing failed',
                    merchant_order_id: payoutData.reference_id
                },
                status: 200
            };
        }
    } catch (error) {
        logger.error('Error in philpayPayout', {
            error: error.message,
            stack: error.stack,
            reference: payoutData.reference_id
        });
        return {
            data: {
                status: 'error',
                message: error.message || 'Payout processing failed'
            },
            status: 500
        };
    }
}

async function xlitepayPayout(payoutData) {
    const startTime = Date.now();
    logger.info('Starting xlitepayPayout process', { reference: payoutData.reference_id });
    try {
        const baseUrl = process.env.XLITEPAY_BASE_URL;
        const token = process.env.XLITEPAY_TOKEN;
        if (!baseUrl || !token) {
            throw new Error('Xlitepay credentials or base URL not set in environment variables');
        }

        const form = new FormData();
        form.append('orderid', payoutData.reference_id);
        form.append('amount', String(payoutData.amount));
        form.append('number', payoutData.beneficiary_details.account_number);
        form.append('ifsc', payoutData.beneficiary_details.account_ifsc);
        form.append('name', payoutData.beneficiary_details.beneficiary_name);
        form.append('mobile', payoutData.beneficiary_details.mobile);

        logger.info('Preparing payout request for Xlitepay', { reference: payoutData.reference_id });

        let result;
        try {
            const response = await axios.post(`${baseUrl}/api/payout/initiate`, form, {
                headers: {
                    token,
                    ...form.getHeaders()
                }
            });
            result = response.data;
        } catch (err) {
            result = err.response ? err.response.data : { status: 'error', message: err.message };
        }
        console.log("=======================================================")
        console.log("This is part of result", result);
        console.log("=======================================================")

        logger.info('Received response from Xlitepay API', { status: result.status, message: result.message });

        const apiLog = await ApiLogs.create({
            request: JSON.stringify({ orderid: payoutData.reference_id, amount: payoutData.amount, number: payoutData.beneficiary_details.account_number, ifsc: payoutData.beneficiary_details.account_ifsc, name: payoutData.beneficiary_details.beneficiary_name, mobile: payoutData.beneficiary_details.mobile }),
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'XLITEPAY',
            status: (result.status === 'success' || result.statuscode === '200') ? 'success' : 'error',
            error_message: result.message || null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        logger.info('API log created', { logId: apiLog._id });

        if (result.status === 'success' || result.statuscode === '200') {
            const utr = result.utr || null;

            await TransactionCharges.update(
                {
                    status: 'completed',
                    transaction_utr: utr
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );
            logger.info('Transaction charges stored', { reference: payoutData.reference_id });

            await UserTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            merchant_response: payoutData.reference_id,
                            status: 'success',
                            message: result.message,
                            utr: utr
                        }
                    }
                }
            );
            logger.info('User transaction updated', { reference: payoutData.reference_id });

            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            merchant_response: payoutData.reference_id,
                            status: 'success',
                            message: result.message,
                            utr: utr
                        }
                    }
                }
            );
            logger.info('Payout transaction updated', { reference: payoutData.reference_id });

            return {
                data: {
                    status: 'success',
                    message: result.message,
                    utr: utr,
                    apitxnid: payoutData.reference_id
                },
                status: 200
            };
        } else {
            await TransactionCharges.update(
                {
                    status: 'failed',
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );

            const userFinancial = await FinancialDetails.findOne({
                where: { user_id: payoutData.user_id }
            });
            if (userFinancial) {
                const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(payoutData.amountToDeduct || 0);
                await FinancialDetails.update(
                    { settlement: newSettlement },
                    { where: { user_id: payoutData.user_id } }
                );
            }

            await UserTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('User transaction updated to failed', { reference: payoutData.reference_id });

            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference_id });

            return {
                data: {
                    status: 'failed',
                    message: result.message || 'Payout processing failed',
                    apitxnid: payoutData.reference_id
                },
                status: 200
            };
        }
    } catch (error) {
        logger.error('Error in xlitepayPayout', {
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
            await ApiLogs.create({
                request: JSON.stringify({ step: 'create_contact', reference_id: payoutData.reference_id }),
                response: JSON.stringify(errData),
                service: 'PAYOUT',
                service_api: 'BLUSWAP',
                status: 'error',
                error_message: errData.message || err.message,
                execution_time: Date.now() - startTime
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

        const apiLog = await ApiLogs.create({
            request: JSON.stringify(payload),
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'BLUSWAP',
            status: result.status === 'SUCCESS' ? 'success' : 'error',
            error_message: result.message || null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        logger.info('API log created', { logId: apiLog._id });

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
                    bluswap_transaction_id: bluswapTransactionId
                },
                status: 200
            };
        } else {
            await TransactionCharges.update(
                {
                    status: 'failed',
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );

            const userFinancial = await FinancialDetails.findOne({
                where: { user_id: payoutData.user_id }
            });
            if (userFinancial) {
                const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(payoutData.amountToDeduct || 0);
                await FinancialDetails.update(
                    { settlement: newSettlement },
                    { where: { user_id: payoutData.user_id } }
                );
            }

            await PayoutTransaction.updateOne(
                { reference_id: payoutData.reference_id },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            merchant_response: JSON.stringify(result),
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference_id });

            return {
                data: {
                    status: 'failed',
                    message: result.message || 'Payout processing failed',
                    apitxnid: payoutData.reference_id
                },
                status: 200
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

async function xlitepayBalanceCheck() {
    const baseUrl = process.env.XLITEPAY_BASE_URL;
    const token = process.env.XLITEPAY_TOKEN;
    const merchantId = process.env.XLITEPAY_MERCHANT_ID;
    if (!baseUrl || !token || !merchantId) {
        throw new Error('Xlitepay credentials or base URL not set in environment variables');
    }

    const form = new FormData();
    form.append('merchant_id', merchantId);

    const response = await axios.post(`${baseUrl}/api/check-balance`, form, {
        headers: {
            token,
            ...form.getHeaders()
        }
    });

    return response.data;
}

module.exports = {
    unpayPayout,
    spayPayout,
    philpayPayout,
    xlitepayPayout,
    xlitepayBalanceCheck,
    bluswapPayout
}
