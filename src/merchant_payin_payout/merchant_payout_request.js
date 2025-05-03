const ApiLogs = require('../models/apiLogs.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const winston = require('winston');

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
    logger.info('Starting unpayPayout process', { reference: payoutData.reference });
    
    try {
        logger.info('Initializing Unpay client');
        const unpay = new Unpay({
            key_id: process.env.UNPAY_KEY_ID,
            key_secret: process.env.UNPAY_KEY_SECRET
        });

        let pay_load = {
            "partner_id": "1809",
            "mode": "IMPS",
            "mobile": "9770665541",
            "name": payoutData.beneficiary_name,
            "account": payoutData.account_number,
            "ifsc": payoutData.account_ifsc,
            "bank": payoutData.reference,
            "amount": payoutData.amount,
            "webhook": process.env.UNPAY_CALLBACK_URL,
            "latitude": "11.2222",
            "longitude": "11.2222",
            "apitxnid": payoutData.reference
        }
        
        logger.info('Preparing payout request', { payload: pay_load });
        
        let aesData = await this.encryptText(JSON.stringify(pay_load), process.env.UNPAY_KEY, process.env.UNPAY_IV);
        logger.info('Encrypted payload generated');

        logger.info('Sending request to Unpay API');
        let result = await lastValueFrom(
            this.httpService.post(
                'https://unpay.in/tech/api/payout/order/create',
                { body: aesData },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': "6Xe0uR9rkRYT9sfb34u8kHXDCmKfym1C561xIKjp"
                    }
                },
            ).pipe(map(response => response.data))
        )
        logger.info('Received response from Unpay API', { status: result.status });

        // Create API log
        const apiLog = await ApiLogs.create({
            request: JSON.stringify(pay_load),
            response: JSON.stringify(result),
            service: 'PAYOUT',
            service_api: 'UNPAY',
            status: result.status === 'success' ? 'success' : 'error',
            error_message: result.message || null,
            execution_time: Date.now() - startTime
        });
        await apiLog.save();
        logger.info('API log created', { logId: apiLog._id });

        if (result.status === 'TXN') {
            let message = result.message;
            let txn_id = result.txnid;
            let utr = result['refno'];
            
            logger.info('Transaction successful', { txn_id, utr });

            let userTransaction = await UserTransaction.updateOne(
                {
                    reference_id: payoutData.reference,
                    status: 'success'
                },
                {
                    $set: {
                        status: 'success',
                        gateway_response: {
                            reference_id: txn_id,
                            status: 'success',
                            message: message,
                            utr: utr
                        }
                    }
                }
            );
            await userTransaction.save();
            logger.info('User transaction updated', { reference: payoutData.reference });

            let payoutTransaction = await PayoutTransaction.updateOne(
                {
                    reference_id: payoutData.reference,
                    status: 'success'
                },
                {
                    $set: {
                        status: 'success',
                        gateway_response: { 
                            reference_id: txn_id,
                            status: 'success',
                            message: message,
                            utr: utr
                        }
                    }
                }
            );          
            await payoutTransaction.save();
            logger.info('Payout transaction updated', { reference: payoutData.reference });

            return {
                data: { 
                    status: result.status,
                    message: result.message,
                    error: result.error,
                    txn_id: txn_id
                },
                status: 200
            }
        } else {
            logger.warn('Transaction failed', { 
                status: result.status,
                message: result.message 
            });

            let userTransaction = await UserTransaction.updateOne(
                {
                    reference_id: payoutData.reference,
                    status: 'failed'
                },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            reference_id: txn_id,
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            await userTransaction.save();
            logger.info('User transaction updated to failed', { reference: payoutData.reference });

            let payoutTransaction = await PayoutTransaction.updateOne(
                {
                    reference_id: payoutData.reference,
                    status: 'failed'
                },
                {
                    $set: {
                        status: 'failed',
                        gateway_response: {
                            reference_id: txn_id,
                            status: 'failed',
                            message: result.message
                        }
                    }
                }
            );
            await payoutTransaction.save();
            logger.info('Payout transaction updated to failed', { reference: payoutData.reference });

            return {
                data: { 
                    status: result.status,
                    message: result.message,
                    error: result.error,
                    txn_id: txn_id
                },
                status: 200
            };
        }
    } catch(error) {
        logger.error('Error in unpayPayout', {
            error: error.message,
            stack: error.stack,
            reference: payoutData.reference
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
