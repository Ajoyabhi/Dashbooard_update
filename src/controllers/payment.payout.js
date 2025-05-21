const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction.model');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
// const Agent = require('../models/agent.model');
const { logger } = require('../utils/logger');
const { setValidationResult, setThirdPartyApiInfo } = require('../middleware/apiLogger.middleware');
const { validatePaymentRequest } = require('../controllers/payment.controller');
const PayoutTransaction = require('../models/payoutTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const { Op } = require('sequelize');
const { unpayPayout } = require('../merchant_payin_payout/merchant_payout_request');
const getClientIp = require('../utils/getClientIp');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const axios = require('axios');

/**
 * Initiate a payout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const initiatePayout = async (req, res) => {
    try {
      // Validate request
      const validationResult = validatePaymentRequest(req);
      setValidationResult(req, validationResult);
      if (!validationResult.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request', 
          errors: validationResult.errors 
        });
      }
  
      const { account_number, account_ifsc, bank_name, beneficiary_name, request_type, amount, reference_id } = req.body;

      const user_id = req.user.id;
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

        const clientIp = getClientIp(req);
        console.log('Client IP:', clientIp);

        const isIpWhitelisted = user.UserIPs.some(ip => ip.ip_address === clientIp && ip.is_active);
        if (!isIpWhitelisted) {
            return res.status(400).json({
                success: false,
                message: `User IP address ${clientIp} is not whitelisted`
            });
        }

      if (amount < 100) {
        return res.status(400).json({ 
          success: false, 
          message: 'Minimum payout amount is 100' 
        });
      }

      // Get financial details for the user
      const financialDetails = await FinancialDetails.findOne({
        where: { user_id: user_id }
      });

      if (!financialDetails) {
        return res.status(400).json({
          success: false,
          message: 'Financial details not found for user'
        });
      }

      if (financialDetails.settlement < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      if (reference_id.length !== 12) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reference number must be 12 digits' 
        });
      }
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      if (user.UserStatus.status === 0) {
        return res.status(400).json({
          success: false,
          message: 'User is not active'
        });
      }
      if (user.UserStatus && !user.UserStatus.payout_status) {
        return res.status(403).json({
          success: false,
          message: 'User payout functionality is disabled'
        });
      }
      if (user.FinancialDetails && user.FinancialDetails.settlement < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      if (user.UserStatus.bank_deactive) {
        return res.status(400).json({
          success: false,
          message: 'Bank is deactivated your ip due to security reasons'
        });
      }
      if (user.UserStatus.tecnical_issue) {
        return res.status(400).json({
          success: false,
          message: 'Technical issue please try again later'
        });
      }

      // Check for duplicate transaction with optimized query
      const existingTransaction = await PayoutTransaction.findOne(
        { reference_id },
        { _id: 1, status: 1 }
      ).lean();

      if (existingTransaction) {
        logger.warn('Duplicate transaction attempt', {
          reference_id,
          existing_status: existingTransaction.status
        });
        
        return res.status(400).json({
          success: false,
          message: 'Transaction already exists',
          transaction_id: existingTransaction._id,
          status: existingTransaction.status
        });
      }

      // Find all charge brackets for the user
      const chargeBrackets = await MerchantCharges.findAll({
        where: {
          user_id: user_id
        },
        order: [['start_amount', 'ASC']]
      });

      if (!chargeBrackets || chargeBrackets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No charge brackets found for the user'
        });
      }

      // Find the appropriate charge bracket for the amount
      const applicableBracket = chargeBrackets.find(bracket => {
        const startAmount = parseFloat(bracket.start_amount);
        const endAmount = parseFloat(bracket.end_amount);
        return amount >= startAmount && amount <= endAmount;
      });

      if (!applicableBracket) {
        return res.status(400).json({
          success: false,
          message: 'No charge bracket found for the given amount'
        });
      }

      // Calculate charges based on charge type
      let adminCharge = 0;
      let agentCharge = 0;
      let gstAmount = 0;
      let platformFee = 0;

      // Calculate admin charge
      if (applicableBracket.admin_payout_charge_type === 'percentage') {
        adminCharge = (amount * parseFloat(applicableBracket.admin_payout_charge)) / 100;
      } else {
        adminCharge = parseFloat(applicableBracket.admin_payout_charge);
      }

      // Calculate agent charge
      if (applicableBracket.agent_payout_charge_type === 'percentage') {
        agentCharge = (amount * parseFloat(applicableBracket.agent_payout_charge)) / 100;
      } else {
        agentCharge = parseFloat(applicableBracket.agent_payout_charge);
      }

      // Calculate total charges first
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

      // Update total charges to include platform fee and GST
      const finalTotalCharges = totalCharges + parseFloat(gstAmount) + parseFloat(platformFee);
      
      // Calculate final amount to deduct (amount + charges)
      const amountToDeduct = parseFloat(amount) + finalTotalCharges;
      
      // Calculate remaining balance
      const user_balance_left = parseFloat(user.FinancialDetail.settlement) - amountToDeduct;
      
      // Update settlement in FinancialDetails using Sequelize
      await FinancialDetails.update(
        { settlement: user_balance_left },
        { 
          where: { user_id: user_id },
          returning: true
        }
      );

      let userTransaction = await UserTransaction.create({
        user: {
          id: new mongoose.Types.ObjectId(user_id),
          user_id: user_id,
        },
        beneficiary_details:{
          name: beneficiary_name
        },
        transaction_id: uuidv4(),
        amount: amount,
        transaction_type: 'payout',
        reference_id: reference_id,
        status: 'pending',
        charges: {
          admin_charge: adminCharge,
          agent_charge: agentCharge,
          total_charges: totalCharges
        },
        gst_amount: gstAmount,
        platform_fee: platformFee,
        balance: {
          before: user.FinancialDetail.settlement,
          after: user_balance_left
        },
        merchant_details: {
          merchant_name: user.MerchantDetail.payout_merchant_name,
          merchant_callback_url: user.MerchantDetail.payout_callback
        },
        remark: 'Payout request initiated',
        metadata: {
          requested_ip: clientIp
        },
        created_by: new mongoose.Types.ObjectId(user_id),
        created_by_model: user.user_type
      });
      await userTransaction.save();

      let payoutTransaction = await PayoutTransaction.create({
        transaction_id: uuidv4(),
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
        gst_amount: gstAmount,
        platform_fee: platformFee,
        beneficiary_details: {
          account_number: account_number,
          account_ifsc: account_ifsc,
          bank_name: bank_name,
          beneficiary_name: beneficiary_name
        },
        reference_id: reference_id,
        status: 'pending',
        gateway_response: {
          reference_id: reference_id,
          status: 'pending',
          message: 'Payout request initiated',
          raw_response: null
        },
        metadata: {
          requested_ip: clientIp
        },
        remark: 'Payout request initiated',
        created_by: new mongoose.Types.ObjectId(user_id),
        created_by_model: user.user_type || 'User'
      });
      await payoutTransaction.save();

      // Add validation for decimal values
      const transactionAmount = parseFloat(amount);
      const merchantCharge = parseFloat(adminCharge);
      const userId = parseInt(user_id);

      // Validate numeric values
      if (isNaN(transactionAmount) || isNaN(merchantCharge) || isNaN(agentCharge) || isNaN(totalCharges) || isNaN(userId)) {
        throw new Error('Invalid numeric values in transaction data');
      }

      const transactionData = {
        transaction_type: 'payout',
        reference_id: reference_id,
        transaction_amount: transactionAmount,
        transaction_utr: null,
        merchant_charge: merchantCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges,
        gst_amount: gstAmount,
        platform_fee: platformFee,
        user_id: userId,
        status: 'pending',
        metadata: {
          merchant_response: null,
          requested_ip: clientIp
        }
      };
      
      // Remove any extra fields that might have been added
      const cleanTransactionData = {
        transaction_type: transactionData.transaction_type,
        reference_id: transactionData.reference_id,
        transaction_amount: transactionData.transaction_amount,
        transaction_utr: transactionData.transaction_utr,
        merchant_charge: transactionData.merchant_charge,
        agent_charge: transactionData.agent_charge,
        total_charges: transactionData.total_charges,
        gst_amount: transactionData.gst_amount,
        platform_fee: transactionData.platform_fee,
        user_id: transactionData.user_id,
        status: transactionData.status,
        metadata: transactionData.metadata
      };
      
      logger.info('Creating transaction charges with data:', cleanTransactionData);
      
      await TransactionCharges.create(cleanTransactionData);

      if (user.MerchantDetail.payout_merchant_name === 'unpay') {
        const payoutData = {
          reference_id,
          amount,
          beneficiary_details: {
            account_number,
            account_ifsc,
            bank_name,
            beneficiary_name,
            mobile: user.mobile
          }
        };
        result = await unpayPayout(payoutData);
      }
      console.log(result);
      if (result['statuscode'] == 'TXN')  {
        res.status(200).json({
          success: true,
          message: 'Payout processed successfully',
          transaction_id: result.data.txn_id,
          result: result.data.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payout processing failed',
          transaction_id: result.data.txn_id,
          error: result?.data?.message || 'Unknown error'
        });
      }
    } catch (error) {
      logger.error('Error processing payout', { 
        error: error.message,
        stack: error.stack,
        validationResult: req.validationResult,
        requestBody: req.body
      });
      res.status(500).json({ 
        success: false, 
        message: 'Error processing payout',
        error: error.message
      });
    }
};

const getPayoutTransactionStatus = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const user_id = req.user.id;

    // Find transaction
    const transaction = await PayoutTransaction.findOne({
      transaction_id,
      'user.id': user_id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Prepare request body for Unpay API
    const requestBody = {
      partner_id: "1809", // Get this from merchant details or config
      apitxnid: transaction_id
    };

    // Encrypt request body
    const aesKey = "brTaJLaVgWvshn3zHM4qt0lI1DqjFeUz"; // Get from config
    const aesIV = "uBiWATDOnfTvhfJO"; // Get from config
    const apiKey = "XdWCmd0NF1ZVklnVPegOdL59WkFM7o4h91UYPAt1"; // Get from config
    const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);

    // Make API request to Unpay using axios
    const response = await axios.post('https://unpay.in/tech/api/payout/order/status', 
      { body: encryptedRequestBody },
      {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        }
      }
    );

    const result = response.data;

    // Handle different response status codes
    if (result.statuscode === 'TXN') {
      // Success case
      res.status(200).json({
        success: true,
        message: 'Transaction status retrieved successfully',
        transaction: {
          transaction_id: transaction.transaction_id,
          status: result.status,
          utr: result.utr,
          amount: result.amount,
          gateway_response: result
        }
      });
    } else if (result.statuscode === 'TXF') {
      // Failed case - No record found
      res.status(200).json({
        success: false,
        message: result.message || 'Transaction record not found',
        transaction: {
          transaction_id: transaction.transaction_id,
          status: transaction.status,
          gateway_response: result
        }
      });
    } else {
      // Unknown status code
      res.status(200).json({
        success: false,
        message: 'Unknown transaction status',
        transaction: {
          transaction_id: transaction.transaction_id,
          status: transaction.status,
          gateway_response: result
        }
      });
    }
  } catch (error) {
    logger.error('Error retrieving transaction status', {
      error: error.message,
      stack: error.stack,
      transaction_id: req.params.transaction_id
    });

    // Handle axios specific errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return res.status(error.response.status).json({
        success: false,
        message: 'Error retrieving transaction status',
        error: error.response.data.message || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(500).json({
        success: false,
        message: 'No response received from payment gateway',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error retrieving transaction status',
      error: error.message
    });
  }
};

module.exports = {
    initiatePayout,
    getPayoutTransactionStatus
};