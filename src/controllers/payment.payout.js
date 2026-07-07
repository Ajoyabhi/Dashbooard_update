const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction.model');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
// const Agent = require('../models/agent.model');
const { logger } = require('../utils/logger');
const { setValidationResult, setThirdPartyApiInfo } = require('../middleware/apiLogger.middleware');
const { validatePaymentRequest } = require('../controllers/payment.controller');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { Op } = require('sequelize');
const { unpayPayout, spayPayout, philpayPayout, xlitepayPayout, bluswapPayout } = require('../merchant_payin_payout/merchant_payout_request');
const getClientIp = require('../utils/getClientIp');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const axios = require('axios');
const { unpayTransactionStatus, spayTransactionStatus, philpayTransactionStatus, xlitepayTransactionStatus, bluswapTransactionStatus } = require('../transactionStatusCheck/TransactionCheck');
const { reconcilePayoutTransaction, finalizePayout } = require('../services/payoutReconciliation.service');

/**
 * Reverse a payout that failed synchronously at creation time (e.g. the gateway
 * rejected the request after we had already deducted the merchant's settlement).
 *
 * Reuses finalizePayout so the refund + status transition happen atomically and
 * identically to the async callback path. notifyMerchant is false because the
 * caller already returns the failure in the HTTP response.
 */
const failPayoutWithRefund = async (reference_id, message) => {
  try {
    return await finalizePayout({ referenceId: reference_id, isSuccess: false, message, notifyMerchant: false });
  } catch (err) {
    logger.error('Failed to reverse rejected payout', { reference_id, error: err.message });
    return { changed: false, reason: 'reversal_error' };
  }
};

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

    // if (amount < 100) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: 'Minimum payout amount is 100' 
    //   });
    // }
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

    if (platformCharges?.charge) {
      platformFee = (totalCharges * parseFloat(platformCharges.charge)) / 100;
    }

    if (platformCharges?.gst) {
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
        // Gateway rejected — atomically mark failed and refund the deducted settlement.
        await failPayoutWithRefund(reference_id, result?.data?.message || 'Unknown error');
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
        await failPayoutWithRefund(reference_id, result?.data?.message || 'Payout processing failed');
        return res.status(400).json({
          success: false,
          message: result.data.message || 'Payout processing failed',
          reference_id: result.data.apitxnid
        });
      }
    }
    else if (user.MerchantDetail.payout_merchant_name === 'Xlitepay') {
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
      result = await xlitepayPayout(payoutData);
      console.log("this is result of xlitepay payout", result)
      if (result?.status == 200 && result.data.status === 'success') {
        return res.status(200).json({
          success: true,
          message: result.data.message || 'Payout is processing',
          utr: result.data.utr,
          reference_id: result.data.apitxnid
        });
      } else {
        await failPayoutWithRefund(reference_id, result?.data?.message || 'Payout processing failed');
        return res.status(400).json({
          success: false,
          message: result?.data?.message || 'Payout processing failed',
          reference_id: result?.data?.apitxnid || reference_id
        });
      }
    }
    else if (user.MerchantDetail.payout_merchant_name === 'BluSwap') {
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
          email: user.email
        }
      };
      result = await bluswapPayout(payoutData);
      console.log("this is result of bluswap payout", result)
      if (result?.status == 200 && result.data.status === 'processing') {
        return res.status(200).json({
          success: true,
          message: result.data.message || 'Payout initiated, awaiting confirmation',
          reference_id: result.data.apitxnid,
          transaction_id: result.data.transaction_id
        });
      } else {
        await failPayoutWithRefund(reference_id, result?.data?.message || 'Payout processing failed');
        return res.status(400).json({
          success: false,
          message: result?.data?.message || 'Payout processing failed',
          reference_id: result?.data?.apitxnid || reference_id
        });
      }
    }

  } catch (error) {
    logger.error('Error processing payout', { error: error.message });
    // If we already deducted the settlement (and created the payout) before the
    // exception, reverse it so the merchant is never charged for a payout that
    // did not go through. No-ops if nothing was created/deducted yet.
    if (req.body?.reference_id) {
      await failPayoutWithRefund(req.body.reference_id, 'Error processing payout');
    }
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
      reference_id: transaction_id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    let result;
    if (user.MerchantDetail.payout_merchant_name === 'Unpay') {
      result = await unpayTransactionStatus(transaction_id);
      console.log("this is result of unpay payout", result)
    } else if (user.MerchantDetail.payout_merchant_name === 'SPay') {
      result = await spayTransactionStatus(transaction_id);
      console.log("this is result of spay payout", result)
    } else if (user.MerchantDetail.payout_merchant_name === 'Philpay') {
      result = await philpayTransactionStatus(transaction_id);
      console.log("this is result of philpay payout", result)
      if (result && result.data && result.data.response && typeof result.data.response === 'object') {
        const { metadata, id, vpa, fees, amount, ...sanitized } = result.data.response;
        // Divide amount by 100 if it exists
        const adjustedAmount = amount ? amount / 100 : amount;
        result = { ...result, data: { ...result.data, response: { ...sanitized, amount: adjustedAmount } } };
      }
      // console.log("this is result of philpay payout", result)
    } else if (user.MerchantDetail.payout_merchant_name === 'Xlitepay') {
      result = await xlitepayTransactionStatus(transaction_id);
      console.log("this is result of xlitepay payout", result)
    } else if (user.MerchantDetail.payout_merchant_name === 'BluSwap') {
      result = await bluswapTransactionStatus(transaction_id);
      console.log("this is result of bluswap payout", result)
    }
    if (result.status === 200) {
      // Every gateway status helper already normalizes result.data.status to
      // success | failed | pending. Map it into the shared uniform envelope and
      // enrich utr/message/timestamp from the raw gateway payload, falling back
      // to our own DB record when the gateway omits them.
      const normalizedStatus = result.data?.status || 'unknown';
      const gw = result.data?.response?.data || result.data?.response || {};
      const utr = gw.utr || gw.rrn || gw.bank_reference_id || transaction.gateway_response?.utr || null;
      // Standardized message only — never surface the gateway's own text/status
      // description, which can reveal the acquirer/gateway name to the merchant.
      const message = normalizedStatus === 'success'
        ? 'Transaction processed'
        : normalizedStatus === 'pending'
          ? 'Transaction is pending'
          : 'Transaction failed';

      return res.status(200).json({
        success: true,
        transaction: {
          reference_id: transaction.reference_id,
          type: 'payout',
          status: normalizedStatus,
          amount: transaction.amount,
          utr,
          message,
          timestamp: gw.updated_at || transaction.updatedAt || new Date().toISOString()
        }
      });
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Transaction status not found'
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
    if (!financialDetails) {
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

/**
 * Reconcile a single payout by reference_id. Queries the gateway status API and,
 * if the gateway reports a terminal status, updates the dashboard records and
 * fires the merchant callback. Idempotent — safe to call repeatedly.
 */
const reconcilePayoutByReference = async (req, res) => {
  try {
    const { reference_id } = req.params;

    const payoutTransaction = await PayoutTransaction.findOne({ reference_id }).lean();
    if (!payoutTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Non-admin/agent callers may only reconcile their own transactions
    const role = req.user.user_type;
    if (!['admin', 'agent'].includes(role) &&
        payoutTransaction.user?.user_id?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this transaction' });
    }

    const result = await reconcilePayoutTransaction(payoutTransaction);

    return res.status(200).json({
      success: true,
      message: result.changed ? 'Transaction reconciled and updated' : 'No status change',
      data: result
    });
  } catch (error) {
    logger.error('Error reconciling payout', {
      error: error.message,
      stack: error.stack,
      reference_id: req.params.reference_id
    });
    return res.status(500).json({ success: false, message: 'Error reconciling payout', error: error.message });
  }
};

/**
 * Sweep every payout still in the 'processing' state, query each gateway's
 * status API, and finalize any that have resolved. Intended as an admin/agent
 * maintenance trigger for when webhooks were missed.
 */
const reconcileProcessingPayouts = async (req, res) => {
  try {
    const processing = await PayoutTransaction.find({ status: 'processing' }).lean();

    const summary = {
      total: processing.length,
      changed: 0,
      unchanged: 0,
      errors: 0,
      results: []
    };

    for (const txn of processing) {
      try {
        const result = await reconcilePayoutTransaction(txn);
        if (result.changed) summary.changed++;
        else summary.unchanged++;
        summary.results.push(result);
      } catch (err) {
        summary.errors++;
        summary.results.push({ referenceId: txn.reference_id, changed: false, reason: 'error', error: err.message });
        logger.error('Error reconciling processing payout', { reference_id: txn.reference_id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Reconciled ${summary.changed} of ${summary.total} processing payout(s)`,
      data: summary
    });
  } catch (error) {
    logger.error('Error reconciling processing payouts', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Error reconciling processing payouts', error: error.message });
  }
};

module.exports = {
  initiatePayout,
  getPayoutTransactionStatus,
  handleBalanceCheck,
  reconcilePayoutByReference,
  reconcileProcessingPayouts
};