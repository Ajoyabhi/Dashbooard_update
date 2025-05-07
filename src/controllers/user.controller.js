const { logger } = require('../utils/logger');
const { User, FinancialDetails, ManageFundRequest } = require('../models');
const { sequelize } = require('../models');
const UserTransaction = require('../models/userTransaction.model');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');


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
        { 'user.name': searchRegex },
        { transaction_id: searchRegex },
        { reference_id: searchRegex }
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
        { 'user.name': searchRegex },
        { transaction_id: searchRegex },
        { reference_id: searchRegex }
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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserWalletReports,
  getUserPayinReports,
  getUserPayoutReports,
  getUserFundRequests,
  createFundRequest
}; 