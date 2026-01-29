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
const { unpayPayout, spayPayout, philpayPayout } = require('../merchant_payin_payout/merchant_payout_request');
const { bipspayPayout } = require('../services/payment.service');
const getClientIp = require('../utils/getClientIp');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const axios = require('axios');
const { unpayTransactionStatus, spayTransactionStatus, philpayTransactionStatus, getBipspayPayoutTransactionStatus } = require('../transactionStatusCheck/TransactionCheck');

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
      const settlementAmount = parseFloat(financialDetails.settlement);
      const requestedAmount = parseFloat(amount);

      if (isNaN(settlementAmount) || isNaN(requestedAmount)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount values'
        });
      }

      if (settlementAmount < requestedAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          details: {
            available: settlementAmount,
            requested: requestedAmount
          }
        });
      }

      if (reference_id.length < 12 || reference_id.length > 25) {
        return res.status(400).json({ 
          success: false, 
          message: 'Reference number must be between 12 and 25 digits' 
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

      await TransactionCharges.create({
        transaction_type: 'payout',
        reference_id: reference_id,
        transaction_amount: amount,
        transaction_utr: null,
        merchant_charge: adminCharge,
        agent_charge: agentCharge,
        total_charges: totalCharges,
        gst_amount: gstAmount,
        platform_fee: platformFee,
        user_id: user_id,
        status: 'pending',
        metadata: {
          merchant_response: null,
          requested_ip: clientIp
        }
      });
      let result;
      if (user.MerchantDetail.payout_merchant_name === 'Unpay') {
        const payoutData = {
          reference_id,
          user_id,
          amount,
          amountToDeduct,
          beneficiary_details: {
            account_number,
            account_ifsc,
            bank_name,
            beneficiary_name,
            mobile: user.mobile
          }
        };
        result = await unpayPayout(payoutData);
        if (result?.status == 200) {
          await payoutTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "completed", gateway_response: { reference_id, status: "completed", message: result.data.message, merchant_response: result.data.txn_id } } }
          );
          await userTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "completed", gateway_response: { reference_id, status: "completed", message: result.data.message, merchant_response: result.data.txn_id } } }
          );
          await TransactionCharges.update(
            {
              status: 'completed',
              merchant_response: result.data.txn_id
            },
            { where: { reference_id: reference_id } }
          );
          res.status(200).json({
            // result od chnages
            success: true,
            result: result.data.message,
            utr: result.data.utr,
            reference_id: result.data.apitxnid
          });
        } else {
          await payoutTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "failed", gateway_response: { reference_id, status: "failed", message: result?.data?.message || 'Unknown error' } } }
          );
          await userTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "failed", gateway_response: { reference_id, status: "failed", message: result?.data?.message || 'Unknown error' } } }
          );
          await TransactionCharges.update(
            {
              status: 'failed',
              merchant_response: result.data.txn_id
            },
            { where: { reference_id: reference_id } }
          );
          res.status(400).json({
            success: false,
            message: 'Payout processing failed',
            error: result?.data?.message || 'Unknown error',
            utr: result.data.utr,
            reference_id: result.data.apitxnid
          });
        }
      }
      else if (user.MerchantDetail.payout_merchant_name === 'SPay') {
        console.log("this is payout data of spay", payoutData)
        const payoutData = {
          reference_id,
          user_id,
          amount,
          amountToDeduct,
          request_type,
          beneficiary_details: {
            account_number,
            account_ifsc,
            bank_name,
            beneficiary_name,
            mobile: user.mobile,
            email: user.email,
            address: user.address,
            upi_on: user.upi_on || ''
          }
        };
        result = await spayPayout(payoutData);
        console.log("this is result of spay payout", result)
      }
      else if (user.MerchantDetail.payout_merchant_name === 'Philpay') {
        const payoutData = {
          reference_id,
          user_id,
          amount,
          amountToDeduct,
          request_type,
          beneficiary_details: {
            account_number,
            account_ifsc,
            bank_name,
            beneficiary_name,
            mobile: user.mobile,
            email: user.email,
            address: user.address
          }
        };
        result = await philpayPayout(payoutData);
        console.log("this is result of philpay payout", result)
        if (result?.status == 200) {
          return res.status(200).json({
           success: true,
           message: result.data.message || "Payout is processing",
           merchant_order_id: result.data.merchant_order_id
          });
        }
        else {
          return res.status(400).json({
            success: false,
            message: result.data.message || 'Payout processing failed',
            reference_id: result.data.apitxnid
          });
        }
      }
      else if (user.MerchantDetail.payout_merchant_name === 'Bipspay') {
        const payoutData = {
          reference_id,
          user_id,
          amount,
          amountToDeduct,
          request_type,
          beneficiary_details: {
            account_number,
            account_ifsc,
            bank_name,
            beneficiary_name
          }
        };
        result = await bipspayPayout(payoutData);
        console.log("this is result of bipspay payout", result)
            
        if (result.success) {
          const transactionData = result.data.data || result.data;
          const transactionStatus = transactionData.status || 'SUCCESS';
          const isQueued = transactionStatus === 'SUCCESS' && (transactionData.remark?.includes('Queue') || transactionData.remark?.includes('process'));
          
          // Determine database status: 'pending' for queued, 'completed' for immediate success
          const dbStatus = isQueued ? 'pending' : 'completed';
          const gatewayStatus = isQueued ? 'pending' : 'completed';
          
          // Extract reference IDs
          const payoutRef = transactionData.payout_ref || transactionData.payout_id || reference_id;
          const utr = transactionData.rrn || transactionData.bank_ref || null;
          
          await payoutTransaction.updateOne(
            { reference_id: reference_id },
            { 
              $set: { 
                status: dbStatus, 
                gateway_response: { 
                  reference_id, 
                  status: gatewayStatus, 
                  message: result.message || transactionData.remark || 'Payout request processed',
                  merchant_response: payoutRef,
                  utr: utr
                } 
              } 
            }
          );
          await userTransaction.updateOne(
            { reference_id: reference_id },
            { 
              $set: { 
                status: dbStatus, 
                gateway_response: { 
                  reference_id, 
                  status: gatewayStatus, 
                  message: result.message || transactionData.remark || 'Payout request processed',
                  merchant_response: payoutRef,
                  utr: utr
                } 
              } 
            }
          );
          await TransactionCharges.update(
            {
              status: dbStatus,
              transaction_utr: utr,
              merchant_response: payoutRef
            },
            { where: { reference_id: reference_id } }
          );
          
          return res.status(200).json({
            success: true,
            message: result.message || transactionData.remark || 'Payout request processed successfully',
            payout_ref: payoutRef,
            utr: utr,
            reference_id: reference_id,
            status: transactionStatus,
            remark: transactionData.remark || null
          });
        } else {
          await payoutTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "failed", gateway_response: { reference_id, status: "failed", message: result.message || 'Unknown error' } } }
          );
          await userTransaction.updateOne(
            { reference_id: reference_id },
            { $set: { status: "failed", gateway_response: { reference_id, status: "failed", message: result.message || 'Unknown error' } } }
          );
          await TransactionCharges.update(
            {
              status: 'failed',
              merchant_response: result.data?.payout_ref || result.data?.payout_id
            },
            { where: { reference_id: reference_id } }
          );

          // Revert balance
          const userFinancial = await FinancialDetails.findOne({ where: { user_id: user_id } });
          if (userFinancial) {
            const newSettlement = parseFloat(userFinancial.settlement) + parseFloat(amountToDeduct);
            await FinancialDetails.update(
              { settlement: newSettlement },
              { where: { user_id: user_id } }
            );
          }

          return res.status(400).json({
            success: false,
            message: 'Payout processing failed',
            error: result.message || 'Unknown error',
            reference_id: reference_id
          });
        }
      }

    } catch (error) {
      logger.error('Error processing payout', { error: error.message });
      res.status(500).json({ 
        success: false, 
        message: 'Error processing payout' 
      });
    }
};

const getPayoutTransactionStatus = async (req, res) => {
  try {
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
    const { transaction_id } = req.params;


    // Find transaction
    const transaction = await PayoutTransaction.findOne({
      reference_id:transaction_id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    let result;
    const merchantName = user.MerchantDetail.payout_merchant_name;
    
    try {
      if(merchantName === 'Unpay'){
        result = await unpayTransactionStatus(transaction_id);
        console.log("this is result of unpay payout", result)
      }else if(merchantName === 'SPay'){
        result = await spayTransactionStatus(transaction_id);
        console.log("this is result of spay payout", result)
      }else if(merchantName === 'Philpay'){
        result = await philpayTransactionStatus(transaction_id);
        console.log("this is result of philpay payout", result)
        if (result && result.data && result.data.response && typeof result.data.response === 'object') {
          const { metadata, id, vpa, fees, amount, ...sanitized } = result.data.response;
          // Divide amount by 100 if it exists
          const adjustedAmount = amount ? amount / 100 : amount;
          result = { ...result, data: { ...result.data, response: { ...sanitized, amount: adjustedAmount } } };
        }
        // console.log("this is result of philpay payout", result)
      }else if(merchantName === 'Bipspay'){
        result = await getBipspayPayoutTransactionStatus(transaction_id);
        console.log("this is result of bipspay payout", result)
      } else {
        return res.status(400).json({
          success: false,
          message: `Transaction status check not configured for merchant: ${merchantName}`
        });
      }
    } catch (statusError) {
      logger.error('Error fetching transaction status from gateway', {
        error: statusError.message,
        merchantName,
        transaction_id
      });
      // If it's an axios error with response, return that status
      if (statusError.response) {
        return res.status(statusError.response.status || 500).json({
          success: false,
          message: 'Error retrieving transaction status from payment gateway',
          error: statusError.response.data?.message || statusError.message
        });
      }
      // Re-throw to be caught by outer catch block
      throw statusError;
    }

    // Check if result exists
    if(result && result.status){
      // Handle BipsPay response structure - transaction data is nested in result.data.response
      if(merchantName === 'Bipspay' && result.data && result.data.response){
        const transactionResponse = result.data.response;
        const transactionStatus = transactionResponse.status || 'unknown';
        const isSuccess = transactionStatus === 'SUCCESS';
        
        return res.status(200).json({
          success: isSuccess,
          message: isSuccess 
            ? 'Transaction status retrieved successfully' 
            : (transactionResponse.remark || 'Transaction status check failed'),
          result: {
            amount: transactionResponse.amount || transaction.amount,
            reference_id: transaction.reference_id,
            payout_ref: transactionResponse.payout_ref || null,
            bank_ref: transactionResponse.bank_ref || null,
            status: transactionStatus,
            remark: transactionResponse.remark || null
          }
        });
      }
      
      // Handle other merchants (Unpay, SPay, Philpay) - return as-is
      const httpStatus = result.status === 200 ? 200 : (result.status >= 400 && result.status < 600 ? result.status : 400);
      return res.status(httpStatus).json({
        success: result.status === 200,
        message: result.status === 200 
          ? 'Transaction status retrieved successfully' 
          : (result.data?.message || 'Transaction status check failed'),
        result: result
      });
    }
    else{
      return res.status(400).json({
        success: false,
        message: 'Transaction status not found',
        result: result || null
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

const handleBalanceCheck = async (req, res) => {
  try {
    const user_id = req.user.id;
    const user = await User.findByPk(user_id);
    const financialDetails = await FinancialDetails.findOne({
      where: { user_id: user_id }
    });
    if(!financialDetails){
      return res.status(400).json({
        success: false,
        message: 'Financial details not found for user'
      });
    }
    const walletBalance = parseFloat(financialDetails.wallet);
    const settlementBalance = parseFloat(financialDetails.settlement);
    return res.status(200).json({
      success: true,
      message: 'Balance check successful',
      data: {
        wallet_balance: walletBalance,
        settlement_balance: settlementBalance
      }
    });
  } catch (error) {
    logger.error('Error retrieving transaction status', {
      error: error.message,
      stack: error.stack,
      transaction_id: req.params.transaction_id
    });
  }
}

module.exports = {
    initiatePayout,
    getPayoutTransactionStatus,
    handleBalanceCheck
};