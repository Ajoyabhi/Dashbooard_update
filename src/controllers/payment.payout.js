const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction.model');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges } = require('../models');
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

      // Calculate total charges
      const totalCharges = parseFloat(adminCharge);
      
      // Calculate final amount to deduct (amount + charges)
      const amountToDeduct = parseFloat(amount) + totalCharges;
      
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
          user_id: user_id
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
      
      // Store transaction charges
      await TransactionCharges.create({
        transaction_type: 'payout',
        reference_id: reference_id,
        transaction_amount: amount,
        transaction_utr: result?.gateway_response?.utr || null,
        merchant_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges,
        user_id: user_id,
        status: result?.success ? 'completed' : 'failed',
        metadata: {
          merchant_response: result,
          requested_ip: clientIp
        }
      });
      
      // Send response based on result
      if (result?.success) {
        await PayoutTransaction.updateOne(
          { reference_id: reference_id },
          { $set: { status: 'completed' } }
        );
        await UserTransaction.updateOne(
          { reference_id: reference_id },
          { $set: { status: 'completed' } }
        );
        res.status(200).json({
          success: true,
          message: 'Payout processed successfully',
          transaction_id: payoutTransaction._id,
          result: result
        });
      } else {
        await PayoutTransaction.updateOne(
          { reference_id: reference_id },
          { $set: { status: 'failed' } }
        );
        await UserTransaction.updateOne(
          { reference_id: reference_id },
          { $set: { status: 'failed' } }
        );
        res.status(400).json({
          success: false,
          message: 'Payout processing failed',
          transaction_id: payoutTransaction._id,
          error: result?.gateway_response?.message || 'Unknown error'
        });
      }
    } catch (error) {
      logger.error('Error processing payout', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message: 'Error processing payout' 
      });
    }
};

module.exports = {
    initiatePayout
};