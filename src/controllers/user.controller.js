const { logger } = require('../utils/logger');
const { User, FinancialDetails, ManageFundRequest, TransactionCharges, SettlementTransaction, WalletTransaction, PayoutFailedHistory, MerchantDetails } = require('../models');
const { sequelize } = require('../models');
const UserTransaction = require('../models/userTransaction.model');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');

const { Op } = require('sequelize');


const getUserProfile = async (req, res) => {
  try {
    // User can only access their own profile
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'name',
      'mobile',
      'pancard',
      'aadharCard',
      'companyName',
      'gstNumber',
      'businessType',
      'address',
      'city',
      'state',
      'pincode'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const user = await User.update(updates, {
      where: { id: req.user.id },
      returning: true
    });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user profile' });
  }
};

const getUserWalletReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {
      'user.user_id': req.user.id.toString()
    };
    // Add type filter if provided
    if (req.query.type && req.query.type !== 'all') {
      filter.transaction_type = req.query.type;
    }

    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { 'user.name': searchRegex },
        { transaction_id: searchRegex },
        { reference_id: searchRegex },
        { remark: searchRegex }
      ];
    }

    // Get total count for pagination
    const totalItems = await UserTransaction.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch transactions with pagination
    const transactions = await UserTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const formattedTransactions = transactions.map(transaction => ({
      type: transaction.transaction_type,
      date: transaction.createdAt,
      orderId: transaction.transaction_id,
      description: transaction.remark,
      openBalance: transaction.balance.before,
      amount: transaction.amount,
      balance: transaction.balance.after,
      status: transaction.status,
      charges: transaction.charges,
      referenceId: transaction.reference_id
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserWalletReports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet reports',
      error: error.message
    });
  }
};


const getUserWalletTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id; // Get current user's ID from auth middleware

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { user_id: userId };

    // Add search filter
    if (req.query.search) {
      whereClause.remark = {
        [Op.like]: `%${req.query.search}%`
      };
    }

    // Add transaction type filter
    if (req.query.type && req.query.type !== 'all') {
      whereClause.transaction_type = req.query.type;
    }

    // Get wallet transactions with pagination
    const transactions = await WalletTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'user_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get current wallet balance
    const financialDetails = await FinancialDetails.findOne({
      where: { user_id: userId }
    });

    const totalPages = Math.ceil(transactions.count / limit);

    res.json({
      success: true,
      data: {
        transactions: transactions.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: transactions.count,
          limit: parseInt(limit)
        },
        current_balance: financialDetails ? parseFloat(financialDetails.wallet) : 0
      }
    });
  } catch (error) {
    console.error('Error in getUserWalletTransactionHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet transaction history',
      error: error.message
    });
  }
};

const getUserPayinReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {
      'user.user_id': req.user.id.toString()
    };

    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { reference_id: searchRegex },
        { 'gateway_response.utr': searchRegex }
      ];
    }

    // Get total count for pagination
    const totalItems = await PayinTransaction.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch transactions with pagination
    const transactions = await PayinTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserPayinReports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payin reports',
      error: error.message
    });
  }
};

const downloadUserPayinReports = async (req, res) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const userId = req.user.id;

    // Build filter object
    const filter = {
      'user.user_id': userId.toString()
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { reference_id: searchRegex },
        { 'gateway_response.utr': searchRegex },
        { 'beneficiary_details.beneficiary_name': searchRegex },
        { 'beneficiary_details.account_number': searchRegex },
        { 'beneficiary_details.account_ifsc': searchRegex }
      ];
    }

    // Get all payin transactions based on filters
    const transactions = await PayinTransaction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Create CSV content. Columns mirror the on-screen Payin Report table so
    // the downloaded Net Amount matches what the user sees (amount minus admin
    // charge, GST and platform fee — not just the admin charge).
    const headers = [
      'Order ID',
      'UTR',
      'Merchant Name',
      'Beneficiary Name',
      'Amount',
      'Charge',
      'GST',
      'Platform Fee',
      'Net Amount',
      'Status',
      'Created Date',
      'Remark'
    ];

    const csvRows = [headers];

    // Add data rows
    transactions.forEach(transaction => {
      const amount = transaction.amount || 0;
      const adminCharge = transaction.charges?.admin_charge || 0;
      const gstAmount = transaction.gst_amount || 0;
      const platformFee = transaction.platform_fee || 0;
      const netAmount = amount - adminCharge - gstAmount - platformFee;
      csvRows.push([
        transaction.reference_id,
        transaction.gateway_response?.utr || 'N/A',
        transaction.user?.name || 'N/A',
        transaction.beneficiary_details?.beneficiary_name || 'N/A',
        amount,
        adminCharge,
        gstAmount,
        platformFee,
        netAmount,
        transaction.status,
        new Date(transaction.createdAt).toLocaleString('en-IN'),
        transaction.remark || 'N/A'
      ]);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payin-report-${new Date().toISOString().split('T')[0]}.csv`);

    // Send CSV content
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating payin report download:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payin report download',
      error: error.message
    });
  }
};

const getUserPayoutReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {
      'user.user_id': req.user.id.toString()
    };

    // Add status filter if provided
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Add search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { reference_id: searchRegex },
        { 'gateway_response.utr': searchRegex }
      ];
    }

    // Get total count for pagination
    const totalItems = await PayoutTransaction.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch transactions with pagination
    const transactions = await PayoutTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserPayoutReports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout reports',
      error: error.message
    });
  }
};

const downloadUserPayoutReports = async (req, res) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const userId = req.user.id;

    // Build filter object
    const filter = {
      'user.user_id': userId.toString()
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { reference_id: searchRegex },
        { 'gateway_response.utr': searchRegex },
        { 'beneficiary_details.beneficiary_name': searchRegex },
        { 'beneficiary_details.account_number': searchRegex },
        { 'beneficiary_details.account_ifsc': searchRegex }
      ];
    }

    // Get all payout transactions based on filters
    const transactions = await PayoutTransaction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Create CSV content
    const headers = [
      'Order ID',
      'Merchant Name',
      'Beneficiary Name',
      'UTR',
      'A/C No',
      'IFSC',
      'Amount',
      'Charge',
      'GST',
      'Net Amount',
      'Status',
      'Created Date',
      'Remark'
    ];

    const csvRows = [headers];

    // Add data rows
    transactions.forEach(transaction => {
      const netAmount = transaction.amount + (transaction.charges?.total_charges || 0);
      csvRows.push([
        transaction.reference_id,
        transaction.user?.name || 'N/A',
        transaction.beneficiary_details?.beneficiary_name || 'N/A',
        transaction.gateway_response?.utr || 'N/A',
        transaction.beneficiary_details?.account_number || 'N/A',
        transaction.beneficiary_details?.account_ifsc || 'N/A',
        transaction.amount,
        transaction.charges?.total_charges || 0,
        transaction.charges?.gst || 0,
        netAmount,
        transaction.status,
        new Date(transaction.createdAt).toLocaleString('en-IN'),
        transaction.remark || 'N/A'
      ]);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payout-report-${new Date().toISOString().split('T')[0]}.csv`);

    // Send CSV content
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating payout report download:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating payout report download',
      error: error.message
    });
  }
};

const createFundRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      amount,
      reference_id,
      from_bank,
      to_bank,
      payment_type,
      remarks,
      reason
    } = req.body;

    // Check if financial details exist for the user
    let financialDetails = await FinancialDetails.findOne({
      where: { user_id: req.user.id }
    });

    // If financial details don't exist, create them
    if (!financialDetails) {
      financialDetails = await FinancialDetails.create({
        user_id: req.user.id,
        settlement: 0,
        wallet: 0,
        lien: 0,
        rolling_reserve: 0
      }, { transaction });
    }
    const walletBalance = financialDetails.wallet;
    const fundRequest = await ManageFundRequest.create({
      user_id: req.user.id,
      settlement_wallet: amount,
      wallet_balance: walletBalance,
      reference_id,
      from_bank,
      to_bank,
      payment_type,
      remarks,
      reason,
      status: 'pending',
      created_by: req.user.id,
      updated_by: req.user.id
    }, { transaction });

    await transaction.commit();

    logger.info('Fund request created successfully', { requestId: fundRequest.id });

    res.status(201).json({
      success: true,
      message: 'Fund request submitted successfully',
      data: fundRequest
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating fund request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit fund request',
      error: error.message
    });
  }
};

const getUserFundRequests = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    // Get total count for the logged-in user
    const totalCount = await ManageFundRequest.count({
      where: { user_id: req.user.id }
    });

    // Get paginated fund requests for the logged-in user
    const fundRequests = await ManageFundRequest.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // Transform data to match frontend table structure
    const transformedRequests = fundRequests.map(request => ({
      id: request.id,
      amount: parseFloat(request.settlement_wallet),
      walletBalance: parseFloat(request.wallet_balance),
      referenceId: request.reference_id,
      fromBank: request.from_bank,
      toBank: request.to_bank,
      paymentType: request.payment_type,
      remarks: request.remarks || '',
      reason: request.reason,
      status: request.status,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    }));

    res.json({
      success: true,
      data: {
        fundRequests: transformedRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / pageSize),
          totalItems: totalCount,
          pageSize: limit
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user fund requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fund requests'
    });
  }
};

const getUserDashboard = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Get financial details
    const financialDetails = await FinancialDetails.findOne({
      where: { user_id: req.user.id }
    });

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's transactions
    const todayTransactions = await TransactionCharges.findAll({
      where: {
        user_id: req.user.id,
        created_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Get all transactions for total calculations
    const allTransactions = await TransactionCharges.findAll({
      where: {
        user_id: req.user.id
      }
    });

    // Get recent payin transactions
    const recentPayins = await PayinTransaction.find({
      'user.user_id': req.user.id.toString()
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get recent payout transactions
    const recentPayouts = await PayoutTransaction.find({
      'user.user_id': req.user.id.toString()
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate today's pay-in and payout with charges handling
    const todayPayin = todayTransactions
      .filter(t => t.transaction_type === 'payin' && t.status === 'completed')
      .reduce((sum, t) => {
        const amount = parseFloat(t.transaction_amount);
        const charges = parseFloat(t.total_charges) || 0;
        const gst = parseFloat(t.gst_amount) || 0;
        const platformFee = parseFloat(t.platform_fee) || 0;

        // Case 1: Deduct charges, GST, platform fee from payin
        const netAmount = amount - charges - gst - platformFee;
        return sum + netAmount;
      }, 0);

    const todayPayout = todayTransactions
      .filter(t => t.transaction_type === 'payout' && t.status === 'completed')
      .reduce((sum, t) => {
        const amount = parseFloat(t.transaction_amount);
        const charges = parseFloat(t.total_charges) || 0;
        const gst = parseFloat(t.gst_amount) || 0;
        const platformFee = parseFloat(t.platform_fee) || 0;

        // Case 2: Add charges, GST, platform fee to payout
        const totalAmount = amount + charges + gst + platformFee;
        return sum + totalAmount;
      }, 0);

    // Calculate total pay-in and payout with charges handling
    const totalPayin = allTransactions
      .filter(t => t.transaction_type === 'payin' && t.status === 'completed')
      .reduce((sum, t) => {
        const amount = parseFloat(t.transaction_amount);
        const charges = parseFloat(t.total_charges) || 0;
        const gst = parseFloat(t.gst_amount) || 0;
        const platformFee = parseFloat(t.platform_fee) || 0;

        // Case 1: Deduct charges, GST, platform fee from payin
        const netAmount = amount - charges - gst - platformFee;
        return sum + netAmount;
      }, 0);

    const totalPayout = allTransactions
      .filter(t => t.transaction_type === 'payout' && t.status === 'completed')
      .reduce((sum, t) => {
        const amount = parseFloat(t.transaction_amount);
        const charges = parseFloat(t.total_charges) || 0;
        const gst = parseFloat(t.gst_amount) || 0;
        const platformFee = parseFloat(t.platform_fee) || 0;

        // Case 2: Add charges, GST, platform fee to payout
        const totalAmount = amount + charges + gst + platformFee;
        return sum + totalAmount;
      }, 0);
    // Calculate detailed breakdown for charges
    const calculateChargesBreakdown = (transactions, type) => {
      const filteredTransactions = transactions.filter(t => t.transaction_type === type && t.status === 'completed');

      const breakdown = filteredTransactions.reduce((acc, t) => {
        const charges = parseFloat(t.total_charges) || 0;
        const gst = parseFloat(t.gst_amount) || 0;
        const platformFee = parseFloat(t.platform_fee) || 0;

        acc.total_charges += charges;
        acc.total_gst += gst;
        acc.total_platform_fee += platformFee;
        acc.total_transactions += 1;

        return acc;
      }, {
        total_charges: 0,
        total_gst: 0,
        total_platform_fee: 0,
        total_transactions: 0
      });

      return breakdown;
    };

    const todayPayinBreakdown = calculateChargesBreakdown(todayTransactions, 'payin');
    const todayPayoutBreakdown = calculateChargesBreakdown(todayTransactions, 'payout');
    const totalPayinBreakdown = calculateChargesBreakdown(allTransactions, 'payin');
    const totalPayoutBreakdown = calculateChargesBreakdown(allTransactions, 'payout');

    // Prepare response object
    const dashboardData = {
      settlement_balance: financialDetails ? parseFloat(financialDetails.settlement) : 0,
      wallet_balance: financialDetails ? parseFloat(financialDetails.wallet) : 0,
      rolling_reserve_balance: financialDetails ? parseFloat(financialDetails.rolling_reserve) || 0 : 0,

      // Today's transactions with net amounts (after charges)
      today_payin: todayPayin,
      today_payout: todayPayout,

      // Total transactions with net amounts (after charges)
      total_payin: totalPayin,
      total_payout: totalPayout,

      // Detailed breakdown for today
      today_payin_breakdown: {
        net_amount: todayPayin,
        total_charges: todayPayinBreakdown.total_charges,
        total_gst: todayPayinBreakdown.total_gst,
        total_platform_fee: todayPayinBreakdown.total_platform_fee,
        total_transactions: todayPayinBreakdown.total_transactions
      },
      today_payout_breakdown: {
        net_amount: todayPayout,
        total_charges: todayPayoutBreakdown.total_charges,
        total_gst: todayPayoutBreakdown.total_gst,
        total_platform_fee: todayPayoutBreakdown.total_platform_fee,
        total_transactions: todayPayoutBreakdown.total_transactions
      },

      // Detailed breakdown for all time
      total_payin_breakdown: {
        net_amount: totalPayin,
        total_charges: totalPayinBreakdown.total_charges,
        total_gst: totalPayinBreakdown.total_gst,
        total_platform_fee: totalPayinBreakdown.total_platform_fee,
        total_transactions: totalPayinBreakdown.total_transactions
      },
      total_payout_breakdown: {
        net_amount: totalPayout,
        total_charges: totalPayoutBreakdown.total_charges,
        total_gst: totalPayoutBreakdown.total_gst,
        total_platform_fee: totalPayoutBreakdown.total_platform_fee,
        total_transactions: totalPayoutBreakdown.total_transactions
      },

      // Charge calculation explanation
      charge_calculation_note: {
        payin: "For Pay-in transactions: Net Amount = Transaction Amount - Total Charges - GST - Platform Fee",
        payout: "For Payout transactions: Net Amount = Transaction Amount + Total Charges + GST + Platform Fee"
      },

      recent_payins: recentPayins.map(payin => ({
        date: payin.createdAt,
        user: payin.beneficiary_details.beneficiary_name,
        type: 'Pay-in',
        amount: payin.amount,
        status: payin.status,
        reference_id: payin.reference_id
      })),
      recent_payouts: recentPayouts.map(payout => ({
        date: payout.createdAt,
        user: payout.beneficiary_details.beneficiary_name,
        type: 'Payout',
        amount: payout.amount,
        status: payout.status,
        reference_id: payout.reference_id
      }))
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error fetching user dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching user dashboard' });
  }
};

const getLastNDaysTransactions = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated user

    // Validate days parameter. 7 is included because the dashboard's
    // "Performance Overview (Last 7 Days)" chart calls this endpoint with days=7.
    const validDays = [3, 5, 7, 10];
    const selectedDays = validDays.includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 5;

    // Collection/payout figures are aggregated from the MongoDB transaction
    // stores (PayinTransaction / PayoutTransaction) — the same source of truth
    // as the admin "user-wise time-wise collection" API and the payin report —
    // rather than the SQL TransactionCharges mirror, so the numbers match.
    //
    // Days are bucketed by IST calendar date (the business timezone), matching
    // the reporting scripts. We build the IST day skeleton, derive the exact
    // UTC window it spans, and let MongoDB group by IST date via $dateToString.
    const IST_TIMEZONE = 'Asia/Kolkata';
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30
    const DAY_MS = 24 * 60 * 60 * 1000;

    // "Now" shifted into IST wall-clock (UTC getters then read IST values).
    const nowIst = new Date(Date.now() + IST_OFFSET_MS);

    const daySkeleton = [];
    for (let i = selectedDays - 1; i >= 0; i--) {
      const istMidnight = new Date(nowIst);
      istMidnight.setUTCDate(istMidnight.getUTCDate() - i);
      istMidnight.setUTCHours(0, 0, 0, 0);
      const dateLabel = istMidnight.toISOString().split('T')[0]; // IST calendar date
      // Convert IST midnight back to the real UTC instant for the Mongo query.
      const startUtc = new Date(istMidnight.getTime() - IST_OFFSET_MS);
      const endUtc = new Date(startUtc.getTime() + DAY_MS - 1);
      daySkeleton.push({ dateLabel, startUtc, endUtc });
    }

    const rangeStart = daySkeleton[0].startUtc;
    const rangeEnd = daySkeleton[daySkeleton.length - 1].endUtc;

    const groupStage = {
      _id: {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST_TIMEZONE }
      },
      total_amount: { $sum: { $ifNull: ['$amount', 0] } },
      total_charges: { $sum: { $ifNull: ['$charges.total_charges', 0] } },
      total_gst: { $sum: { $ifNull: ['$gst_amount', 0] } },
      total_platform_fee: { $sum: { $ifNull: ['$platform_fee', 0] } },
      transaction_count: { $sum: 1 }
    };

    const matchStage = {
      'user.user_id': userId.toString(),
      status: 'completed',
      createdAt: { $gte: rangeStart, $lte: rangeEnd }
    };

    const [payinAgg, payoutAgg] = await Promise.all([
      PayinTransaction.aggregate([{ $match: matchStage }, { $group: groupStage }]),
      PayoutTransaction.aggregate([{ $match: matchStage }, { $group: groupStage }])
    ]);

    // Index aggregation results by IST date string for quick lookup.
    const toMap = (rows) => rows.reduce((acc, r) => { acc[r._id] = r; return acc; }, {});
    const payinByDate = toMap(payinAgg);
    const payoutByDate = toMap(payoutAgg);

    const emptyBucket = () => ({
      total_amount: 0, total_charges: 0, total_gst: 0,
      total_platform_fee: 0, transaction_count: 0
    });

    const lastNDaysData = daySkeleton.map(({ dateLabel }) => {
      const p = payinByDate[dateLabel] || emptyBucket();
      const po = payoutByDate[dateLabel] || emptyBucket();
      return {
        date: dateLabel,
        payin: {
          total_amount: p.total_amount,
          total_charges: p.total_charges,
          total_gst: p.total_gst,
          total_platform_fee: p.total_platform_fee,
          total_gst_platform: p.total_gst + p.total_platform_fee,
          transaction_count: p.transaction_count,
          transactions: []
        },
        payout: {
          total_amount: po.total_amount,
          total_charges: po.total_charges,
          total_gst: po.total_gst,
          total_platform_fee: po.total_platform_fee,
          transaction_count: po.transaction_count,
          transactions: []
        }
      };
    });

    res.json({
      success: true,
      data: lastNDaysData,
      selectedDays: selectedDays
    });
  } catch (error) {
    console.error('Error fetching user last N days transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user last N days transactions',
      error: error.message
    });
  }
};

const getUserSettlementReport = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, search, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);
    const userId = req.user.id;

    logger.info('Fetching settlement report', { userId, page, pageSize, status, search, startDate, endDate });

    // Build where clause
    const whereClause = { user_id: userId };

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { amount: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { remark: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get total count
    const totalCount = await SettlementTransaction.count({
      where: whereClause
    });

    // Get paginated settlement transactions
    const transactions = await SettlementTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name', 'user_name']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['name', 'user_name']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // Format the response
    const formattedTransactions = transactions.map(transaction => ({
      _id: transaction.id,
      date: transaction.created_at,
      amount: parseFloat(transaction.amount),
      wallet_balance_before: parseFloat(transaction.wallet_balance_before),
      wallet_balance_after: parseFloat(transaction.wallet_balance_after),
      settlement_balance_before: parseFloat(transaction.settlement_balance_before),
      settlement_balance_after: parseFloat(transaction.settlement_balance_after),
      status: transaction.status,
      processed_by: transaction.creator ? transaction.creator.name : transaction.updater ? transaction.updater.name : 'System',
      remark: transaction.remark,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    }));

    logger.info('Settlement report fetched successfully', {
      userId,
      totalCount,
      pageCount: formattedTransactions.length
    });

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / pageSize),
          totalItems: totalCount,
          pageSize: limit,
          hasNextPage: offset + limit < totalCount,
          hasPrevPage: offset > 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching settlement report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settlement report',
      error: error.message
    });
  }
};

const getUserPayoutFailedHistory = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, search, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);
    const userId = req.user.id;

    logger.info('Fetching payout failed history', { userId, page, pageSize, status, search, startDate, endDate });

    // Build where clause
    const whereClause = { user_id: userId };

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.new_status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { reference_id: { [Op.like]: `%${search}%` } },
        { transaction_id: { [Op.like]: `%${search}%` } },
        { beneficiary_name: { [Op.like]: `%${search}%` } },
        { beneficiary_account: { [Op.like]: `%${search}%` } },
        { bank_name: { [Op.like]: `%${search}%` } },
        { remark: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get total count
    const totalCount = await PayoutFailedHistory.count({
      where: whereClause
    });

    // Get paginated payout failed history
    const failedHistory = await PayoutFailedHistory.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'user_name']
        },
        {
          model: User,
          as: 'failedByUser',
          attributes: ['name', 'user_name']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // Format the response
    const formattedHistory = failedHistory.map(record => ({
      id: record.id,
      reference_id: record.reference_id,
      transaction_id: record.transaction_id,
      transaction_type: record.transaction_type,
      amount: parseFloat(record.amount),
      charges: parseFloat(record.charges),
      total_amount: parseFloat(record.total_amount),
      wallet_balance_before: parseFloat(record.wallet_balance_before),
      wallet_balance_after: parseFloat(record.wallet_balance_after),
      beneficiary_name: record.beneficiary_name,
      beneficiary_account: record.beneficiary_account,
      beneficiary_ifsc: record.beneficiary_ifsc,
      bank_name: record.bank_name,
      utr_number: record.utr_number,
      remark: record.remark,
      original_status: record.original_status,
      new_status: record.new_status,
      failed_by: record.failedByUser ? record.failedByUser.name : 'System',
      created_at: record.created_at,
      updated_at: record.updated_at
    }));

    logger.info('Payout failed history fetched successfully', {
      userId,
      totalCount,
      pageCount: formattedHistory.length
    });

    res.json({
      success: true,
      data: {
        failedHistory: formattedHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / pageSize),
          totalItems: totalCount,
          pageSize: limit,
          hasNextPage: offset + limit < totalCount,
          hasPrevPage: offset > 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching payout failed history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payout failed history',
      error: error.message
    });
  }
}

const downloadSettlementReport = async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const userId = req.user.id;

    logger.info('Downloading settlement report', { userId, status, search, startDate, endDate });

    // Build where clause
    const whereClause = { user_id: userId };

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { amount: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { remark: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get all settlement transactions for download
    const transactions = await SettlementTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['name', 'user_name']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['name', 'user_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Format the data for CSV
    const csvData = transactions.map(transaction => ({
      Date: new Date(transaction.created_at).toLocaleDateString(),
      Amount: parseFloat(transaction.amount),
      'Wallet Balance Before': parseFloat(transaction.wallet_balance_before),
      'Wallet Balance After': parseFloat(transaction.wallet_balance_after),
      'Settlement Balance Before': parseFloat(transaction.settlement_balance_before),
      'Settlement Balance After': parseFloat(transaction.settlement_balance_after),
      Status: transaction.status,
      'Processed By': transaction.creator ? transaction.creator.name : transaction.updater ? transaction.updater.name : 'System',
      Remark: transaction.remark || ''
    }));

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="settlement_report_${new Date().toISOString().split('T')[0]}.csv"`);

    // Create CSV content
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    res.send(csvContent);

    logger.info('Settlement report downloaded successfully', {
      userId,
      recordCount: transactions.length
    });

  } catch (error) {
    logger.error('Error downloading settlement report:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading settlement report',
      error: error.message
    });
  }
};

const downloadPayoutFailedHistory = async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const userId = req.user.id;

    logger.info('Downloading payout failed history', { userId, status, search, startDate, endDate });

    // Build where clause
    const whereClause = { user_id: userId };

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.new_status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { reference_id: { [Op.like]: `%${search}%` } },
        { transaction_id: { [Op.like]: `%${search}%` } },
        { beneficiary_name: { [Op.like]: `%${search}%` } },
        { beneficiary_account: { [Op.like]: `%${search}%` } },
        { bank_name: { [Op.like]: `%${search}%` } },
        { remark: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get all payout failed history for download
    const failedHistory = await PayoutFailedHistory.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'user_name']
        },
        {
          model: User,
          as: 'failedByUser',
          attributes: ['name', 'user_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Format the data for CSV
    const csvData = failedHistory.map(record => ({
      Date: new Date(record.created_at).toLocaleDateString(),
      'Reference ID': record.reference_id,
      'Transaction ID': record.transaction_id,
      'Transaction Type': record.transaction_type,
      Amount: parseFloat(record.amount),
      Charges: parseFloat(record.charges),
      'Total Amount': parseFloat(record.total_amount),
      'Wallet Balance Before': parseFloat(record.wallet_balance_before),
      'Wallet Balance After': parseFloat(record.wallet_balance_after),
      'Beneficiary Name': record.beneficiary_name,
      'Beneficiary Account': record.beneficiary_account,
      'Beneficiary IFSC': record.beneficiary_ifsc,
      'Bank Name': record.bank_name,
      'UTR Number': record.utr_number,
      'Original Status': record.original_status,
      'New Status': record.new_status,
      'Failed By': record.failedByUser ? record.failedByUser.name : 'System',
      Remark: record.remark || ''
    }));

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payout_failed_history_${new Date().toISOString().split('T')[0]}.csv"`);

    // Create CSV content
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    res.send(csvContent);

    logger.info('Payout failed history downloaded successfully', {
      userId,
      recordCount: failedHistory.length
    });

  } catch (error) {
    logger.error('Error downloading payout failed history:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading payout failed history',
      error: error.message
    });
  }
};

// Validate a webhook URL: empty string is allowed (clears the webhook),
// otherwise it must be a well-formed http/https URL.
const isValidWebhookUrl = (url) => {
  if (url === '' || url === null || url === undefined) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// GET /api/user/webhooks — return the logged-in user's own webhook configuration.
// The gateway/merchant selection is admin-controlled and returned read-only here.
const getUserWebhooks = async (req, res) => {
  try {
    const merchantDetails = await MerchantDetails.findOne({
      where: { user_id: req.user.id }
    });

    res.json({
      success: true,
      data: {
        payin_callback: merchantDetails?.payin_callback || '',
        payout_callback: merchantDetails?.payout_callback || '',
        payin_merchant_name: merchantDetails?.payin_merchant_name || null,
        payout_merchant_name: merchantDetails?.payout_merchant_name || null,
        last_updated: merchantDetails?.updated_at || null
      }
    });
  } catch (error) {
    logger.error('Error fetching user webhooks', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching webhook configuration' });
  }
};

// PUT /api/user/webhooks — let the user set their own payin/payout webhook URLs.
// Only the callback URL fields are touched; merchant/gateway assignment is never
// modified here so a user cannot change which gateway routes their traffic.
// These are the same MerchantDetails fields the admin manages, so changes are
// reflected on the admin callbacks screen (and vice-versa).
const updateUserWebhooks = async (req, res) => {
  try {
    const { payin_callback, payout_callback } = req.body;

    // Only apply fields that were actually provided in the request.
    const updates = {};
    if (payin_callback !== undefined) {
      if (!isValidWebhookUrl(payin_callback)) {
        return res.status(400).json({ success: false, message: 'Invalid payin webhook URL. Use a valid http(s) URL.' });
      }
      updates.payin_callback = payin_callback || '';
    }
    if (payout_callback !== undefined) {
      if (!isValidWebhookUrl(payout_callback)) {
        return res.status(400).json({ success: false, message: 'Invalid payout webhook URL. Use a valid http(s) URL.' });
      }
      updates.payout_callback = payout_callback || '';
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No webhook URL provided to update' });
    }

    const [merchantDetails, created] = await MerchantDetails.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id, ...updates }
    });

    if (!created) {
      await merchantDetails.update(updates);
    }

    res.json({
      success: true,
      message: 'Webhook configuration updated successfully',
      data: {
        payin_callback: merchantDetails.payin_callback || '',
        payout_callback: merchantDetails.payout_callback || '',
        payin_merchant_name: merchantDetails.payin_merchant_name || null,
        payout_merchant_name: merchantDetails.payout_merchant_name || null,
        last_updated: merchantDetails.updated_at || null
      }
    });
  } catch (error) {
    logger.error('Error updating user webhooks', { error: error.message });
    res.status(500).json({ success: false, message: 'Error updating webhook configuration' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserWebhooks,
  updateUserWebhooks,
  getUserWalletReports,
  getUserPayinReports,
  downloadUserPayinReports,
  getUserPayoutReports,
  downloadUserPayoutReports,
  getUserFundRequests,
  createFundRequest,
  getUserDashboard,
  getLastNDaysTransactions,
  getUserSettlementReport,
  getUserWalletTransactionHistory,
  getUserPayoutFailedHistory,
  downloadSettlementReport,
  downloadPayoutFailedHistory
}; 