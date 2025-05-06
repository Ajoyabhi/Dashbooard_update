const User = require('../models/User');
const { sequelize } = require('../config/database');
const ManageFundRequest = require('../models/manageFundRequest.model')(sequelize);
const FinancialDetails = require('../models/FinancialDetails')(sequelize);
const { logger } = require('../utils/logger');

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

const createFundRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      settlement_wallet,
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

    const fundRequest = await ManageFundRequest.create({
      user_id: req.user.id,
      settlement_wallet,
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
            wallet: parseFloat(request.wallet_balance),
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
  createFundRequest,
  getUserFundRequests
}; 