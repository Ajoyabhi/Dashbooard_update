const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction.model');
const { sequelize, User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
// const Agent = require('../models/agent.model');
const { logger } = require('../utils/logger');
const { setValidationResult, setThirdPartyApiInfo } = require('../middleware/apiLogger.middleware');
const { validatePaymentRequest } = require('../controllers/payment.controller');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { Op } = require('sequelize');
const { bluswapPayout } = require('../merchant_payin_payout/merchant_payout_request');
const getClientIp = require('../utils/getClientIp');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const axios = require('axios');
const { bluswapTransactionStatus } = require('../transactionStatusCheck/TransactionCheck');
const { reconcilePayoutTransaction, finalizePayout } = require('../services/payoutReconciliation.service');
const { recordTraceEvent, STAGES } = require('../services/transactionTrace.service');

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

    recordTraceEvent({
      reference_id, trace_type: 'payout', stage: STAGES.INITIATED, status: 'info', source: 'api',
      detail: 'Payout request received', payload: { amount, request_type }
    });

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

    // Cheap early pre-filter only: reject when the settlement can't even cover the
    // bare amount. This is a NECESSARY-but-not-sufficient guard — the charges
    // (admin + gst + platform fee) aren't computed until further below, so the
    // authoritative, charges-inclusive check is done atomically at debit time
    // (settlement < amount + charges), under a row lock. Never treat this line as
    // the balance gate: doing so let charges overdraw the wallet into the negative.
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

    // Calculate final amount to deduct (amount + charges), rounded to paise
    const amountToDeduct = parseFloat((parseFloat(amount) + finalTotalCharges).toFixed(2));

    // Atomically debit the settlement wallet.
    //
    // This MUST be race-safe. A high-volume merchant can fire several payouts in
    // the same instant (observed in production: 3 within ~40ms). The previous code
    // read the settlement from the request-start snapshot (`user.FinancialDetail`)
    // and wrote back an absolute value, so simultaneous payouts overwrote each
    // other's deductions (classic lost update) and the merchant was under-charged
    // — their settlement stayed higher than it should have.
    //
    // We take a row lock (SELECT ... FOR UPDATE) so concurrent payouts for the same
    // user serialize, re-read the CURRENT balance under the lock, verify it covers
    // amount + charges (not just the bare amount — the old check let charges
    // overdraw the wallet), and debit — all in one transaction.
    try {
      await sequelize.transaction(async (t) => {
        const fin = await FinancialDetails.findOne({
          where: { user_id: user_id },
          lock: t.LOCK.UPDATE,
          transaction: t
        });
        if (!fin) {
          const e = new Error('Financial details not found for user');
          e.code = 'FIN_NOT_FOUND';
          throw e;
        }
        const current = parseFloat(fin.settlement || 0);
        if (current < amountToDeduct) {
          const e = new Error('Insufficient balance');
          e.code = 'INSUFFICIENT';
          e.available = current;
          throw e;
        }
        fin.settlement = parseFloat((current - amountToDeduct).toFixed(2));
        await fin.save({ transaction: t });
      });
    } catch (e) {
      if (e.code === 'INSUFFICIENT') {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          details: { available: e.available, requested: amountToDeduct }
        });
      }
      if (e.code === 'FIN_NOT_FOUND') {
        return res.status(400).json({
          success: false,
          message: 'Financial details not found for user'
        });
      }
      throw e;
    }

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

    recordTraceEvent({
      reference_id, trace_type: 'payout', stage: STAGES.VALIDATED, status: 'ok', source: 'api',
      gateway_name: user.MerchantDetail.payout_merchant_name || null,
      detail: 'Validation passed, settlement deducted, payout record created',
      payload: { amount_to_deduct: amountToDeduct }
    });

    let result;
    if (user.MerchantDetail.payout_merchant_name === 'BluSwap') {
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
    } else {
      // No supported payout gateway configured for this merchant. Reverse the
      // settlement we already deducted and reject.
      recordTraceEvent({
        reference_id, trace_type: 'payout', stage: STAGES.REJECTED, status: 'failed', source: 'api',
        gateway_name: user.MerchantDetail.payout_merchant_name || null,
        detail: 'Unsupported payout gateway — settlement reversed'
      });
      await failPayoutWithRefund(reference_id, 'Payout gateway not supported');
      return res.status(400).json({
        success: false,
        message: 'Payout gateway not supported for this merchant'
      });
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
    if (user.MerchantDetail.payout_merchant_name === 'BluSwap') {
      result = await bluswapTransactionStatus(transaction_id);
      console.log("this is result of bluswap payout", result)
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payout gateway not supported for this merchant'
      });
    }
    if (result.status === 200) {
      // Every gateway status helper already normalizes result.data.status to
      // success | failed | pending. Map it into the shared uniform envelope and
      // enrich utr/message/timestamp from the raw gateway payload, falling back
      // to our own DB record when the gateway omits them.
      const normalizedStatus = result.data?.status || 'unknown';
      const gw = result.data?.response?.data || result.data?.response || {};
      const utr = gw.utr || gw.rrn || gw.bank_reference_id || transaction.gateway_response?.utr || null;

      // Self-healing status check: if the gateway now reports a terminal status
      // (success/failed) but our record is still non-terminal (pending/processing),
      // the state has drifted — a webhook was likely missed. Persist the resolved
      // status, refund on failure, and fire the merchant callback here, reusing the
      // exact same idempotent path as the async webhook worker. finalizePayout's
      // conditional claim guarantees the update + callback happen at most once even
      // if concurrent status checks / the worker race, so this is safe to run inline
      // before returning the (now up-to-date) status to the caller.
      if (
        (normalizedStatus === 'success' || normalizedStatus === 'failed') &&
        ['pending', 'processing'].includes(transaction.status)
      ) {
        try {
          const gatewayTransactionId =
            gw.bluswap_transaction_id || gw.transaction_id || gw.txn_id || gw.merchant_order_id || null;
          const reconciliation = await finalizePayout({
            referenceId: transaction.reference_id,
            isSuccess: normalizedStatus === 'success',
            utr,
            gatewayTransactionId
          });
          logger.info('Payout status reconciled during status check', {
            reference_id: transaction.reference_id,
            previous_status: transaction.status,
            gateway_status: normalizedStatus,
            changed: reconciliation.changed,
            callback_sent: reconciliation.callbackSent
          });
        } catch (reconcileError) {
          // Never let a reconciliation failure break the status response — the
          // caller still gets the freshly fetched gateway status, and the
          // reconcile job / next status check will retry the update + callback.
          logger.error('Failed to reconcile payout during status check', {
            reference_id: transaction.reference_id,
            gateway_status: normalizedStatus,
            error: reconcileError.message
          });
        }
      }

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
      // The gateway could not return a status for this reference. The most common
      // reason is that the payout failed *before* it ever reached the gateway
      // (e.g. beneficiary/contact validation failed), so the gateway has no record
      // of it and responds 404 — but our own DB already holds the authoritative
      // terminal status. Fall back to our stored status instead of erroring, so the
      // merchant always gets a real status for a transaction we know about.
      const localStatus = transaction.status === 'processing' ? 'pending' : (transaction.status || 'pending');
      const message = localStatus === 'success'
        ? 'Transaction processed'
        : localStatus === 'failed'
          ? 'Transaction failed'
          : 'Transaction is pending';

      logger.info('Payout status served from local record (gateway had no status)', {
        reference_id: transaction.reference_id,
        local_status: transaction.status,
        gateway_http: result?.status || null
      });

      return res.status(200).json({
        success: true,
        transaction: {
          reference_id: transaction.reference_id,
          type: 'payout',
          status: localStatus,
          amount: transaction.amount,
          utr: transaction.gateway_response?.utr || null,
          message,
          timestamp: transaction.updatedAt || new Date().toISOString()
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
    const directBankPayoutBalance = parseFloat(financialDetails.direct_bank_payout) || 0;
    return res.status(200).json({
      success: true,
      message: 'Balance check successful',
      data: {
        wallet_balance: walletBalance,
        settlement_balance: settlementBalance,
        direct_bank_payout_balance: directBankPayoutBalance
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