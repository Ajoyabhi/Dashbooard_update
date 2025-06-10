const { logger } = require('../utils/logger');
const { User, FinancialDetails, ManageFundRequest, TransactionCharges, SettlementTransaction } = require('../models');
const { sequelize } = require('../models');
const UserTransaction = require('../models/userTransaction.model');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');

const { Op } = require('sequelize');


const getUserProfile = async (req, res) => {
  try {
    // User can only access their own profile
    const user = await User.findById(req.user._id).select('-password');
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

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
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

    const walletBalance = await TransactionCharges.findOne({
      attributes: [
        [sequelize.literal('SUM(CASE WHEN status = "completed" THEN transaction_amount - merchant_charge - gst_amount - platform_fee ELSE 0 END)'), 'total_balance']
      ],
      where: {
        user_id: req.user.id,
        transaction_type: 'payin'
      },
      raw: true
    });

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

    // Calculate today's pay-in and payout
    const todayPayin = todayTransactions
      .filter(t => t.transaction_type === 'payin' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.transaction_amount), 0);

    const todayPayout = todayTransactions
      .filter(t => t.transaction_type === 'payout' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.transaction_amount), 0);

    // Calculate total pay-in and payout
    const totalPayin = allTransactions
      .filter(t => t.transaction_type === 'payin' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.transaction_amount), 0);

    const totalPayout = allTransactions
      .filter(t => t.transaction_type === 'payout' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.transaction_amount), 0);

    // Prepare response object
    const dashboardData = {
      settlement_balance: financialDetails ? parseFloat(financialDetails.settlement) : 0,
      wallet_balance: financialDetails ? parseFloat(financialDetails.wallet) : 0,
      today_payin: todayPayin,
      today_payout: todayPayout,
      total_payin: totalPayin,
      total_payout: totalPayout,
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
      wallet_balance: parseFloat(transaction.wallet_balance_after),
      settlement_balance: parseFloat(transaction.settlement_balance_after),
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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserWalletReports,
  getUserPayinReports,
  getUserPayoutReports,
  getUserFundRequests,
  createFundRequest,
  getUserDashboard,
  getUserSettlementReport
}; 