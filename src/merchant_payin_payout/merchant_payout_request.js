const ApiLogs = require('../models/apiLogs.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const UserTransaction = require('../models/userTransaction.model');

async function unpayPayout(payoutData) {
    try{
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
            "webhook": process.env.UNPAY_CALLBACK_URL, //this need to be changed for our callback url
            "latitude": "11.2222",
            "longitude": "11.2222",
            "apitxnid": payoutData.reference
        }
        let aesData = await this.encryptText(JSON.stringify(pay_load), process.env.UNPAY_KEY, process.env.UNPAY_IV);
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

        // Create API log
        const apiLog = await ApiLogs.create({
        request: JSON.stringify(pay_load),
        response: JSON.stringify(result),
        service: 'PAYOUT',
        service_api: 'UNPAY',
        status: result.status === 'success' ? 'success' : 'error',
        error_message: result.message || null,
        execution_time: Date.now() - startTime // Assuming you have startTime defined at the beginning of the function
        });
        await apiLog.save();

        if (result.status === 'TXN') {
            let message = result.message;
            let txn_id = result.txnid;
            let utr = result['refno'];

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
            return {
                data: { status: result.status,
                    message: result.message,
                    error: result.error,
                    txn_id: txn_id
                },
                status: 200
            }
        }else{
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
        

            return {
            data: { status: result.status,
                message: result.message,
                error: result.error,
                txn_id: txn_id
            },
            status: 200
            };
        }
    }catch(error){
        return {
            data: { status: 'error',
                message: error.message
            },
            status: 500
        }
    }
}

module.exports = {
    unpayPayout
}   
