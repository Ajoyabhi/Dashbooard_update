const { logger } = require('../utils/logger');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const axios = require('axios');

/**
 * Process a payin request
 * @param {Object} data - Payin request data
 * @returns {Promise<Object>} - Processing result
 */
const processPayin = async (data) => {
  try {
    logger.info('Starting to process payin request', { 
      transaction_id: data.transaction_id,
      data
    });

    const {
      user_id,
      order_amount,
      name,
      email,
      phone,
      reference_id,
      clientIp
    } = data;

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
    if (order_amount < 100) {
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
      return {
        success: false,
        message: 'Transaction with this reference ID already exists. Please use a different reference ID for new transactions.'
      };
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
      return order_amount >= startAmount && order_amount <= endAmount;
    });

    if (!applicableBracket) {
      throw new Error('No charge bracket found for the given amount');
    }

    // Calculate charges
    let adminCharge = 0;
    let agentCharge = 0;
    let gstAmount = 0;
    let platformFee = 0;

    if (applicableBracket.admin_payin_charge_type === 'percentage') {
      adminCharge = (order_amount * parseFloat(applicableBracket.admin_payin_charge)) / 100;
    } else {
      adminCharge = parseFloat(applicableBracket.admin_payin_charge);
    }

    if (applicableBracket.agent_payin_charge_type === 'percentage') {
      agentCharge = (order_amount * parseFloat(applicableBracket.agent_payin_charge)) / 100;
    } else {
      agentCharge = parseFloat(applicableBracket.agent_payin_charge);
    }

    const totalCharges = parseFloat(adminCharge);

    // Fetch platform charges from database
    const platformCharges = await PlatformCharges.findOne({
      where: { is_active: true }
    });

    if(platformCharges?.charge){
      platformFee = (totalCharges * parseFloat(platformCharges.charge)) / 100;
    }

    if(platformCharges?.gst){
      gstAmount = (totalCharges * parseFloat(platformCharges.gst)) / 100;
    }
    
    // Initialize wallet if it's null
    if (!user.FinancialDetail || user.FinancialDetail.wallet === null) {
      await FinancialDetails.create({
        user_id: user_id,
        wallet: 0,
        settlement: 0,
        lien: 0,
        rolling_reserve: 0
      });
    }
    

    // Create user transaction
    const userTransaction = await UserTransaction.create({
      user: {
        id: new mongoose.Types.ObjectId(user_id),
        user_id: user_id,
      },
      beneficiary_details:{
        name: name || '',
        email: email || '',
        mobile: phone || ''
      },
      transaction_id: data.transaction_id,
      amount: order_amount,
      transaction_type: 'payin',
      reference_id: reference_id,
      status: 'pending',
      charges: {
        admin_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges
      },
      gst_amount: gstAmount,
      platform_fee: platformFee,
      gateway_response: {
        utr: null,
        status: 'pending',
        message: 'Payin request initiated',
        merchant_response: null
      },
      balance: {
        before: user.FinancialDetail.wallet,
        after: user.FinancialDetail.wallet
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
    await userTransaction.save();

    // Create payin transaction
    const payinTransaction = await PayinTransaction.create({
      transaction_id: data.transaction_id,
      user: {
        id: new mongoose.Types.ObjectId(user_id),
        user_id: user_id.toString(),
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        userType: user.user_type || ''
      },
      amount: order_amount,
      charges: {
        admin_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges
      },
      gst_amount: gstAmount,
      platform_fee: platformFee,
      beneficiary_details: {
        beneficiary_name: name || '',
        beneficiary_email: email || '',
        beneficiary_phone: phone || ''
      },
      reference_id: reference_id,
      status: 'pending',
      gateway_response: {
        utr: null,
        status: 'pending',
        message: 'Payin request initiated',
        merchant_response: null
      },
      metadata: {
        requested_ip: clientIp
      },
      remark: 'Payin request initiated',
      created_by: new mongoose.Types.ObjectId(user_id),
      created_by_model: user.user_type || 'User'
    });
    await payinTransaction.save();
    await TransactionCharges.create({
      transaction_type: 'payin',
      reference_id: reference_id,
      transaction_amount: parseFloat(order_amount),
      transaction_utr: null,
      merchant_charge: parseFloat(adminCharge),
      agent_charge: parseFloat(agentCharge),
      total_charges: parseFloat(totalCharges),
      gst_amount: parseFloat(gstAmount),
      platform_fee: parseFloat(platformFee),
      user_id: parseInt(user_id),
      status: 'pending',
      metadata: {
        merchant_response: null,
        requested_ip: clientIp
      }
    });
    logger.debug('DEBUG: Starting payment processing', {
      reference_id,
      timestamp: new Date().toISOString()
    });

    const payinData = {
      user_id,
      order_amount,
      name,
      email,
      phone,
      reference_id,
      clientIp
    };

    let result;
    if(user.MerchantDetail.payin_merchant_name == "Unpay"){
      result = await unpayPayin(payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp, gstAmount, platformFee);
    } else if(user.MerchantDetail.payin_merchant_name == "Spay"){
      result = await spayPayin(payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp, gstAmount, platformFee);
    } else {
      throw new Error('Invalid merchant name');
    }
    console.log("result", result);
    logger.debug('DEBUG: Payment processing completed', {
      reference_id,
      success: result?.success,
      timestamp: new Date().toISOString()
    });

    // Update transaction status
    if (result?.statuscode == "TXN" || result?.data?.statuscode == "TXNS") {
      logger.debug('DEBUG: Updating transaction status to completed', {
        reference_id,
        timestamp: new Date().toISOString()
      });

      await PayinTransaction.updateOne(
        { reference_id },
        { $set: { 
          status: 'payin_qr_generated', 
          gateway_response: { 
            utr: null, 
            status: 'payin_qr_generated', 
            message: 'Payin qr string generated', 
            merchant_response: result.data.apitxnid 
          } 
        }}
      );
      await UserTransaction.updateOne(
        { reference_id },
        { $set: { 
          status: 'payin_qr_generated', 
          gateway_response: { 
            utr: null, 
            status: 'payin_qr_generated', 
            message: 'Payin qr string generated', 
            merchant_response: result.data.apitxnid 
          } 
        }}
      );
      await TransactionCharges.update(
        {
          transaction_utr: result.data.apitxnid,
          status: 'pending'
        },
        {
          where: {
            reference_id: reference_id
          } 
        }
      );
      return {
        success: true,
        reference_id: result.data.apitxnid,
        payment_url: encodeURI(result.data.qrString)
      };
    } else {
      await PayinTransaction.updateOne(
        { reference_id },
        { $set: { status: 'failed' } }
      );
      await UserTransaction.updateOne(
        { reference_id },
        { $set: { status: 'failed' } }
      );
      await TransactionCharges.update(
        {
          status: 'failed'
        },
        {
          where: {
            reference_id: reference_id
          }
        }
      );      
      logger.error('DEBUG: Payin request failed', {
        reference_id,
        status: 'failed',
        message: result.message,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        message: 'Payin request failed'
      };
    }
  } catch (error) {
    logger.error('Error processing payin request', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const unpayPayin = async (payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp) => {
  try {
    const { order_amount, reference_id } = payinData;
    
    // Get merchant details from database
    const merchantDetails = await MerchantDetails.findOne({ where: { user_id } });
    if (!merchantDetails) {
      throw new Error('Merchant details not found');
    }
    const aesKey = "brTaJLaVgWvshn3zHM4qt0lI1DqjFeUz";
    const aesIV = "uBiWATDOnfTvhfJO";
    const apiKey = "Tn3ybTJGKaDMhhj9jl89aULGf9OI0S8ZPkq0GD42";
    const partnerId = "1809";
    const webhookUrl = "https://api.zentexpay.in/api/payments/unpay/callback";
    console.log("webhookUrl", webhookUrl);
    // Prepare request body
    const requestBody = {
      partner_id: partnerId,
      amount: parseInt(order_amount),
      apitxnid: reference_id,
      webhook: webhookUrl
    };

    const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);

    // Make API request to Unpay
    const response = await fetch('https://unpay.in/tech/api/next/upi/request/qr', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        body: encryptedRequestBody 
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`API error: ${result.message || 'Unknown error'}`);
    }
    console.log(result);
    if(result.statuscode == "TXN"){
      return {
        status: result.status,
        message: result.message,
        data: {
        apitxnid: result.data?.apitxnid,
        qrString: result.data?.qrString,
        }
    };
    } else {
      return {
        statuscode: result.statuscode,
        message: result.message,
        data: result.data
      };
    }

  } catch (error) {
    logger.error('Error processing payin request', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const spayPayin = async (payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp, gstAmount, platformFee) => {
    try {
        // Validate required fields
        if (!payinData.name || !payinData.email || !payinData.phone || !payinData.order_amount) {
            throw new Error('Missing required fields: name, email, mobile, or amount');
        }

        // Generate unique transaction ID

        const requestBody = {
            token: "ZFraZiEhWVoGLKhOA0eiiy8tqz8ikb", // Make sure to set this in your environment variables
            apitxnid: payinData.reference_id,
            name: payinData.name,
            email: payinData.email,
            mobile: payinData.phone,
            amount: payinData.order_amount.toString(),
            return_url: "https://api.zentexpay.in/api/payments/spay/callback" // Make sure to set this in your environment variables
        };

        const response = await axios.post('https://dashboard.spay.live/api/upiintent/vp2/create', requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.statuscode === 'TXNS') {
            // Store transaction details in your database
            const transactionData = {
                user_id,
                transaction_id: payinData.reference_id,
                amount: payinData.order_amount,
                admin_charge: adminCharge,
                agent_charge: agentCharge,
                total_charges: totalCharges,
                gst_amount: gstAmount,
                platform_fee: platformFee,
                client_ip: clientIp,
                payment_link: response.data.payment_link,
                status: 'PENDING',
                payment_provider: 'SPAY',
                created_at: new Date()
            };

            // Save transaction to database (implement your database save logic here)
            // await Transaction.create(transactionData);

            return {
                success: true,
                data: {
                    statuscode: response.data.statuscode,
                    qrString: response.data.payment_link,
                    message: response.data.message,
                    apitxnid: payinData.reference_id
                }
            };
        } else {
            throw new Error(response.data.message || 'Payment initiation failed');
        }
    } catch (error) {
        // Handle specific error cases
        if (error.response) {
            switch (error.response.status) {
                case 400:
                    throw new Error('Missing required fields');
                case 401:
                    throw new Error('Invalid amount format');
                case 409:
                    throw new Error('Transaction ID already exists');
                case 500:
                    throw new Error('Internal server error');
                default:
                    throw new Error(error.response.data.message || 'Payment initiation failed');
            }
        }
        throw error;
    }
};

module.exports = {
  processPayin
}; 