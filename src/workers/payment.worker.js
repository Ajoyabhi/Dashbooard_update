const { payinQueue } = require('../config/queue.config');
const { processPayment } = require('../services/payment.service');
const { logger } = require('../utils/logger');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
// const unpay = require('@api/unpay');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
// const { unpayPayin } = require('../merchant_payin_payout/merchant_payin_request');
const mongoose = require('mongoose');

// Log when worker is initialized
logger.info('Payment worker initialized');

// Verify Redis connection
payinQueue.isReady().then(() => {
  logger.info('Payin queue is ready and connected to Redis');
}).catch(error => {
  logger.error('Error connecting to Redis for payin queue:', {
    error: error.message,
    stack: error.stack
  });
});

// Process payin jobs
payinQueue.process(async (job) => {
  try {
    logger.info('Starting to process payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      data: job.data
    });

    const {
      user_id,
      amount,
      account_number,
      account_ifsc,
      bank_name,
      beneficiary_name,
      reference_id,
      clientIp
    } = job.data;

    // Fetch user and all related data
    const user =  await User.findByPk(user_id, {
      include: [
        { model: UserStatus },
        { model: MerchantDetails },
        { model: MerchantCharges },
        { model: MerchantModeCharges },
        { model: FinancialDetails },
        { model: UserIPs }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate IP whitelist
    const isIpWhitelisted = user.UserIPs.some(ip => ip.ip_address === clientIp && ip.is_active);
    if (!isIpWhitelisted) {
      throw new Error(`User IP address ${clientIp} is not whitelisted`);
    }

    // Validate amount
    if (amount < 100) {
      throw new Error('Minimum payin amount is 100');
    }

    // Validate reference ID
    if (reference_id.length !== 12) {
      throw new Error('Reference number must be 12 digits');
    }

    // Validate user status
    if (user.UserStatus.status === 0) {
      throw new Error('User is not active');
    }

    if (!user.UserStatus.payin_status) {
      throw new Error('User payin functionality is disabled');
    }

    if (user.UserStatus.bank_deactive) {
      throw new Error('Bank is deactivated your ip due to security reasons');
    }

    if (user.UserStatus.tecnical_issue) {
      throw new Error('Technical issue please try again later');
    }

    // Check for duplicate transaction
    const existingTransaction = await PayinTransaction.findOne(
      { reference_id },
      { _id: 1, status: 1 }
    ).lean();

    if (existingTransaction) {
      // Only allow retry if this is part of the same job attempt cycle
      if ((existingTransaction.status === 'failed' || existingTransaction.status === 'pending') && job.attemptsMade > 0) {
        logger.info('Found existing transaction with status: ' + existingTransaction.status + ', allowing retry', { 
          reference_id,
          attempt: job.attemptsMade
        });
        
        // Clean up existing transaction records
        await Promise.all([
          PayinTransaction.deleteOne({ reference_id }),
          UserTransaction.deleteOne({ reference_id }),
          TransactionCharges.destroy({ where: { reference_id } })
        ]);
        
        logger.info('Cleaned up existing transaction records', { reference_id });
      } else {
        throw new Error('Transaction with this reference ID already exists. Please use a different reference ID for new transactions.');
      }
    }

    // Find charge brackets
    const chargeBrackets = await MerchantCharges.findAll({
      where: { user_id },
      order: [['start_amount', 'ASC']]
    });

    if (!chargeBrackets || chargeBrackets.length === 0) {
      throw new Error('No charge brackets found for the user');
    }

    // Find applicable charge bracket
    const applicableBracket = chargeBrackets.find(bracket => {
      const startAmount = parseFloat(bracket.start_amount);
      const endAmount = parseFloat(bracket.end_amount);
      return amount >= startAmount && amount <= endAmount;
    });

    if (!applicableBracket) {
      throw new Error('No charge bracket found for the given amount');
    }

    // Calculate charges
    let adminCharge = 0;
    let agentCharge = 0;

    if (applicableBracket.admin_payin_charge_type === 'percentage') {
      adminCharge = (amount * parseFloat(applicableBracket.admin_payin_charge)) / 100;
    } else {
      adminCharge = parseFloat(applicableBracket.admin_payin_charge);
    }

    if (applicableBracket.agent_payin_charge_type === 'percentage') {
      agentCharge = (amount * parseFloat(applicableBracket.agent_payin_charge)) / 100;
    } else {
      agentCharge = parseFloat(applicableBracket.agent_payin_charge);
    }

    const totalCharges = parseFloat(adminCharge);
    const amountToDeduct = parseFloat(amount) + totalCharges;
    const user_balance_left = parseFloat(user.FinancialDetail.settlement) - amountToDeduct;

    // Update settlement
    await FinancialDetails.update(
      { settlement: user_balance_left },
      { where: { user_id } }
    );

    // Create user transaction
    const userTransaction = await UserTransaction.create({
      user: {
        id: new mongoose.Types.ObjectId(user_id),
        user_id: user_id
      },
      transaction_id: job.data.transaction_id,
      amount: amount,
      transaction_type: 'payin',
      reference_id: reference_id,
      status: 'pending',
      charges: {
        admin_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges
      },
      balance: {
        before: user.FinancialDetail.settlement,
        after: user_balance_left
      },
      merchant_details: {
        merchant_name: user.MerchantDetail.payin_merchant_name,
        merchant_callback_url: user.MerchantDetail.payin_callback
      },
      remark: 'Payin request initiated',
      metadata: {
        requested_ip: clientIp
      },
      created_by: new mongoose.Types.ObjectId(user_id),
      created_by_model: user.user_type
    });

    // Create payin transaction
    const payinTransaction = await PayinTransaction.create({
      transaction_id: job.data.transaction_id,
      user: {
        id: new mongoose.Types.ObjectId(user_id),
        user_id: user_id.toString(),
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        userType: user.user_type || ''
      },
      amount: amount,
      charges: {
        admin_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges
      },
      beneficiary_details: {
        account_number,
        account_ifsc,
        bank_name,
        beneficiary_name
      },
      reference_id: reference_id,
      status: 'pending',
      gateway_response: {
        reference_id: reference_id,
        status: 'pending',
        message: 'Payin request initiated',
        raw_response: null
      },
      metadata: {
        requested_ip: clientIp
      },
      remark: 'Payin request initiated',
      created_by: new mongoose.Types.ObjectId(user_id),
      created_by_model: user.user_type || 'User'
    });

    console.log("payinTransaction");

    logger.debug('DEBUG: Starting payment processing', {
      reference_id,
      timestamp: new Date().toISOString()
    });
    const payinData = {
      user_id,
      amount,
      account_number,
      account_ifsc,
      bank_name,
      beneficiary_name,
      reference_id,
      clientIp
    };

    const result = await unpayPayin(payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp);  
    // Process payment
    // const result = await processPayment({
    //   user_id,
    //   amount,
    //   account_number,
    //   account_ifsc,
    //   bank_name,
    //   beneficiary_name,
    //   reference_id,
    //   clientIp
    // });

    logger.debug('DEBUG: Payment processing completed', {
      reference_id,
      success: result?.success,
      timestamp: new Date().toISOString()
    });

    // Update transaction status
    if (result?.success) {
      logger.debug('DEBUG: Updating transaction status to completed', {
        reference_id,
        timestamp: new Date().toISOString()
      });

      await PayinTransaction.update(
        { status: 'completed', gateway_response: result },
        { where: { transaction_id: reference_id } }
      );
      await UserTransaction.updateOne(
        { reference_id },
        { $set: { status: 'completed' } }
      );
    } else {
      await PayinTransaction.updateOne(
        { reference_id },
        { $set: { status: 'failed' } }
      );
      await UserTransaction.updateOne(
        { reference_id },
        { $set: { status: 'failed' } }
      );
    }

    // Store transaction charges
    await TransactionCharges.create({
      transaction_type: 'payin',
      reference_id: reference_id,
      transaction_amount: parseFloat(amount),
      transaction_utr: result?.gateway_response?.utr || null,
      merchant_charge: parseFloat(adminCharge),
      agent_charge: parseFloat(agentCharge),
      total_charges: parseFloat(totalCharges),
      user_id: parseInt(user_id),
      status: result?.success ? 'completed' : 'failed',
      metadata: {
        merchant_response: result,
        requested_ip: clientIp
      }
    });

    return {
      success: result?.success || false,
      transaction_id: payinTransaction._id,
      result: result
    };

  } catch (error) {
    logger.error('Error processing payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// Process callback jobs
payinQueue.process('callback', async (job) => {
  try {
    logger.info('Processing Unpay callback', { 
      jobId: job.id,
      data: job.data 
    });

    const { txnid, status, message, upi_tr, upi_string } = job.data;

    // Validate callback data
    if (!txnid || !status) {
      throw new Error('Invalid callback data');
    }

    // Find the transaction
    const payinTransaction = await PayinTransaction.findOne({ reference_id: txnid });
    if (!payinTransaction) {
      throw new Error(`Transaction not found: ${txnid}`);
    }

    // Update transaction status based on callback
    const statusMap = {
      'TXN': 'completed',
      'TUP': 'pending',
      'TXF': 'failed',
      'ERR': 'failed'
    };

    const newStatus = statusMap[status] || 'failed';

    // Update all related records
    await Promise.all([
      // Update PayinTransaction
      PayinTransaction.updateOne(
        { reference_id: txnid },
        {
          $set: {
            status: newStatus,
            gateway_response: {
              reference_id: upi_tr,
              status: status,
              message: message,
              upi_string: upi_string
            }
          }
        }
      ),

      // Update UserTransaction
      UserTransaction.updateOne(
        { reference_id: txnid },
        {
          $set: {
            status: newStatus,
            gateway_response: {
              reference_id: upi_tr,
              status: status,
              message: message,
              upi_string: upi_string
            }
          }
        }
      ),

      // Update TransactionCharges
      TransactionCharges.update(
        {
          status: newStatus,
          transaction_utr: upi_tr,
          metadata: {
            ...job.data,
            callback_received_at: new Date()
          }
        },
        {
          where: { reference_id: txnid }
        }
      )
    ]);

    logger.info('Successfully processed Unpay callback', {
      txnid,
      status,
      newStatus
    });

    return { success: true };

  } catch (error) {
    logger.error('Error processing Unpay callback', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      data: job.data
    });
    throw error;
  }
});

// Job completion handlers
payinQueue.on('completed', (job, result) => {
  logger.info('Payin job completed successfully', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id,
    result: result
  });
});

// Job failure handlers with retry logic
payinQueue.on('failed', (job, error) => {
  logger.error('Payin job failed', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
  if (job.attemptsMade < 3) {
    logger.info('Retrying payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      attempt: job.attemptsMade + 1
    });
  } else {
    logger.error('Payin job failed after maximum retries', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id
    });
  }
});

// Queue error handlers
payinQueue.on('error', (error) => {
  logger.error('Payin queue error:', { 
    error: error.message,
    stack: error.stack
  });
});

payinQueue.on('stalled', (job) => {
  logger.warn('Payin job stalled:', { 
    jobId: job.id,
    transaction_id: job.data.transaction_id
  });
});

const unpayPayin = async (payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp) => {
  const startTime = Date.now();
  logger.info('Starting unpayPayin process', { reference: payinData.reference_id });

  try {
    logger.info('Initializing Unpay client');
    const aesKey = process.env.UNPAY_KEY;
    const aesIV = process.env.UNPAY_IV;

    // Validate encryption parameters
    if (!aesKey || !aesIV) {
      throw new Error('Missing encryption parameters');
    }
    console.log("aesKey", aesKey);
    console.log("aesIV", aesIV);
    // Prepare parameters according to API docs
    const parameters = {
      partner_id: process.env.UNPAY_PARTNER_ID,
      txnid: payinData.reference_id,
      amount: payinData.amount.toString(),
      callback: process.env.UNPAY_CALLBACK_URL
    };

    logger.info('Preparing payin request', { parameters });

    // Encrypt the parameters
    const encryptedBody = await encryptText(JSON.stringify(parameters), aesKey, aesIV);
    logger.info('Encrypted payload generated');

    // Prepare request body
    const requestBody = {
      body: encryptedBody
    };

    logger.info('Sending request to Unpay API');
    const response = await fetch('https://unpay.in/tech/api/payin/order/create', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.UNPAY_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    console.log(result);
    logger.info('Received response from Unpay API', { status: result.statuscode });

    // Handle different response status codes
    switch (result.statuscode) {
      case 'TXN':
        logger.info('Transaction successful', { 
          upi_tr: result.upi_tr,
          upi_string: result.upi_string 
        });

        // Create transaction charges
        await TransactionCharges.create({
          transaction_type: 'payin',
          reference_id: payinData.reference_id,
          transaction_amount: payinData.amount,
          transaction_utr: result.upi_tr,
          merchant_charge: adminCharge,
          agent_charge: agentCharge,
          total_charges: totalCharges,
          user_id: user_id,
          status: 'completed',
          metadata: {
            merchant_response: result,
            requested_ip: clientIp
          }
        }); 

        // Update user transaction
        await UserTransaction.updateOne(
          {
            reference_id: payinData.reference_id
          },
          {
            $set: {
              status: 'success',
              gateway_response: {
                reference_id: result.upi_tr,
                status: 'success',
                message: result.message,
                upi_string: result.upi_string
              }
            }
          }
        );
        logger.info('User transaction updated', { reference: payinData.reference_id });

        // Update payin transaction
        await PayinTransaction.updateOne(
          {
            reference_id: payinData.reference_id
          },
          {
            $set: {
              status: 'completed',
              gateway_response: {
                reference_id: result.upi_tr,
                status: 'success',
                message: result.message,
                upi_string: result.upi_string
              }
            }
          }
        );
        logger.info('Payin transaction updated', { reference: payinData.reference_id });

        return {  
          success: true,
          gateway_response: {
            reference_id: result.upi_tr,
            status: 'success',
            message: result.message,
            upi_string: result.upi_string
          }
        };

      case 'TUP':
        logger.info('Transaction pending', { message: result.message });
        return {
          success: false,
          gateway_response: {
            status: 'pending',
            message: result.message
          }
        };

      case 'TXF':
      case 'ERR':
        logger.error('Transaction failed', { 
          reference: payinData.reference_id, 
          message: result.message 
        });
        return {
          success: false,
          gateway_response: {
            status: 'failed',
            message: result.message
          }
        };

      default:
        throw new Error(`Unknown status code: ${result.statuscode}`);
    }

  } catch (error) {
    logger.error('Error in unpayPayin', { 
      reference: payinData.reference_id, 
      error: error.message,
      stack: error.stack 
    });
    
    // Update transactions to failed status
    await Promise.all([
      UserTransaction.updateOne(
        { reference_id: payinData.reference_id },
        { $set: { status: 'failed' } }
      ),
      PayinTransaction.updateOne(
        { reference_id: payinData.reference_id },
        { $set: { status: 'failed' } }
      )
    ]);

    return {
      success: false,
      gateway_response: {
        status: 'failed',
        message: error.message
      }
    };
  }
};

module.exports = {
  payinQueue
}; 