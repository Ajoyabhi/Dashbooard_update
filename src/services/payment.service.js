const { logger } = require('../utils/logger');
const { recordTraceEvent, STAGES } = require('./transactionTrace.service');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const HdfcCustomer = require('../models/HdfcCustomer.model');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const axios = require('axios');

const processPayin = async (data) => {
  try {
    logger.info('Starting to process payin request', { transaction_id: data.transaction_id });

    const { user_id, order_amount, name, email, phone, reference_id, clientIp } = data;

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.INITIATED, status: 'info', source: 'api',
      detail: 'Payin request received',
      payload: { order_amount, user_id, requested_ip: clientIp }
    });

    // Fetch user, platform charges, and duplicate check all in parallel
    const [user, platformCharges, existingTransaction] = await Promise.all([
      User.findByPk(user_id, {
        include: [
          { model: UserStatus },
          { model: MerchantDetails },
          { model: MerchantCharges },
          { model: MerchantModeCharges },
          { model: FinancialDetails },
          { model: UserIPs }
        ]
      }),
      PlatformCharges.findOne({ where: { is_active: true } }),
      PayinTransaction.findOne({ reference_id }, { _id: 1, status: 1 }).lean()
    ]);

    if (!user) throw new Error('User not found');

    if (existingTransaction) {
      return {
        success: false,
        message: 'Transaction with this reference ID already exists. Please use a different reference ID for new transactions.'
      };
    }

    // Validations
    const isIpWhitelisted = user.UserIPs.some(ip => ip.ip_address === clientIp && ip.is_active);
    if (!isIpWhitelisted) throw new Error(`User IP address ${clientIp} is not whitelisted`);

    // if (order_amount < 100) throw new Error('Minimum payin amount is 100');
    if (reference_id.length < 12 || reference_id.length > 25) throw new Error('Reference number must be between 12 and 25 digits');

    const userStatus = user.UserStatus;
    if (userStatus.status === 0) throw new Error('User is not active');
    if (!userStatus.payin_status) throw new Error('User payin functionality is disabled');
    if (userStatus.bank_deactive) throw new Error('Bank is deactivated your ip due to security reasons');
    if (userStatus.tecnical_issue) throw new Error('Technical issue please try again later');

    // Use already-fetched MerchantCharges from user includes — no extra DB call
    const chargeBrackets = (user.MerchantCharges || []).slice().sort((a, b) => a.start_amount - b.start_amount);
    if (!chargeBrackets.length) throw new Error('No charge brackets found for the user');

    const applicableBracket = chargeBrackets.find(b =>
      order_amount >= parseFloat(b.start_amount) && order_amount <= parseFloat(b.end_amount)
    );
    if (!applicableBracket) throw new Error('No charge bracket found for the given amount');

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.VALIDATED, status: 'ok', source: 'api',
      gateway_name: user.MerchantDetail?.payin_merchant_name || null,
      detail: 'Validation, IP whitelist & duplicate check passed'
    });

    // Calculate charges
    const adminCharge = applicableBracket.admin_payin_charge_type === 'percentage'
      ? (order_amount * parseFloat(applicableBracket.admin_payin_charge)) / 100
      : parseFloat(applicableBracket.admin_payin_charge);

    const agentCharge = applicableBracket.agent_payin_charge_type === 'percentage'
      ? (order_amount * parseFloat(applicableBracket.agent_payin_charge)) / 100
      : parseFloat(applicableBracket.agent_payin_charge);

    const totalCharges = parseFloat(adminCharge);
    const platformFee = platformCharges?.charge ? (totalCharges * parseFloat(platformCharges.charge)) / 100 : 0;
    // Per-user GST override: use the merchant's own gst % when set (incl. 0%),
    // otherwise fall back to the global PlatformCharges.gst. `?? ` (not `||`) so a
    // deliberate 0% override is honoured instead of falling through to global.
    const gstRate = user.MerchantDetail?.gst ?? platformCharges?.gst;
    const gstAmount = gstRate ? (totalCharges * parseFloat(gstRate)) / 100 : 0;

    // Initialize wallet if needed
    if (!user.FinancialDetail || user.FinancialDetail.wallet === null) {
      await FinancialDetails.create({ user_id, wallet: 0, settlement: 0, lien: 0, rolling_reserve: 0 });
    }

    const merchantName = user.MerchantDetail.payin_merchant_name;

    // Create PayinTransaction and TransactionCharges in parallel
    await Promise.all([
      PayinTransaction.create({
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
        gst_amount: parseFloat(gstAmount),
        platform_fee: parseFloat(platformFee),
        charges: { admin_charge: adminCharge, agent_charge: agentCharge, total_charges: totalCharges },
        beneficiary_details: {
          beneficiary_name: name || '',
          beneficiary_email: email || '',
          beneficiary_phone: phone || ''
        },
        reference_id,
        status: 'pending',
        gateway_response: { utr: null, status: 'pending', message: 'Payin request initiated', merchant_response: null },
        metadata: { requested_ip: clientIp, gateway_name: merchantName },
        remark: 'Payin request initiated',
        created_by: new mongoose.Types.ObjectId(user_id),
        created_by_model: user.user_type || 'User'
      }),
      TransactionCharges.create({
        transaction_type: 'payin',
        reference_id,
        transaction_amount: parseFloat(order_amount),
        transaction_utr: null,
        merchant_charge: parseFloat(adminCharge),
        agent_charge: parseFloat(agentCharge),
        total_charges: parseFloat(totalCharges),
        gst_amount: parseFloat(gstAmount),
        platform_fee: parseFloat(platformFee),
        user_id: parseInt(user_id),
        status: 'pending',
        metadata: { merchant_response: null, requested_ip: clientIp }
      })
    ]);

    const payinData = { user_id, order_amount, name, email, phone, reference_id, clientIp, address: data.address || {} };

    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.GATEWAY_REQUEST, status: 'pending', source: 'api',
      gateway_name: merchantName,
      detail: `Requesting QR/intent from ${merchantName}`,
      payload: { order_amount }
    });
    const gatewayStartedAt = Date.now();

    let result;
    if (merchantName === 'HDFC') {
      result = await hdfcPayin(payinData);
    } else if (merchantName === 'AirPay') {
      result = await airpayPayin(payinData);
    } else if (merchantName === 'Razorpay') {
      result = await razorpayPayin(payinData);
    } else {
      throw new Error('Invalid merchant name');
    }

    logger.info('Payment gateway response', { reference_id, statuscode: result?.statuscode });

    const gatewaySucceeded = result?.statuscode === 'TXN';
    recordTraceEvent({
      reference_id, trace_type: 'payin', stage: STAGES.GATEWAY_RESPONSE,
      status: gatewaySucceeded ? 'ok' : 'failed', source: 'api',
      gateway_name: merchantName,
      latency_ms: Date.now() - gatewayStartedAt,
      detail: gatewaySucceeded ? 'QR/intent generated, awaiting user payment' : 'Gateway rejected the payin request',
      payload: { statuscode: result?.statuscode || result?.data?.statuscode || null, message: result?.message }
    });

    if (gatewaySucceeded) {
      await Promise.all([
        PayinTransaction.updateOne(
          { reference_id },
          {
            $set: {
              status: 'payin_qr_generated',
              gateway_response: {
                utr: null,
                status: 'payin_qr_generated',
                message: 'Payin qr string generated',
                merchant_response: result.data.apitxnid
              }
            }
          }
        ),
        TransactionCharges.update(
          { transaction_utr: result.data.apitxnid, status: 'pending' },
          { where: { reference_id } }
        )
      ]);
      return {
        success: true,
        reference_id: result.data.apitxnid,
        payment_url: encodeURI(result.data.qrString)
      };
    } else {
      await Promise.all([
        PayinTransaction.updateOne({ reference_id }, { $set: { status: 'failed' } }),
        TransactionCharges.update({ status: 'failed' }, { where: { reference_id } })
      ]);
      logger.error('Payin request failed', { reference_id, message: result?.message });
      return { success: false, message: 'Payin request failed' };
    }
  } catch (error) {
    logger.error('Error processing payin request', { error: error.message, stack: error.stack });
    recordTraceEvent({
      reference_id: data?.reference_id, trace_type: 'payin', stage: STAGES.REJECTED,
      status: 'failed', source: 'api',
      detail: 'Payin rejected before completion', error: error.message
    });
    return { success: false, message: error.message };
  }
};

const resolveHdfcCustomerId = async (phone, email) => {
  const cleanPhone = phone?.replace(/\D/g, '').slice(-10);

  if (email) {
    const existing = await HdfcCustomer.findOne({ email });
    if (existing) return existing.customerId;
  }

  const customerId = randomUUID();
  await HdfcCustomer.create({
    phone: cleanPhone || null,
    email: email || null,
    customerId,
  });
  return customerId;
};

const hdfcPayin = async (payinData) => {
  const { order_amount, name, email, phone, reference_id, address } = payinData;

  const customerId = await resolveHdfcCustomerId(phone, email);

  const response = await axios.post(
    `${process.env.ECOMMERCE_API_URL}/api/v1/payments/hdfc/pg-initiate`,
    {
      reference_id,
      amount: order_amount,
      name: name || '',
      email: email || '',
      phone: phone || '',
      customerId,
      callback_url: `${process.env.ACCUZPAY_BASE_URL}/api/payments/hdfc/callback`,
      address: address || {},
    },
    {
      headers: {
        'x-api-key': process.env.HDFC_SHARED_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  if (!response.data.success || !response.data.upiIntentUri) {
    throw new Error(response.data.message || 'HDFC payment initiation failed');
  }

  return {
    statuscode: 'TXN',
    message: 'UPI intent generated',
    data: {
      apitxnid: reference_id,
      qrString: response.data.upiIntentUri,
    },
  };
};

const airpayPayin = async (payinData) => {
  const { order_amount, name, email, phone, reference_id } = payinData;

  const response = await axios.post(
    `${process.env.ECOMMERCE_API_URL}/api/v1/payments/airpay/ap-initiate`,
    {
      reference_id,
      amount: order_amount,
      name: name || '',
      email: email || '',
      phone: phone || '',
      customerId: payinData.user_id?.toString() || '',
    },
    {
      headers: {
        'x-api-key': process.env.AIRPAY_SHARED_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  if (!response.data.success || !response.data.upi_intent_uri) {
    throw new Error(response.data.message || 'AirPay payment initiation failed');
  }

  return {
    statuscode: 'TXN',
    message: 'UPI intent generated',
    data: {
      apitxnid: response.data.reference_id || reference_id,
      qrString: response.data.upi_intent_uri,
      airpay_order_id: response.data.airpay_order_id,
    },
  };
};

const razorpayPayin = async (payinData) => {
  const { order_amount, name, email, phone, reference_id } = payinData;

  // Razorpay contract requires a customerId — reuse the persistent UPI customer
  // registry (dedupes by email, else mints a UUID) just like the HDFC flow.
  const customerId = await resolveHdfcCustomerId(phone, email);

  const response = await axios.post(
    `${process.env.ECOMMERCE_API_URL}/api/v1/payments/razorpay/rp-initiate`,
    {
      reference_id,
      amount: order_amount,
      name: name || '',
      email: email || '',
      phone: phone || '',
      customerId,
    },
    {
      headers: {
        'x-api-key': process.env.RAZORPAY_SHARED_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  if (!response.data.success || !response.data.upi_intent_uri) {
    throw new Error(response.data.message || 'Razorpay payment initiation failed');
  }

  return {
    statuscode: 'TXN',
    message: 'UPI intent generated',
    data: {
      apitxnid: response.data.reference_id || reference_id,
      qrString: response.data.upi_intent_uri,
      razorpay_order_id: response.data.razorpay_order_id,
      razorpay_payment_id: response.data.razorpay_payment_id,
    },
  };
};

module.exports = { processPayin };
