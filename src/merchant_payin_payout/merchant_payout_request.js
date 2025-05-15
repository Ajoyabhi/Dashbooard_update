const ApiLogs = require('../models/apiLogs.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { TransactionCharges } = require('../models');
const winston = require('winston');
const { encryptText } = require('./utils_payout');
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

        console.log("result", result);

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

        if (result['statuscode'] === 'TXN') {
            let message = result['message'];
            let txn_id = result['txnid'];
            let utr = result['refno'];
            
            logger.info('Transaction successful', { txn_id, utr });

            // Create transaction charges using Sequelize
            await TransactionCharges.update(
                {
                    status: 'completed',
                    merchant_response: result,
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
                            reference_id: payoutData.reference_id,
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
                            reference_id: payoutData.reference_id,
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
                    error: result['error'],
                    txn_id: txn_id
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
                    merchant_response: result,
                    transaction_utr: null
                },
                {
                    where: {
                        reference_id: payoutData.reference_id
                    }
                }
            );

            logger.info('Failed transaction charges stored', { reference: payoutData.reference_id });

            let userTransaction = await UserTransaction.updateOne(
                {
                    reference_id: payoutData.reference_id
                },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            reference_id: payoutData.reference_id,
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
                            reference_id: payoutData.reference_id,
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
                    txn_id: payoutData.reference_id
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

module.exports = {
    unpayPayout
}   
