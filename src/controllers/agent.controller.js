const { User, UserStatus, FinancialDetails, MerchantDetails,MerchantCharges, TransactionCharges } = require('../models');
const UserTransaction  = require('../models/userTransaction.model');
const PayinTransaction = require('../models/payinTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;


const getRegisteredUsers = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get all users registered by this agent
        const users = await User.findAll({
            where: { created_by: agentId },
            include: [
                { model: UserStatus },
                { 
                    model: FinancialDetails,
                    attributes: ['wallet', 'settlement', 'lien', 'rolling_reserve']
                }
            ],
            attributes: { exclude: ['password'] }
        });

        // Get total count of users
        const totalUsers = users.length;

        // Get active users count
        const activeUsers = users.filter(user => user.UserStatus?.status).length;

        // Get recent registrations (last 7 days)
        const recentRegistrations = users.filter(user => {
            const registrationDate = new Date(user.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return registrationDate >= sevenDaysAgo;
        });

        res.json({
            totalUsers,
            activeUsers,
            recentRegistrations,
            users
        });
    } catch (error) {
        console.error('Error fetching registered users:', error);
        res.status(500).json({ error: 'Error fetching registered users' });
    }
};

const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                created_by: agentId
            },
            include: [
                { model: UserStatus }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Error fetching user details' });
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, user_name, mobile, email, password, pan, aadhaar, user_type, company_name, gst_number, business_type, address, city, state, pincode } = req.body;
        const agentId = req.user.id;

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ user_name }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            user_name,
            mobile,
            email,
            password,
            pan,
            aadhaar,
            user_type,
            company_name,
            gst_number,
            business_type,
            address,
            city,
            state,
            pincode,
            created_by: agentId
        });

        // Create user status
        await UserStatus.create({
            user_id: user.id,
            status: true,
            payout_status: true,
            api_status: true,
            payin_status: true,
            payouts_status: true
        });

        // Create financial details
        await FinancialDetails.create({
            user_id: user.id,
            wallet: '0.00',
            settlement: '0.00',
            lien: '0.00',
            rolling_reserve: '0.00'
        });

        res.status(201).json({ 
            message: 'User registered successfully', 
            user: {
                ...user.toJSON(),
                password: undefined // Remove password from response
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

const getUserCharges = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                created_by: agentId
            },
            include: [
                { model: MerchantCharges }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user || { payin_charge: 0, payout_charge: 0 });
    } catch (error) {
        console.error('Error fetching user charges:', error);
        res.status(500).json({ error: 'Error fetching user charges' });
    }
};

const updateUserCharges = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;
        const { start_amount, end_amount, payin_charge_value, payout_charge_value, payin_charge_type, payout_charge_type, admin_payin_charge, admin_payout_charge, admin_payin_charge_type, admin_payout_charge_type } = req.body;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                created_by: agentId
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if a bracket with these exact amounts already exists
        const existingBracket = await MerchantCharges.findOne({
            where: {
                user_id: userId,
                start_amount: start_amount,
                end_amount: end_amount
            }
        });

        if (existingBracket) {
            // Update the existing bracket with new agent charges
            await existingBracket.update({
                agent_payin_charge: payin_charge_value,
                agent_payout_charge: payout_charge_value,
                agent_payin_charge_type: payin_charge_type,
                agent_payout_charge_type: payout_charge_type,
                updated_by: agentId
            });
            return res.status(200).json(existingBracket);
        }

        // If no existing bracket found, create a new one
        const newBracket = await MerchantCharges.create({
            user_id: userId,
            start_amount: start_amount,
            end_amount: end_amount,
            agent_payin_charge: payin_charge_value,
            agent_payout_charge: payout_charge_value,
            agent_payin_charge_type: payin_charge_type,
            agent_payout_charge_type: payout_charge_type,
            admin_payin_charge: admin_payin_charge || '0.00',
            admin_payout_charge: admin_payout_charge || '0.00',
            admin_payin_charge_type: admin_payin_charge_type || 'percentage',
            admin_payout_charge_type: admin_payout_charge_type || 'percentage',
            updated_by: agentId,
            created_by: agentId
        });

        res.status(201).json(newBracket);
    } catch (error) {
        console.error('Error updating user charges:', error);
        res.status(500).json({ error: 'Error updating user charges' });
    }
};

const getUserCallbacks = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                created_by: agentId
            },
            include: [
                { model: MerchantDetails }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // const callbacks = await MerchantDetails.findOne({


        res.json(user || { payin_callback: '', payout_callback: '' });
    } catch (error) {
        console.error('Error fetching user callbacks:', error);
        res.status(500).json({ error: 'Error fetching user callbacks' });
    }
};

const updateUserCallbacks = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;
        const { payin_callback, payout_callback } = req.body;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                created_by: agentId
            },
            include: [
                { model: MerchantDetails }
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [callbacks, created] = await MerchantDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                payin_callback,
                payout_callback
            }
        });

        if (!created) {
            await callbacks.update({
                payin_callback,
                payout_callback
            }); 
        }

        res.status(200).json(callbacks);
    } catch (error) {
        console.error('Error updating user callbacks:', error);
        res.status(500).json({ error: 'Error updating user callbacks' });
    }
};

const getWalletReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const agentId = req.user.id;

        // First get all users created by this agent
        const users = await User.findAll({
            where: { created_by: agentId },
            attributes: ['id']
        });

        const userIds = users.map(user => user.id);

        // Build filter object
        const filter = {
            'user.user_id': { $in: userIds }
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
            remark: transaction.remark,
            openBalance: transaction.balance.before,
            amount: transaction.amount,
            balance: transaction.balance.after,
            status: transaction.status,
            charges: transaction.charges,
            reference_id: transaction.reference_id,
            agent_charges: transaction.charges.agent_charge         
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
        console.error('Error in getWalletReports:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet reports',
            error: error.message
        });
    }
};

const getPayinReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const agentId = req.user.id;

        // Get all users created by this agent from SQL database
        const users = await User.findAll({
            where: {
                created_by: agentId
            },
            attributes: ['id']
        });

        // Extract user IDs
        const userIds = users.map(user => user.id.toString());

        // Build filter object for MongoDB
        const filter = {
            'user.user_id': { $in: userIds }
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
        console.error('Error in getPayinReports:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payin reports',
            error: error.message
        });
    }
};

const getPayoutReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const agentId = req.user.id;

        // Get all users created by this agent from SQL database
        const users = await User.findAll({
            where: {
                created_by: agentId
            },
            attributes: ['id']
        });

        // Extract user IDs
        const userIds = users.map(user => user.id.toString());

        // Build filter object for MongoDB
        const filter = {
            'user.user_id': { $in: userIds }
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
        console.error('Error in getPayoutReports:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payout reports',
            error: error.message
        });
    }
};

const getDashboardData = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get total users created by this agent
        const totalUsers = await User.count({ where: { created_by: agentId } });

        // Get all users created by this agent
        const users = await User.findAll({ 
            where: { created_by: agentId },
            attributes: ['id']
        });

        // Get total wallet and settlement balances
        const financialDetails = await FinancialDetails.findAll({
            where: {
                user_id: users.map(user => user.id)
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('wallet')), 'total_wallet'],
                [sequelize.fn('SUM', sequelize.col('settlement')), 'total_settlement']
            ]
        });

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Calculate today's and total pay-in & payout profits
        const transactionCharges = await TransactionCharges.findAll({
            where: {
                user_id: users.map(user => user.id),
                status: 'completed'
            },
            attributes: [
                'transaction_type',
                [sequelize.fn('SUM', sequelize.col('agent_charge')), 'total_charges'],
                [sequelize.literal(`CASE 
                    WHEN created_at >= '${today.toISOString()}' AND created_at < '${tomorrow.toISOString()}'
                    THEN agent_charge 
                    ELSE 0 
                END`), 'today_charges']
            ],
            group: ['transaction_type']
        });

        // Get recent 10 pay-in transactions with user details
        const recentPayins = await PayinTransaction.find({
            'user.user_id': { $in: users.map(user => user.id) }
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email mobile')
        .lean();

        // Get recent 10 payout transactions with user details
        const recentPayouts = await PayoutTransaction.find({
            'user.user_id': { $in: users.map(user => user.id) }
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email mobile')
        .lean();

        // Process transaction charges data
        const chargesData = {
            today: {
                payin: 0,
                payout: 0
            },
            total: {
                payin: 0,
                payout: 0
            }
        };

        transactionCharges.forEach(charge => {
            const type = charge.transaction_type;
            chargesData.total[type] = parseFloat(charge.getDataValue('total_charges')) || 0;
            chargesData.today[type] = parseFloat(charge.getDataValue('today_charges')) || 0;
        });

        // Format the response
        const response = {
            success: true,
            data: {
                total_users: totalUsers,
                balances: {
                    wallet: parseFloat(financialDetails[0]?.getDataValue('total_wallet')) || 0,
                    settlement: parseFloat(financialDetails[0]?.getDataValue('total_settlement')) || 0
                },
                profits: {
                    today: {
                        payin: chargesData.today.payin,
                        payout: chargesData.today.payout
                    },
                    total: {
                        payin: chargesData.total.payin,
                        payout: chargesData.total.payout
                    }
                },
                recent_transactions: {
                    payin: recentPayins,
                    payout: recentPayouts
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error in getDashboardData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
};



module.exports = {
    getRegisteredUsers,
    getUserDetails,
    registerUser,
    getUserCharges,
    updateUserCharges,
    getUserCallbacks,
    updateUserCallbacks,
    getWalletReports,
    getPayinReports,
    getPayoutReports,
    getDashboardData
}; 