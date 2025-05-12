const { payinQueue } = require('../config/queue.config');
const { logger } = require('../utils/logger');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
// const { unpayPayin } = require('../merchant_payin_payout/merchant_payin_request');
const mongoose = require('mongoose');
const config = require('../config');

// Connect to MongoDB
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,  // Force IPv4
  directConnection: true,
  retryWrites: true,
  w: 'majority'
};

logger.info('Attempting to connect to MongoDB with URI:', config.mongodb.uri);

mongoose.connect(config.mongodb.uri, mongoOptions)
.then(() => {
  logger.info('Connected to MongoDB successfully');
})
.catch(err => {
  logger.error('MongoDB connection error:', err);
  if (err.name === 'MongooseServerSelectionError') {
    logger.error('MongoDB connection details:', {
      uri: config.mongodb.uri,
      error: err.message,
      code: err.code,
      name: err.name
    });
  }
  process.exit(1);
});

// Log when worker is initialized
logger.info('Payment worker initialized');

// Process multiple jobs concurrently
const CONCURRENCY = 10; // Process 10 jobs at a time
logger.info(`Starting worker with concurrency of ${CONCURRENCY}`);

// Start processing jobs with concurrency
payinQueue.process(CONCURRENCY, async (job) => {
  try {
    logger.info('Starting to process payin job', { 
      jobId: job.id,
      transaction_id: job.data.transaction_id,
      data: job.data,
      concurrency: CONCURRENCY
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
    const user = await User.findByPk(user_id, {
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
        user_id: user_id,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        userType: user.user_type || ''
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
      gateway_response: {
        utr: reference_id,
        status: 'pending',
        message: 'Payin request initiated',
        raw_response: null
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
        utr: reference_id,
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

    // const result = await unpayPayin(payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp);
    const result = {
      success: true,
      gateway_response: {
        utr: '1234567890',
        status: 'completed',
        message: 'Payin request completed', 
        raw_response: null
      }
    };

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

      await PayinTransaction.updateOne(
        { reference_id },
        { $set: { 
          status: 'completed', 
          gateway_response: { 
            utr: result.gateway_response.utr, 
            status: 'completed', 
            message: 'Payin request completed', 
            raw_response: result 
          } 
        }}
      );
      await UserTransaction.updateOne(
        { reference_id },
        { $set: { 
          status: 'completed', 
          gateway_response: { 
            utr: result.gateway_response.utr, 
            status: 'completed', 
            message: 'Payin request completed', 
            raw_response: result 
          } 
        }}
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
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// Handle job events
payinQueue.on('completed', (job, result) => {
  logger.info('Payin job completed successfully', { 
    jobId: job.id,
    result
  });
});

payinQueue.on('failed', (job, error) => {
  logger.error('Payin job failed', { 
    jobId: job.id,
    error: error.message,
    stack: error.stack
  });
});

// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down worker...');
  await payinQueue.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker', {
    reason,
    promise
  });
  process.exit(1);
});

module.exports = {
  payinQueue
}; 