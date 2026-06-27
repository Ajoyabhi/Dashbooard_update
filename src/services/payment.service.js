const { logger } = require('../utils/logger');
const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, TransactionCharges, PlatformCharges } = require('../models');
const PayinTransaction = require('../models/payinTransaction.model');
const HdfcCustomer = require('../models/HdfcCustomer.model');
const mongoose = require('mongoose');
const { encryptText } = require('../merchant_payin_payout/utils_payout');
const { randomUUID } = require('crypto');
const axios = require('axios');
const os = require('os');
const dns = require('dns');
const http = require('http');
const https = require('https');

const getServerIp = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const address of interfaces[interfaceName]) {
      if (!address.internal && address.family === 'IPv4') return address.address;
    }
  }
  return '127.0.0.1';
};

const createIPv4Agents = () => {
  const lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4, ...options }, callback);
  return {
    httpAgent: new http.Agent({ family: 4, lookup }),
    httpsAgent: new https.Agent({ family: 4, lookup })
  };
};

const processPayin = async (data) => {
  try {
    logger.info('Starting to process payin request', { transaction_id: data.transaction_id });

    const { user_id, order_amount, name, email, phone, reference_id, clientIp } = data;

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

    if (order_amount < 100) throw new Error('Minimum payin amount is 100');
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

    // Calculate charges
    const adminCharge = applicableBracket.admin_payin_charge_type === 'percentage'
      ? (order_amount * parseFloat(applicableBracket.admin_payin_charge)) / 100
      : parseFloat(applicableBracket.admin_payin_charge);

    const agentCharge = applicableBracket.agent_payin_charge_type === 'percentage'
      ? (order_amount * parseFloat(applicableBracket.agent_payin_charge)) / 100
      : parseFloat(applicableBracket.agent_payin_charge);

    const totalCharges = parseFloat(adminCharge);
    const platformFee = platformCharges?.charge ? (totalCharges * parseFloat(platformCharges.charge)) / 100 : 0;
    const gstAmount = platformCharges?.gst ? (totalCharges * parseFloat(platformCharges.gst)) / 100 : 0;

    // Initialize wallet if needed
    if (!user.FinancialDetail || user.FinancialDetail.wallet === null) {
      await FinancialDetails.create({ user_id, wallet: 0, settlement: 0, lien: 0, rolling_reserve: 0 });
    }

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
        metadata: { requested_ip: clientIp },
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
    const merchantName = user.MerchantDetail.payin_merchant_name;

    let result;
    if (merchantName === 'Unpay') {
      result = await unpayPayin(payinData);
    } else if (merchantName === 'Spay') {
      result = await spayPayin(payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp, gstAmount, platformFee);
    } else if (merchantName === 'SpayIcici') {
      result = await spayPayinIcici(payinData);
    } else if (merchantName === 'HDFC') {
      result = await hdfcPayin(payinData);
    } else if (merchantName === 'AirPay') {
      result = await airpayPayin(payinData);
    } else {
      throw new Error('Invalid merchant name');
    }

    logger.info('Payment gateway response', { reference_id, statuscode: result?.statuscode });

    if (result?.statuscode === 'TXN' || result?.data?.statuscode === 'TXNS') {
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
    return { success: false, message: error.message };
  }
};

const unpayPayin = async (payinData) => {
  try {
    const { order_amount, reference_id } = payinData;

    const aesKey = "XRUhoLqUBgmZFLdWT5PiuNQnGhI9l6Pc";
    const aesIV = "oR21lVkifQEBNRQS";
    const apiKey = "QPf0uqDt0EjQqkseizXyr1Ydn21HF9cOiQEFtjrV";
    const partnerId = "4071";
    const webhookUrl = "https://dashboard.accuzpay.in/api/payments/unpay/callback";

    const requestBody = {
      partner_id: partnerId,
      amount: parseInt(order_amount),
      apitxnid: reference_id,
      webhook: webhookUrl
    };

    const encryptedRequestBody = await encryptText(JSON.stringify(requestBody), aesKey, aesIV);
    const { httpAgent, httpsAgent } = createIPv4Agents();

    const response = await axios.post(
      'https://unpay.in/tech/api/next/upi/request/qr',
      { body: encryptedRequestBody },
      {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        httpAgent,
        httpsAgent
      }
    );

    const result = response.data;
    if (result.statuscode === 'TXN') {
      return {
        statuscode: result.statuscode,
        message: result.message,
        data: { apitxnid: result.data?.apitxnid, qrString: result.data?.qrString }
      };
    }
    return { statuscode: result.statuscode, message: result.message, data: result.data };
  } catch (error) {
    logger.error('Error processing unpay payin', { error: error.message, stack: error.stack });
    throw error;
  }
};

const spayPayin = async (payinData, adminCharge, agentCharge, totalCharges, user_id, clientIp, gstAmount, platformFee) => {
  try {
    if (!payinData.name || !payinData.email || !payinData.phone || !payinData.order_amount) {
      throw new Error('Missing required fields: name, email, mobile, or amount');
    }

    const requestBody = {
      token: "JPi2bq7JPPaiEaFDBp0WtGcVTEjTMG",
      apitxnid: payinData.reference_id,
      name: payinData.name,
      email: payinData.email,
      mobile: payinData.phone,
      amount: payinData.order_amount.toString(),
      return_url: "https://api.zentexpay.in/api/payments/spay/callback"
    };

    const response = await axios.post('https://dashboard.spay.live/api/upiintent/vp2/create', requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.statuscode === 'TXNS') {
      return {
        success: true,
        data: {
          statuscode: response.data.statuscode,
          qrString: response.data.payment_link,
          message: response.data.message,
          apitxnid: payinData.reference_id
        }
      };
    }
    throw new Error(response.data.message || 'Payment initiation failed');
  } catch (error) {
    if (error.response) {
      const statusMap = { 400: 'Missing required fields', 401: 'Invalid amount format', 409: 'Transaction ID already exists', 500: 'Internal server error' };
      throw new Error(statusMap[error.response.status] || error.response.data?.message || 'Payment initiation failed');
    }
    throw error;
  }
};

const spayPayinIcici = async (payinData) => {
  try {
    if (!payinData.name || !payinData.email || !payinData.phone || !payinData.order_amount) {
      throw new Error('Missing required fields: name, email, mobile, or amount');
    }
    throw new Error('SpayIcici not implemented');
  } catch (error) {
    logger.error('Error processing spayPayinIcici', { error: error.message, stack: error.stack });
    throw error;
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
      apitxnid: response.data.ap_transaction_id || reference_id,
      qrString: response.data.upi_intent_uri,
      airpay_order_id: response.data.airpay_order_id,
    },
  };
};

module.exports = { processPayin };
