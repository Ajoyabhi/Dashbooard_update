const { User, UserStatus, MerchantDetails, MerchantCharges, MerchantModeCharges, FinancialDetails, UserIPs, PlatformCharges, TransactionCharges, SettlementTransaction, ManageFundRequest, WalletTransaction, PayoutFailedHistory } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const PayoutTransaction = require('../models/payoutTransaction.model');
const PayinTransaction = require('../models/payinTransaction.model');
const axios = require('axios');
const { sendMerchantPayoutCallback, finalizePayout } = require('../services/payoutReconciliation.service');
const { getTransactionTrace } = require('../services/transactionTrace.service');
const {
  bluswapTransactionStatus,
  mizorpayTransactionStatus
} = require('../transactionStatusCheck/TransactionCheck');
const { logger } = require('../utils/logger');
const { istDayRange, istDaySkeleton, istCreatedAtRange } = require('../utils/istTime');
const { validateBands } = require('../utils/payoutGatewayRouting');
// const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const UserTransaction = require('../models/userTransaction.model');
// const User = require('../models/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [
                {
                    model: UserStatus,
                    attributes: ['status', 'payin_status', 'payout_status']
                },
                {
                    model: FinancialDetails,
                    attributes: ['wallet', 'settlement', 'lien', 'rolling_reserve']
                }
            ],
            attributes: [
                'id',
                'name',
                'user_name',
                'user_type',
                'mobile',
                'email',
                'company_name',
                'business_type',
                'test_random_beneficiary',
                'payout_alert_enabled',
                'created_at',
                'updated_at'
            ]
        });

        // Transform the data to match frontend requirements
        const transformedUsers = users.map(user => {

            const financialDetails = user.FinancialDetail || {};
            const status = user.UserStatus?.status == true ? 'active' : 'inactive';
            const transformed = {
                id: user.id,
                name: user.name,
                userType: user.user_type,
                username: user.user_name,
                walletBalance: financialDetails.wallet ? Number(financialDetails.wallet) : 0,
                settlement: financialDetails.settlement ? Number(financialDetails.settlement) : 0,
                lien: financialDetails.lien ? Number(financialDetails.lien) : 0,
                rollingReserve: financialDetails.rolling_reserve ? Number(financialDetails.rolling_reserve) : 0,
                mobile: user.mobile,
                payin: user.UserStatus?.payin_status || false,
                payout: user.UserStatus?.payout_status || false,
                testRandomBeneficiary: user.test_random_beneficiary || false,
                payoutAlertEnabled: user.payout_alert_enabled || false,
                status: status
            };
            return transformed;
        });

        res.json(transformedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const getAllAgents = async (req, res) => {
    try {
        const agents = await User.findAll({
            where: { user_type: 'agent' },
            include: [
                { model: UserStatus }
            ],
            attributes: { exclude: ['password'] }
        });
        res.json(agents);
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Error fetching agents' });
    }
};

const getUserDetails = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { id: req.params.userId },
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

const getAgentDetails = async (req, res) => {
    try {
        const agent = await User.findOne({
            where: {
                id: req.params.agentId,
                user_type: 'agent'
            },
            include: [
                { model: UserStatus }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        res.json(agent);
    } catch (error) {
        console.error('Error fetching agent details:', error);
        res.status(500).json({ error: 'Error fetching agent details' });
    }
};

const getAgentUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: {
                created_by: req.params.agentId
            },
            include: [
                { model: UserStatus }
            ],
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching agent users:', error);
        res.status(500).json({ error: 'Error fetching agent users' });
    }
};

// Merchant Details Management
const addOrUpdateMerchantDetails = async (req, res) => {
    try {
        const { user_id } = req.params;
        const {
            payin_merchant_assigned,
            payin_merchant_name,
            payout_merchant_assigned,
            payout_merchant_name,
            user_key,
            user_token,
            payin_callback,
            payout_callback,
            gst
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create or update merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id },
            defaults: {
                payin_merchant_assigned,
                payin_merchant_name,
                payout_merchant_assigned,
                payout_merchant_name,
                user_key,
                user_token,
                payin_callback,
                payout_callback,
                // gst: per-user GST %; omit/undefined -> column default NULL (uses global GST).
                gst
            }
        });

        if (!created) {
            await merchantDetails.update({
                payin_merchant_assigned,
                payin_merchant_name,
                payout_merchant_assigned,
                payout_merchant_name,
                user_key,
                user_token,
                payin_callback,
                payout_callback,
                // Send gst: <number> to set a per-user rate, gst: null to clear back to
                // global. Undefined (field omitted) is ignored by Sequelize, so existing
                // callers that don't send gst won't wipe an already-configured value.
                gst
            });
        }

        res.json({
            success: true,
            message: created ? 'Merchant details added successfully' : 'Merchant details updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error managing merchant details:', error);
        res.status(500).json({
            success: false,
            message: 'Error managing merchant details'
        });
    }
};

// Get merchant details for a user
const getUserMerchantDetails = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get merchant details
        const merchantDetails = await MerchantDetails.findOne({
            where: { user_id }
        });

        res.json({
            success: true,
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error fetching merchant details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching merchant details'
        });
    }
};

// Merchant Charges Management
const addMerchantCharges = async (req, res) => {
    try {
        const {
            user_id,
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        const merchantCharges = await MerchantCharges.create({
            user_id,
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charges added successfully',
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error adding merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding merchant charges'
        });
    }
};

const updateMerchantCharges = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        const merchantCharges = await MerchantCharges.findByPk(id);
        if (!merchantCharges) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charges not found'
            });
        }

        await merchantCharges.update({
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charges updated successfully',
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error updating merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating merchant charges'
        });
    }
};

// Get merchant charges for a specific user
const getUserMerchantCharges = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all merchant charges for the user
        const merchantCharges = await MerchantCharges.findAll({
            where: { user_id },
            order: [['start_amount', 'ASC']]
        });

        res.json({
            success: true,
            data: merchantCharges
        });
    } catch (error) {
        console.error('Error fetching user merchant charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user merchant charges'
        });
    }
};

// Update merchant charges for a specific user
const updateUserMerchantCharges = async (req, res) => {
    try {
        const { user_id } = req.params;
        const {
            start_amount,
            end_amount,
            payin_start_amount,
            payin_end_amount,
            payout_start_amount,
            payout_end_amount,
            admin_payin_charge,
            admin_payout_charge,
            admin_payin_charge_type,
            admin_payout_charge_type,
        } = req.body;

        // Resolve the payin/payout ranges. Newer clients send per-side ranges;
        // older ones send only the shared start_amount/end_amount, which we then
        // apply to both sides. The legacy start_amount/end_amount columns stay
        // populated (mirroring the payin range) so existing readers keep working.
        const payinStart = payin_start_amount ?? start_amount;
        const payinEnd = payin_end_amount ?? end_amount;
        const payoutStart = payout_start_amount ?? start_amount;
        const payoutEnd = payout_end_amount ?? end_amount;

        if (payinStart == null || payinEnd == null || payoutStart == null || payoutEnd == null) {
            return res.status(400).json({
                success: false,
                message: 'Payin and payout start/end amounts are required'
            });
        }

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Check if an identical bracket (same payin + payout ranges) already exists
            const existingCharge = await MerchantCharges.findOne({
                where: {
                    user_id,
                    payin_start_amount: payinStart,
                    payin_end_amount: payinEnd,
                    payout_start_amount: payoutStart,
                    payout_end_amount: payoutEnd
                },
                transaction: t
            });

            if (existingCharge) {
                // Update existing charge
                await existingCharge.update({
                    start_amount: payinStart,
                    end_amount: payinEnd,
                    admin_payin_charge,
                    admin_payout_charge,
                    admin_payin_charge_type,
                    admin_payout_charge_type,
                    updated_by: req.user.id
                }, { transaction: t });
                return existingCharge;
            }

            // Create new charge if no existing bracket found
            const newCharge = await MerchantCharges.create({
                user_id,
                // Legacy shared range mirrors the payin range for backward compatibility
                start_amount: payinStart,
                end_amount: payinEnd,
                payin_start_amount: payinStart,
                payin_end_amount: payinEnd,
                payout_start_amount: payoutStart,
                payout_end_amount: payoutEnd,
                admin_payin_charge,
                admin_payout_charge,
                admin_payin_charge_type,
                admin_payout_charge_type,
                // Set default values for required agent fields
                agent_payin_charge: 0,
                agent_payout_charge: 0,
                agent_payin_charge_type: 'percentage',
                agent_payout_charge_type: 'percentage',
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction: t });

            return newCharge;
        });

        res.json({
            success: true,
            message: 'Admin charges added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding admin charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding admin charges'
        });
    }
};

// Update a specific merchant charge for a user
const updateMerchantCharge = async (req, res) => {
    try {
        const { user_id, charge_id } = req.params;
        const {
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find the specific charge for this user
        const merchantCharge = await MerchantCharges.findOne({
            where: {
                id: charge_id,
                user_id: user_id
            }
        });

        if (!merchantCharge) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charge not found for this user'
            });
        }

        // Update the charge
        await merchantCharge.update({
            start_amount,
            end_amount,
            payout_charge,
            payin_charge,
            agent_payin_charge,
            agent_payout_charge,
            payin_total_charge,
            payout_total_charge,
            payin_charge_type,
            payout_charge_type,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Merchant charge updated successfully',
            data: merchantCharge
        });
    } catch (error) {
        console.error('Error updating merchant charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating merchant charge'
        });
    }
};

// Delete a specific merchant charge for a user
const deleteMerchantCharge = async (req, res) => {
    try {
        const { user_id, charge_id } = req.params;
        const merchantCharge = await MerchantCharges.findOne({
            where: {
                id: charge_id,
                user_id: user_id
            }
        });
        if (!merchantCharge) {
            return res.status(404).json({
                success: false,
                message: 'Merchant charge not found for this user'
            });
        }
        await merchantCharge.destroy();
        res.json({
            success: true,
            message: 'Merchant charge deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting merchant charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting merchant charge'
        });
    }
};

// Update user details
const updateUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            name,
            user_name,
            email,
            mobile,
            company_name,
            business_type,
            user_type,
            payin_status,
            payout_status,
            status
        } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user details
        await user.update({
            name,
            user_name,
            email,
            mobile,
            company_name,
            business_type,
            user_type
        });

        // Convert status string to boolean for DB
        const statusBoolean = status === 'active' ? true : false;

        // Update user status
        const [userStatus, created] = await UserStatus.findOrCreate({
            where: { user_id: userId },
            defaults: {
                payin_status: payin_status !== undefined ? payin_status : true,
                payout_status: payout_status !== undefined ? payout_status : true,
                status: statusBoolean
            }
        });

        if (!created) {
            await userStatus.update({
                payin_status: payin_status !== undefined ? payin_status : userStatus.payin_status,
                payout_status: payout_status !== undefined ? payout_status : userStatus.payout_status,
                status: statusBoolean
            });
        }

        // Convert boolean back to string for frontend
        const statusString = userStatus.status ? 'active' : 'inactive';

        res.json({
            success: true,
            message: 'User details updated successfully',
            data: {
                ...user.toJSON(),
                status: {
                    payin_status: userStatus.payin_status,
                    payout_status: userStatus.payout_status,
                    status: statusString
                }
            }
        });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ error: 'Error updating user details' });
    }
};

// Toggle the "random test beneficiary" testing feature for a user.
// When enabled, payin requests for this user get a random test name/email/phone.
const toggleTestRandomBeneficiary = async (req, res) => {
    try {
        const { userId } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: '"enabled" must be a boolean' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ test_random_beneficiary: enabled });

        res.json({
            success: true,
            message: `Random test beneficiary ${enabled ? 'enabled' : 'disabled'} for user`,
            test_random_beneficiary: user.test_random_beneficiary
        });
    } catch (error) {
        console.error('Error toggling test random beneficiary:', error);
        res.status(500).json({ error: 'Error updating test beneficiary setting' });
    }
};

// Toggle per-merchant Telegram payout alerts (wake-up + failure pings)
const togglePayoutAlert = async (req, res) => {
    try {
        const { userId } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: '"enabled" must be a boolean' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ payout_alert_enabled: enabled });

        res.json({
            success: true,
            message: `Payout alerts ${enabled ? 'enabled' : 'disabled'} for user`,
            payout_alert_enabled: user.payout_alert_enabled
        });
    } catch (error) {
        console.error('Error toggling payout alert:', error);
        res.status(500).json({ error: 'Error updating payout alert setting' });
    }
};

// Get user callbacks
const getUserCallbacks = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const merchantDetails = await MerchantDetails.findOne({
            where: { user_id: userId }
        });

        res.json({
            success: true,
            data: {
                payin_callback: merchantDetails?.payin_callback || null,
                payout_callback: merchantDetails?.payout_callback || null,
                payin_merchant_name: merchantDetails?.payin_merchant_name || null,
                payout_merchant_name: merchantDetails?.payout_merchant_name || null,
                dummy_utr_prefix: merchantDetails?.dummy_utr_prefix || null,
                payout_gateway_threshold: merchantDetails?.payout_gateway_threshold ?? null,
                payout_gateway_above: merchantDetails?.payout_gateway_above || null,
                payout_gateway_below: merchantDetails?.payout_gateway_below || null,
                payout_gateway_bands: merchantDetails?.payout_gateway_bands ?? null,
                last_updated: merchantDetails?.updated_at || null
            }
        });
    } catch (error) {
        console.error('Error fetching user callbacks:', error);
        res.status(500).json({ error: 'Error fetching user callbacks' });
    }
};

/**
 * Per-gateway payout tally for a single user.
 *
 * Aggregates the user's payout transactions grouped by the gateway that actually
 * processed each one (metadata.gateway_name, persisted at creation). For each
 * gateway it returns the total & count overall and for completed payouts only —
 * so the Callback Settings page can show how much has flowed through Gateway A
 * vs Gateway B under amount-based routing.
 */
const getUserPayoutGatewayStats = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const rows = await PayoutTransaction.aggregate([
            { $match: { 'user.user_id': String(userId) } },
            {
                $group: {
                    _id: {
                        // Fall back to a stable label for legacy records created before
                        // gateway_name was persisted.
                        gateway: { $ifNull: ['$metadata.gateway_name', 'Unspecified'] }
                    },
                    total_amount: { $sum: '$amount' },
                    total_count: { $sum: 1 },
                    completed_amount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                    },
                    completed_count: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            },
            { $sort: { completed_amount: -1 } }
        ]);

        const gateways = rows.map(r => ({
            gateway: r._id.gateway,
            total_amount: r.total_amount || 0,
            total_count: r.total_count || 0,
            completed_amount: r.completed_amount || 0,
            completed_count: r.completed_count || 0
        }));

        return res.json({
            success: true,
            data: {
                gateways,
                grand_total_completed_amount: gateways.reduce((s, g) => s + g.completed_amount, 0),
                grand_total_completed_count: gateways.reduce((s, g) => s + g.completed_count, 0)
            }
        });
    } catch (error) {
        console.error('Error fetching payout gateway stats:', error);
        return res.status(500).json({ success: false, message: 'Error fetching payout gateway stats' });
    }
};

// Get user wallet balance
const getUserWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Getting wallet for user:', userId);

        const user = await User.findByPk(userId);
        console.log('User found:', user ? 'yes' : 'no');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find or create financial details
        const [financialDetails, created] = await FinancialDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                settlement: 0,
                wallet: 0,
                lien: 0,
                rolling_reserve: 0
            }
        });
        console.log('Financial details:', financialDetails ? 'found' : 'not found', 'Created:', created);

        res.json({
            success: true,
            data: {
                wallet_balance: financialDetails.wallet || 0
            }
        });
    } catch (error) {
        console.error('Error in getUserWallet:', error);
        res.status(500).json({ error: 'Error fetching wallet balance' });
    }
};

// Update user wallet balance
const updateUserWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, type, remark } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const financialDetails = await FinancialDetails.findOne({
            where: { user_id: userId }
        });

        if (!financialDetails) {
            return res.status(404).json({ error: 'Financial details not found' });
        }

        const currentBalance = parseFloat(financialDetails.wallet) || 0;
        let newBalance;

        if (type === 'credit') {
            newBalance = currentBalance + parseFloat(amount);
        } else if (type === 'debit') {
            if (currentBalance < parseFloat(amount)) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            newBalance = currentBalance - parseFloat(amount);
        } else {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }

        await financialDetails.update({
            wallet: newBalance
        });

        // Create wallet transaction record
        await WalletTransaction.create({
            user_id: userId,
            transaction_type: type,
            amount: parseFloat(amount),
            balance_before: currentBalance,
            balance_after: newBalance,
            remark: remark,
            created_by: req.user.id // Assuming req.user contains the admin user info
        });

        res.json({
            success: true,
            message: 'Wallet balance updated successfully',
            new_balance: newBalance,
            data: {
                previous_balance: currentBalance,
                new_balance: newBalance,
                transaction_type: type,
                amount: parseFloat(amount),
                remark
            }
        });
    } catch (error) {
        console.error('Error updating wallet balance:', error);
        res.status(500).json({ error: 'Error updating wallet balance' });
    }
};

// user wallet balance transaction history
const getUserWalletTransactionHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

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
        console.error('Error fetching user wallet transaction history:', error);
        res.status(500).json({ error: 'Error fetching user wallet transaction history' });
    }
};

// Get user rolling reserve balance (with wallet balance for context)
const getUserRollingReserve = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [financialDetails] = await FinancialDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                settlement: 0,
                wallet: 0,
                lien: 0,
                rolling_reserve: 0
            }
        });

        res.json({
            success: true,
            data: {
                wallet_balance: parseFloat(financialDetails.wallet) || 0,
                rolling_reserve_balance: parseFloat(financialDetails.rolling_reserve) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching rolling reserve:', error);
        res.status(500).json({ error: 'Error fetching rolling reserve balance' });
    }
};

// Move funds between wallet and rolling reserve
// action: 'hold'    -> debit wallet, credit rolling reserve
// action: 'release' -> debit rolling reserve, credit wallet
const updateUserRollingReserve = async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount, action, remark } = req.body;

        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        if (!['hold', 'release'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action. Use "hold" or "release"' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await sequelize.transaction(async (t) => {
            const financialDetails = await FinancialDetails.findOne({
                where: { user_id: userId },
                transaction: t,
                lock: true
            });

            if (!financialDetails) {
                throw new Error('Financial details not found');
            }

            const walletBalance = parseFloat(financialDetails.wallet) || 0;
            const reserveBalance = parseFloat(financialDetails.rolling_reserve) || 0;

            let newWallet, newReserve;
            if (action === 'hold') {
                if (walletBalance < parsedAmount) {
                    throw new Error('Insufficient wallet balance');
                }
                newWallet = walletBalance - parsedAmount;
                newReserve = reserveBalance + parsedAmount;
            } else {
                if (reserveBalance < parsedAmount) {
                    throw new Error('Insufficient rolling reserve balance');
                }
                newWallet = walletBalance + parsedAmount;
                newReserve = reserveBalance - parsedAmount;
            }

            await financialDetails.update({
                wallet: newWallet,
                rolling_reserve: newReserve
            }, { transaction: t });

            // Log the wallet-side movement in wallet transaction history
            await WalletTransaction.create({
                user_id: userId,
                transaction_type: action === 'hold' ? 'debit' : 'credit',
                amount: parsedAmount,
                balance_before: walletBalance,
                balance_after: newWallet,
                remark: `[Rolling Reserve ${action === 'hold' ? 'Hold' : 'Release'}] ${remark || (action === 'hold' ? 'Moved to rolling reserve' : 'Released to wallet')}`,
                created_by: req.user.id
            }, { transaction: t });

            return { walletBalance, reserveBalance, newWallet, newReserve };
        });

        res.json({
            success: true,
            message: action === 'hold'
                ? 'Amount moved to rolling reserve successfully'
                : 'Amount released to wallet successfully',
            data: {
                action,
                amount: parsedAmount,
                wallet_balance_before: result.walletBalance,
                wallet_balance_after: result.newWallet,
                rolling_reserve_before: result.reserveBalance,
                rolling_reserve_after: result.newReserve
            }
        });
    } catch (error) {
        console.error('Error updating rolling reserve:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error updating rolling reserve'
        });
    }
};

// Get user IPs
const getUserIPs = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userIPs = await UserIPs.findAll({
            where: { user_id },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: userIPs
        });
    } catch (error) {
        console.error('Error fetching user IPs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user IPs'
        });
    }
};

// Add user IP
const addUserIP = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { ip_address } = req.body;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate IP address format
        // const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        // if (!ipRegex.test(ip_address)) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Invalid IP address format'
        //     });
        // }

        // Check if IP already exists for this user
        const existingIP = await UserIPs.findOne({
            where: { user_id, ip_address }
        });

        if (existingIP) {
            return res.status(400).json({
                success: false,
                message: 'IP address already exists for this user'
            });
        }

        const userIP = await UserIPs.create({
            user_id,
            ip_address,
            created_by: req.user.id,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'IP address added successfully',
            data: userIP
        });
    } catch (error) {
        console.error('Error adding user IP:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding user IP'
        });
    }
};

// Remove user IP
const removeUserIP = async (req, res) => {
    try {
        const { user_id, ip_id } = req.params;

        // Check if user exists
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find and delete the IP
        const deleted = await UserIPs.destroy({
            where: {
                id: ip_id,
                user_id
            }
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'IP address not found for this user'
            });
        }

        res.json({
            success: true,
            message: 'IP address removed successfully'
        });
    } catch (error) {
        console.error('Error removing user IP:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing user IP'
        });
    }
};

// Get platform charges
const getPlatformCharges = async (req, res) => {
    try {
        const platformCharges = await PlatformCharges.findAll({
            where: { is_active: true },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: platformCharges
        });
    } catch (error) {
        console.error('Error fetching platform charges:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching platform charges'
        });
    }
};

// Add platform charge
const addPlatformCharge = async (req, res) => {
    try {
        const { charge, gst } = req.body;

        // Validate charge and GST
        if (charge < 0 || gst < 0) {
            return res.status(400).json({
                success: false,
                message: 'Charge and GST must be positive numbers'
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Deactivate all existing platform charges
            await PlatformCharges.update(
                { is_active: false },
                {
                    where: { is_active: true },
                    transaction: t
                }
            );

            // Create new platform charge
            const platformCharge = await PlatformCharges.create({
                charge,
                gst,
                is_active: true,
                created_by: req.user.id,
                updated_by: req.user.id
            }, { transaction: t });

            return platformCharge;
        });

        res.json({
            success: true,
            message: 'Platform charge added successfully',
            data: result
        });
    } catch (error) {
        console.error('Error adding platform charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding platform charge'
        });
    }
};

// Remove platform charge
const removePlatformCharge = async (req, res) => {
    try {
        const { charge_id } = req.params;

        // Find and deactivate the platform charge
        const platformCharge = await PlatformCharges.findByPk(charge_id);

        if (!platformCharge) {
            return res.status(404).json({
                success: false,
                message: 'Platform charge not found'
            });
        }

        await platformCharge.update({
            is_active: false,
            updated_by: req.user.id
        });

        res.json({
            success: true,
            message: 'Platform charge removed successfully'
        });
    } catch (error) {
        console.error('Error removing platform charge:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing platform charge'
        });
    }
};

// Update user payin callback
const updateUserPayinCallback = async (req, res) => {
    try {
        const { userId } = req.params;
        const { payinUrl, payinMerchantName } = req.body;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // The URL and the gateway are INDEPENDENT — admins can switch the gateway
        // without re-entering the callback URL, and vice-versa. A blank/omitted
        // field means "leave the stored value unchanged"; we only write the fields
        // that were actually provided.
        const hasUrl = typeof payinUrl === 'string' && payinUrl.trim() !== '';
        const hasMerchant = typeof payinMerchantName === 'string' && payinMerchantName.trim() !== '';

        const updateData = {};
        if (hasUrl) updateData.payin_callback = payinUrl.trim();
        if (hasMerchant) {
            updateData.payin_merchant_name = payinMerchantName;
            updateData.payin_merchant_assigned = payinMerchantName; // Using merchant name as assigned number for now
        }

        // Find or create merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                payin_callback: hasUrl ? payinUrl.trim() : '',
                payin_merchant_name: hasMerchant ? payinMerchantName : '',
                payin_merchant_assigned: hasMerchant ? payinMerchantName : ''
            }
        });

        if (!created && Object.keys(updateData).length > 0) {
            await merchantDetails.update(updateData);
        }

        res.json({
            success: true,
            message: 'Payin callback updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error updating payin callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payin callback'
        });
    }
};

// Update user payout callback
const updateUserPayoutCallback = async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            payoutUrl,
            payoutMerchantName,
            dummyUtrPrefix,
            payoutGatewayThreshold,
            payoutGatewayAbove,
            payoutGatewayBelow,
            payoutGatewayBands
        } = req.body;

        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // The URL and the gateway are INDEPENDENT — admins can switch the payout
        // gateway without re-entering the callback URL, and vice-versa. A blank/
        // omitted field means "leave the stored value unchanged"; we only write the
        // fields that were actually provided.
        const hasUrl = typeof payoutUrl === 'string' && payoutUrl.trim() !== '';
        const hasMerchant = typeof payoutMerchantName === 'string' && payoutMerchantName.trim() !== '';

        // Only the leading DIGITS are meaningful for the synthetic UTR prefix.
        // Sanitize here so we never store stray characters; '' clears the prefix.
        const cleanUtrPrefix = dummyUtrPrefix === undefined
            ? undefined
            : String(dummyUtrPrefix || '').replace(/\D/g, '');

        // Amount-based gateway routing. Sent together as a group. An empty/blank
        // threshold clears routing (NULL) and blanks both gateways; a numeric
        // threshold sets it plus the above/below gateways. `undefined` (field group
        // omitted by caller) leaves the existing routing config untouched.
        let routingThreshold; // undefined => don't touch
        let routingAbove;
        let routingBelow;
        if (payoutGatewayThreshold !== undefined) {
            const t = String(payoutGatewayThreshold).trim();
            if (t === '' || isNaN(parseFloat(t))) {
                routingThreshold = null; // clear routing
                routingAbove = null;
                routingBelow = null;
            } else {
                routingThreshold = parseFloat(t);
                routingAbove = (payoutGatewayAbove && String(payoutGatewayAbove).trim()) || null;
                routingBelow = (payoutGatewayBelow && String(payoutGatewayBelow).trim()) || null;
            }
        }

        // N-tier amount-range routing (payout_gateway_bands). Preferred over the
        // legacy threshold group above. `undefined` => field omitted => leave the
        // stored bands untouched. An empty array / null => clear band routing. A
        // non-empty array => validate & store, and clear the legacy threshold cols
        // so the two routing mechanisms can't silently disagree.
        let bandsUpdate; // undefined => don't touch
        let clearLegacyForBands = false;
        if (payoutGatewayBands !== undefined) {
            const { valid, bands, error } = validateBands(payoutGatewayBands);
            if (!valid) {
                return res.status(400).json({ success: false, message: error });
            }
            bandsUpdate = bands; // array to store, or null to clear
            if (bands && bands.length) clearLegacyForBands = true;
        }

        const updateData = {};
        if (hasUrl) updateData.payout_callback = payoutUrl.trim();
        if (hasMerchant) {
            updateData.payout_merchant_name = payoutMerchantName;
            updateData.payout_merchant_assigned = payoutMerchantName; // Using merchant name as assigned number for now
        }
        // Undefined => field omitted by caller => leave existing value untouched.
        if (cleanUtrPrefix !== undefined) updateData.dummy_utr_prefix = cleanUtrPrefix;
        if (routingThreshold !== undefined) {
            updateData.payout_gateway_threshold = routingThreshold;
            updateData.payout_gateway_above = routingAbove;
            updateData.payout_gateway_below = routingBelow;
        }
        if (bandsUpdate !== undefined) {
            updateData.payout_gateway_bands = bandsUpdate;
        }
        if (clearLegacyForBands) {
            // Bands supersede the legacy threshold routing; wipe it so it can't linger.
            updateData.payout_gateway_threshold = null;
            updateData.payout_gateway_above = null;
            updateData.payout_gateway_below = null;
        }

        // Find or create merchant details
        const [merchantDetails, created] = await MerchantDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                payout_callback: hasUrl ? payoutUrl.trim() : '',
                payout_merchant_name: hasMerchant ? payoutMerchantName : '',
                payout_merchant_assigned: hasMerchant ? payoutMerchantName : '',
                dummy_utr_prefix: cleanUtrPrefix ?? null,
                payout_gateway_threshold: clearLegacyForBands ? null : (routingThreshold ?? null),
                payout_gateway_above: clearLegacyForBands ? null : (routingAbove ?? null),
                payout_gateway_below: clearLegacyForBands ? null : (routingBelow ?? null),
                payout_gateway_bands: bandsUpdate ?? null
            }
        });

        if (!created && Object.keys(updateData).length > 0) {
            await merchantDetails.update(updateData);
        }

        res.json({
            success: true,
            message: 'Payout callback updated successfully',
            data: merchantDetails
        });
    } catch (error) {
        console.error('Error updating payout callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payout callback'
        });
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        // 1. Get total number of users
        const totalUsers = await User.count();

        // 2. Calculate total available balance from financial_details
        const totalBalance = await FinancialDetails.sum('wallet');

        // 2b. Calculate total rolling reserve held across all users
        const totalRollingReserve = await FinancialDetails.sum('rolling_reserve');

        // 3. Calculate total payout (sum of merchant charges for completed payout transactions)
        const totalPayout = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payout',
                status: 'completed'
            }
        });

        // "Today" = the current IST calendar day (created_at is stored in UTC).
        const { startUtc: istTodayStart, nextStartUtc: istTomorrowStart } = istDayRange(0);

        // 4. Calculate today's payout
        const todayPayout = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payout',
                status: 'completed',
                created_at: {
                    [Op.gte]: istTodayStart,
                    [Op.lt]: istTomorrowStart
                }
            }
        });

        // 5. Calculate total payin (sum of merchant charges for completed payin transactions)
        const totalPayin = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payin',
                status: 'completed'
            }
        });

        // 6. Calculate today's payin
        const todayPayin = await TransactionCharges.sum('merchant_charge', {
            where: {
                transaction_type: 'payin',
                status: 'completed',
                created_at: {
                    [Op.gte]: istTodayStart,
                    [Op.lt]: istTomorrowStart
                }
            }
        });

        // 7. Calculate total profit (sum of total payin and total payout)
        const totalProfit = (totalPayin || 0) + (totalPayout || 0);

        // 8. Calculate today's profit (sum of today's payin and today's payout)
        const todayProfit = (todayPayin || 0) + (todayPayout || 0);

        // 9. Calculate last 7 days payout and payin data (bucketed by IST day)
        const last7DaysData = [];
        for (const { startUtc, endUtc, dateLabel } of istDaySkeleton(7)) {
            const dayPayout = await TransactionCharges.sum('merchant_charge', {
                where: {
                    transaction_type: 'payout',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startUtc, endUtc]
                    }
                }
            });

            const dayPayin = await TransactionCharges.sum('merchant_charge', {
                where: {
                    transaction_type: 'payin',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startUtc, endUtc]
                    }
                }
            });

            last7DaysData.push({
                date: dateLabel,
                payout: dayPayout || 0,
                payin: dayPayin || 0,
                profit: (dayPayout || 0) + (dayPayin || 0)
            });
        }

        // 10. Get recent payout transactions from MongoDB
        const recentPayoutTransactions = await PayoutTransaction.find()
            .sort({ createdAt: -1 })
            .limit(10);

        const totalOutflow = await TransactionCharges.sum('transaction_amount', {
            where: {
                status: 'completed',
                transaction_type: 'payout'
            }
        });

        const totalInflow = await TransactionCharges.sum('transaction_amount', {
            where: {
                status: 'completed',
                transaction_type: 'payin'
            }
        });


        const dashboardData = {
            totalUsers: totalUsers || 0,
            totalBalance: totalBalance || 0,
            totalRollingReserve: totalRollingReserve || 0,
            totalPayout: totalPayout || 0,
            todayPayout: todayPayout || 0,
            totalPayin: totalPayin || 0,
            todayPayin: todayPayin || 0,
            totalProfit: totalProfit || 0,
            todayProfit: todayProfit || 0,
            last7DaysData: last7DaysData,
            totalOutflow: totalOutflow || 0,
            totalInflow: totalInflow || 0,
            recentPayoutTransactions: recentPayoutTransactions.map(transaction => ({
                transaction_id: transaction.transaction_id,
                amount: transaction.amount,
                status: transaction.status,
                reference_id: transaction.reference_id,
                created_at: transaction.createdAt,
                user_name: transaction.user?.id?.name || transaction.user?.name || 'N/A',
                user_email: transaction.user?.id?.email || transaction.user?.email || 'N/A',
                beneficiary_name: transaction.beneficiary_details?.beneficiary_name || 'N/A',
                account_number: transaction.beneficiary_details?.account_number || 'N/A',
                bank_name: transaction.beneficiary_details?.bank_name || 'N/A',
                total_charges: transaction.charges?.total_charges || 0,
                remark: transaction.remark || 'N/A'
            }))
        };

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

const getWalletTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            type,
            status,
            startDate,
            endDate,
            search,
            user
        } = req.query;

        // Convert page and pageSize to numbers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNumber - 1) * limit;

        // Build filter object
        const filter = {};

        if (type && type !== 'all') {
            filter.transaction_type = type;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter (from dropdown selection)
        if (user && user !== '') {
            filter['user.user_id'] = user.toString();
        }

        // Add search condition if search term is provided
        if (search && search.trim() !== '') {
            const searchConditions = [
                { transaction_id: { $regex: search, $options: 'i' } },
                { reference_id: { $regex: search, $options: 'i' } }
            ];

            // If no specific user is selected from dropdown, also search by user name/email
            if (!user || user === '') {
                searchConditions.push(
                    { 'user.name': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'user.mobile': { $regex: search, $options: 'i' } }
                );
            }

            filter.$or = searchConditions;
        }

        // Get total count for pagination
        const totalCount = await UserTransaction.countDocuments(filter);

        // Get paginated transactions
        const transactions = await UserTransaction.find(filter)
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalItems: totalCount,
                    pageSize: limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet transactions',
            error: error.message
        });
    }
};

const getPayoutTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            status,
            startDate,
            endDate,
            search,
            user,
            gateway
        } = req.query;

        // Convert page and pageSize to numbers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNumber - 1) * limit;

        // Build filter object
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter (from dropdown selection)
        if (user && user !== '') {
            filter['user.user_id'] = user.toString();
        }

        // Add gateway filter (from dropdown selection)
        if (gateway && gateway !== 'all') {
            filter['metadata.gateway_name'] = gateway;
        }

        // Add search condition if search term is provided
        if (search && search.trim() !== '') {
            const searchConditions = [
                { transaction_id: { $regex: search, $options: 'i' } },
                { reference_id: { $regex: search, $options: 'i' } },
                { 'beneficiary_details.beneficiary_name': { $regex: search, $options: 'i' } },
                { 'beneficiary_details.account_number': { $regex: search, $options: 'i' } },
                { 'gateway_response.utr': { $regex: search, $options: 'i' } }
            ];

            // If no specific user is selected from dropdown, also search by user name/email
            if (!user || user === '') {
                searchConditions.push(
                    { 'user.name': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'user.mobile': { $regex: search, $options: 'i' } }
                );
            }

            filter.$or = searchConditions;
        }

        // Get total count for pagination
        const totalCount = await PayoutTransaction.countDocuments(filter);

        // Get paginated transactions
        const transactions = await PayoutTransaction.find(filter)
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalItems: totalCount,
                    pageSize: limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payout transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payout transactions',
            error: error.message
        });
    }
};

const getPayinTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            status,
            startDate,
            endDate,
            search,
            user,
            gateway
        } = req.query;

        // Convert page and pageSize to numbers
        const pageNumber = parseInt(page);
        const limit = parseInt(pageSize);
        const skip = (pageNumber - 1) * limit;

        // Build filter object
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter (from dropdown selection)
        if (user && user !== '') {
            filter['user.user_id'] = user.toString();
        }

        // Add gateway filter (from dropdown selection)
        if (gateway && gateway !== 'all') {
            filter['metadata.gateway_name'] = gateway;
        }

        // Add search condition if search term is provided
        if (search && search.trim() !== '') {
            const searchConditions = [
                { transaction_id: { $regex: search, $options: 'i' } },
                { reference_id: { $regex: search, $options: 'i' } },
                { 'beneficiary_details.beneficiary_name': { $regex: search, $options: 'i' } },
                { 'beneficiary_details.beneficiary_email': { $regex: search, $options: 'i' } },
                { 'gateway_response.utr': { $regex: search, $options: 'i' } }
            ];

            // If no specific user is selected from dropdown, also search by user name/email
            if (!user || user === '') {
                searchConditions.push(
                    { 'user.name': { $regex: search, $options: 'i' } },
                    { 'user.email': { $regex: search, $options: 'i' } },
                    { 'user.mobile': { $regex: search, $options: 'i' } }
                );
            }

            filter.$or = searchConditions;
        }

        // Get total count for pagination
        const totalCount = await PayinTransaction.countDocuments(filter);

        // Get paginated transactions
        const transactions = await PayinTransaction.find(filter)
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip)
            .limit(limit);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalItems: totalCount,
                    pageSize: limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payin transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payin transactions',
            error: error.message
        });
    }
};


// Aggregated collection summary for payin transactions.
// Given a user + date/time range (and optional status), returns the total
// amount and count, plus a per-status breakdown. Mirrors the CLI report at
// src/scripts/checkPayinTransactionsByDate.js but scoped to a single query.
const getPayinCollectionSummary = async (req, res) => {
    try {
        const { status, startDate, endDate, user, gateway } = req.query;

        // Build filter object (kept identical in spirit to getPayinTransactions)
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        if (user && user !== '') {
            filter['user.user_id'] = user.toString();
        }

        if (gateway && gateway !== 'all') {
            filter['metadata.gateway_name'] = gateway;
        }

        const results = await PayinTransaction.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
                }
            }
        ]);

        // Overall totals across whatever statuses matched the filter
        const overall = results.reduce(
            (acc, r) => {
                acc.count += r.count;
                acc.totalAmount += r.totalAmount;
                return acc;
            },
            { count: 0, totalAmount: 0 }
        );

        // Per-status breakdown as an easy-to-render map
        const statusBreakdown = results.reduce((acc, r) => {
            acc[r._id] = { count: r.count, totalAmount: r.totalAmount };
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                totalCount: overall.count,
                totalAmount: overall.totalAmount,
                statusBreakdown,
                filters: {
                    status: status || 'all',
                    startDate: startDate || null,
                    endDate: endDate || null,
                    user: user || null
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payin collection summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payin collection summary',
            error: error.message
        });
    }
};


const getPayinTransactionsDownload = async (req, res) => {
    try {
        const { startDate, endDate, status, user, gateway } = req.query;

        // Build filter object
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter
        if (user) {
            filter['user.user_id'] = user.toString();
        }

        // Add gateway filter
        if (gateway && gateway !== 'all') {
            filter['metadata.gateway_name'] = gateway;
        }

        // Get all payin transactions based on filters
        const transactions = await PayinTransaction.find(filter)
            .sort({ createdAt: -1 });

        // Import ExcelJS for Excel generation
        const ExcelJS = require('exceljs');

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payin Transactions');

        // Define columns
        worksheet.columns = [
            { header: 'Transaction ID', key: 'transaction_id', width: 20 },
            { header: 'Reference ID', key: 'reference_id', width: 20 },
            { header: 'User Name', key: 'user_name', width: 20 },
            { header: 'User Email', key: 'user_email', width: 25 },
            { header: 'User Mobile', key: 'user_mobile', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Admin Charge', key: 'admin_charge', width: 15 },
            { header: 'Agent Charge', key: 'agent_charge', width: 15 },
            { header: 'Total Charges', key: 'total_charges', width: 15 },
            { header: 'Beneficiary Name', key: 'beneficiary_name', width: 20 },
            { header: 'Beneficiary Email', key: 'beneficiary_email', width: 25 },
            { header: 'UTR', key: 'utr', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created Date', key: 'created_date', width: 20 },
            { header: 'Remark', key: 'remark', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        transactions.forEach(transaction => {
            worksheet.addRow({
                transaction_id: transaction.transaction_id,
                reference_id: transaction.reference_id,
                user_name: transaction.user?.name || 'N/A',
                user_email: transaction.user?.email || 'N/A',
                user_mobile: transaction.user?.mobile || 'N/A',
                amount: transaction.amount,
                admin_charge: transaction.charges?.admin_charge || 0,
                agent_charge: transaction.charges?.agent_charge || 0,
                total_charges: transaction.charges?.total_charges || 0,
                beneficiary_name: transaction.beneficiary_details?.beneficiary_name || 'N/A',
                beneficiary_email: transaction.beneficiary_details?.beneficiary_email || 'N/A',
                utr: transaction.gateway_response?.utr || 'N/A',
                status: transaction.status,
                created_date: new Date(transaction.createdAt).toLocaleString('en-IN'),
                remark: transaction.remark || 'N/A'
            });
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=payin-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating payin transactions download:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating payin transactions download',
            error: error.message
        });
    }
}

const getPayoutTransactionsDownload = async (req, res) => {
    try {
        const { startDate, endDate, status, user, gateway } = req.query;

        // Build filter object
        const filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter
        if (user) {
            filter['user.user_id'] = user.toString();
        }

        // Add gateway filter
        if (gateway && gateway !== 'all') {
            filter['metadata.gateway_name'] = gateway;
        }

        // Get all payout transactions based on filters
        const transactions = await PayoutTransaction.find(filter)
            .sort({ createdAt: -1 });

        // Import ExcelJS for Excel generation
        const ExcelJS = require('exceljs');

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Payout Transactions');

        // Define columns
        worksheet.columns = [
            { header: 'Transaction ID', key: 'transaction_id', width: 20 },
            { header: 'Reference ID', key: 'reference_id', width: 20 },
            { header: 'User Name', key: 'user_name', width: 20 },
            { header: 'User Email', key: 'user_email', width: 25 },
            { header: 'User Mobile', key: 'user_mobile', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Admin Charge', key: 'admin_charge', width: 15 },
            { header: 'Agent Charge', key: 'agent_charge', width: 15 },
            { header: 'Total Charges', key: 'total_charges', width: 15 },
            { header: 'Beneficiary Name', key: 'beneficiary_name', width: 20 },
            { header: 'Account Number', key: 'account_number', width: 20 },
            { header: 'IFSC Code', key: 'ifsc_code', width: 15 },
            { header: 'Bank Name', key: 'bank_name', width: 20 },
            { header: 'UTR', key: 'utr', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created Date', key: 'created_date', width: 20 },
            { header: 'Remark', key: 'remark', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        transactions.forEach(transaction => {
            worksheet.addRow({
                transaction_id: transaction.transaction_id,
                reference_id: transaction.reference_id,
                user_name: transaction.user?.name || 'N/A',
                user_email: transaction.user?.email || 'N/A',
                user_mobile: transaction.user?.mobile || 'N/A',
                amount: transaction.amount,
                admin_charge: transaction.charges?.admin_charge || 0,
                agent_charge: transaction.charges?.agent_charge || 0,
                total_charges: transaction.charges?.total_charges || 0,
                beneficiary_name: transaction.beneficiary_details?.beneficiary_name || 'N/A',
                account_number: transaction.beneficiary_details?.account_number || 'N/A',
                ifsc_code: transaction.beneficiary_details?.account_ifsc || 'N/A',
                bank_name: transaction.beneficiary_details?.bank_name || 'N/A',
                utr: transaction.gateway_response?.utr || 'N/A',
                status: transaction.status,
                created_date: new Date(transaction.createdAt).toLocaleString('en-IN'),
                remark: transaction.remark || 'N/A'
            });
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=payout-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating payout transactions download:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating payout transactions download',
            error: error.message
        });
    }
}

// Get users for dropdown (simplified list)
const getUsersForDropdown = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'mobile'],
            order: [['name', 'ASC']]
        });

        const userOptions = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            displayText: `${user.name} (${user.email})`
        }));

        res.json({
            success: true,
            data: userOptions
        });
    } catch (error) {
        console.error('Error fetching users for dropdown:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users for dropdown',
            error: error.message
        });
    }
};

const getWalletTransactionsDownload = async (req, res) => {
    try {
        const { startDate, endDate, status, type, user } = req.query;

        // Build filter object
        const filter = {};

        if (type && type !== 'all') {
            filter.transaction_type = type;
        }

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Add user filter
        if (user) {
            filter['user.user_id'] = user.toString();
        }

        // Get all wallet transactions based on filters
        const transactions = await UserTransaction.find(filter)
            .sort({ createdAt: -1 });

        // Import ExcelJS for Excel generation
        const ExcelJS = require('exceljs');

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Wallet Transactions');

        // Define columns
        worksheet.columns = [
            { header: 'Transaction ID', key: 'transaction_id', width: 20 },
            { header: 'Transaction Type', key: 'transaction_type', width: 15 },
            { header: 'User Name', key: 'user_name', width: 20 },
            { header: 'User Email', key: 'user_email', width: 25 },
            { header: 'User Mobile', key: 'user_mobile', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Admin Charge', key: 'admin_charge', width: 15 },
            { header: 'Agent Charge', key: 'agent_charge', width: 15 },
            { header: 'Total Charges', key: 'total_charges', width: 15 },
            { header: 'Balance Before', key: 'balance_before', width: 15 },
            { header: 'Balance After', key: 'balance_after', width: 15 },
            { header: 'Merchant Name', key: 'merchant_name', width: 20 },
            { header: 'UTR', key: 'utr', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created Date', key: 'created_date', width: 20 },
            { header: 'Remark', key: 'remark', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        transactions.forEach(transaction => {
            worksheet.addRow({
                transaction_id: transaction.transaction_id,
                transaction_type: transaction.transaction_type,
                user_name: transaction.user?.name || 'N/A',
                user_email: transaction.user?.email || 'N/A',
                user_mobile: transaction.user?.mobile || 'N/A',
                amount: transaction.amount,
                admin_charge: transaction.charges?.admin_charge || 0,
                agent_charge: transaction.charges?.agent_charge || 0,
                total_charges: transaction.charges?.total_charges || 0,
                balance_before: transaction.balance?.before || 0,
                balance_after: transaction.balance?.after || 0,
                merchant_name: transaction.merchant_details?.merchant_name || 'N/A',
                utr: transaction.gateway_response?.utr || 'N/A',
                status: transaction.status,
                created_date: new Date(transaction.createdAt).toLocaleString('en-IN'),
                remark: transaction.remark || 'N/A'
            });
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=wallet-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating wallet transactions download:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating wallet transactions download',
            error: error.message
        });
    }
}

// Settle amount for a user
const settleAmount = async (req, res) => {
    try {
        // destination:
        //   'settlement'  -> credit the merchant's Settlement wallet (default, legacy behaviour)
        //   'direct_bank' -> credit the separate Direct Bank Payout wallet
        const { user_id, amount_, remark, destination = 'settlement' } = req.body;

        if (!user_id || !amount_ || amount_ <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input parameters'
            });
        }

        if (!['settlement', 'direct_bank'].includes(destination)) {
            return res.status(400).json({
                success: false,
                message: "Invalid destination. Must be 'settlement' or 'direct_bank'"
            });
        }

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            // Get user's financial details (row-locked so concurrent settles can't
            // clobber each other's balance updates).
            const financialDetails = await FinancialDetails.findOne({
                where: { user_id },
                transaction: t,
                lock: true
            });

            if (!financialDetails) {
                throw new Error('Financial details not found');
            }

            const walletBalance = parseFloat(financialDetails.wallet) || 0;
            const settlementBalance = parseFloat(financialDetails.settlement) || 0;
            const directBankBalance = parseFloat(financialDetails.direct_bank_payout) || 0;
            const amount = parseFloat(amount_);

            // Validate wallet balance — both destinations draw from the wallet.
            if (walletBalance < amount) {
                throw new Error('Insufficient wallet balance');
            }

            const walletAfter = parseFloat((walletBalance - amount).toFixed(2));

            // Build the balance update + audit record based on the chosen destination.
            let updateFields;
            let txnFields;
            if (destination === 'direct_bank') {
                const directBankAfter = parseFloat((directBankBalance + amount).toFixed(2));
                updateFields = { wallet: walletAfter, direct_bank_payout: directBankAfter };
                txnFields = {
                    // Settlement is untouched, so before === after for audit clarity.
                    settlement_balance_before: settlementBalance,
                    settlement_balance_after: settlementBalance,
                    direct_bank_balance_before: directBankBalance,
                    direct_bank_balance_after: directBankAfter,
                    remark: remark || 'Direct bank payout processed'
                };
            } else {
                const settlementAfter = parseFloat((settlementBalance + amount).toFixed(2));
                updateFields = { wallet: walletAfter, settlement: settlementAfter };
                txnFields = {
                    settlement_balance_before: settlementBalance,
                    settlement_balance_after: settlementAfter,
                    direct_bank_balance_before: null,
                    direct_bank_balance_after: null,
                    remark: remark || 'Settlement processed'
                };
            }

            await financialDetails.update(updateFields, { transaction: t });

            const settlementTransaction = await SettlementTransaction.create({
                user_id,
                amount,
                wallet_balance_before: walletBalance,
                wallet_balance_after: walletAfter,
                destination,
                status: 'completed',
                created_by: req.user.id,
                updated_by: req.user.id,
                ...txnFields
            }, { transaction: t });

            return {
                financialDetails,
                settlementTransaction
            };
        });

        res.json({
            success: true,
            message: destination === 'direct_bank'
                ? 'Direct bank payout processed successfully'
                : 'Settlement processed successfully',
            data: {
                wallet_balance: result.financialDetails.wallet,
                settlement_balance: result.financialDetails.settlement,
                direct_bank_payout_balance: result.financialDetails.direct_bank_payout,
                transaction: result.settlementTransaction
            }
        });
    } catch (error) {
        console.error('Error processing settlement:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing settlement'
        });
    }
};

// Get settlement history for a user
const getSettlementHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, pageSize = 10 } = req.query;

        const offset = (page - 1) * pageSize;
        const limit = parseInt(pageSize);

        // Get total count
        const totalCount = await SettlementTransaction.count({
            where: { user_id: userId }
        });

        // Get paginated settlement transactions
        const transactions = await SettlementTransaction.findAll({
            where: { user_id: userId },
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

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / pageSize),
                    totalItems: totalCount,
                    pageSize: limit
                }
            }
        });
    } catch (error) {
        console.error('Error fetching settlement history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settlement history'
        });
    }
};

// Get settlement dashboard
const getSettlementDashboard = async (req, res) => {
    try {
        // Get all users with their financial details
        const allUsers = await User.findAll({
            include: [
                {
                    model: FinancialDetails,
                    attributes: ['wallet', 'settlement', 'direct_bank_payout']
                }
            ],
            attributes: ['id', 'name', 'user_name', 'mobile']
        });

        // Transform the data to create list of objects with required information
        const userSettlementList = allUsers.map(user => ({
            id: user.id,
            name: user.name,
            user_name: user.user_name,
            mobile: user.mobile,
            wallet: user.FinancialDetail ? Number(user.FinancialDetail.wallet) || 0 : 0,
            settlement: user.FinancialDetail ? Number(user.FinancialDetail.settlement) || 0 : 0,
            direct_bank_payout: user.FinancialDetail ? Number(user.FinancialDetail.direct_bank_payout) || 0 : 0
        }));

        res.json({
            success: true,
            data: userSettlementList
        });

    } catch (error) {
        console.error('Error fetching settlement dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settlement dashboard'
        });
    }
};

const getManageFundRequest = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;
        const limit = parseInt(pageSize);

        // Get total count without including associations
        const totalCount = await ManageFundRequest.count();

        // Get paginated fund requests with user details
        const fundRequests = await ManageFundRequest.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                },
                {
                    model: User,
                    as: 'updater',
                    attributes: ['name']
                }
            ],
            order: [['created_at', 'DESC']],
            offset,
            limit
        });

        // Transform data to match frontend table structure
        const transformedRequests = fundRequests.map(request => ({
            id: request.id,
            name: request.user.name,
            amount: parseFloat(request.settlement_wallet),
            wallet: parseFloat(request.wallet_balance),
            referenceId: request.reference_id,
            fromBank: request.from_bank,
            toBank: request.to_bank,
            paymentType: request.payment_type,
            remarks: request.remarks || '',
            reason: request.reason,
            status: request.status
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
        console.error('Error fetching manage fund request:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching manage fund request'
        });
    }
};

const updateManageFundRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Start a transaction
        const result = await sequelize.transaction(async (t) => {
            const manageFundRequest = await ManageFundRequest.findByPk(id, {
                transaction: t,
                lock: true
            });

            if (!manageFundRequest) {
                throw new Error('Fund request not found');
            }

            if (status === 'approved') {
                const financialDetails = await FinancialDetails.findOne({
                    where: { user_id: manageFundRequest.user_id },
                    transaction: t,
                    lock: true
                });

                if (!financialDetails) {
                    throw new Error('Financial details not found for user');
                }

                const walletBalance = parseFloat(financialDetails.wallet) || 0;
                const amount = parseFloat(manageFundRequest.settlement_wallet);

                // Update financial details
                await financialDetails.update({
                    wallet: walletBalance + amount
                }, { transaction: t });

                // Update fund request status
                await manageFundRequest.update({
                    status: status
                }, { transaction: t });

                return {
                    success: true,
                    message: 'Fund request approved successfully',
                    data: {
                        wallet_balance: walletBalance + amount,
                        fund_request: manageFundRequest
                    }
                };
            }
            else if (status === 'rejected') {
                await manageFundRequest.update({
                    status: status
                }, { transaction: t });

                return {
                    success: true,
                    message: 'Fund request rejected successfully',
                    data: {
                        fund_request: manageFundRequest
                    }
                };
            } else {
                throw new Error('Invalid status');
            }
        });

        res.json(result);
    } catch (error) {
        console.error('Error updating manage fund request:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating fund request'
        });
    }
};

const getChargeback = async (req, res) => {
    try {
        const { utr_number } = req.query;

        if (!utr_number) {
            return res.status(400).json({
                success: false,
                message: 'UTR number is required'
            });
        }

        // Search in UserTransaction collection for the UTR number in gateway_response
        const transaction = await UserTransaction.findOne({
            'gateway_response.utr': utr_number
        }).populate('user', 'name email mobile');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Transform the data to match frontend requirements
        const transformedData = {
            id: transaction._id,
            name: transaction.user?.name || 'N/A',
            email: transaction.user?.email || 'N/A',
            mobile: transaction.user?.mobile || 'N/A',
            amount: transaction.amount || 0,
            admin_charges: transaction.charges?.admin_charge || 0,
            reference_id: transaction.reference_id || 'N/A',
            transaction_type: transaction.transaction_type || 'N/A',
            status: transaction.status || 'N/A',
            utr_number: utr_number
        };

        res.json({
            success: true,
            data: transformedData
        });

    } catch (error) {
        console.error('Error fetching chargeback:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chargeback'
        });
    }
};

const handleChargebackAction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.params;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        const transaction = await UserTransaction.findById(id);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Update transaction status based on action
        transaction.status = action === 'accept' ? 'chargeback_approved' : 'chargeback_rejected';
        await transaction.save();

        res.json({
            success: true,
            message: `Chargeback ${action}ed successfully`,
            data: transaction
        });

    } catch (error) {
        console.error('Error handling chargeback action:', error);
        res.status(500).json({
            success: false,
            message: 'Error handling chargeback action'
        });
    }
};

const makePayoutFailed = async (req, res) => {
    try {
        const { referenceNumbers } = req.body;

        // Validate input
        if (!referenceNumbers || !Array.isArray(referenceNumbers) || referenceNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reference numbers array is required'
            });
        }

        // SQL models used for the settlement refund + failed-history record.
        const { User, FinancialDetails, PayoutFailedHistory } = require('../models');

        const walletUpdates = [];
        const skipped = [];
        const uniqueRefs = [...new Set(referenceNumbers)];

        for (const reference_id of uniqueRefs) {
            try {
                const payout = await PayoutTransaction.findOne({ reference_id });
                if (!payout) {
                    skipped.push({ reference_id, reason: 'not_found' });
                    continue;
                }
                // Only non-terminal payouts can be failed + refunded.
                if (!['pending', 'processing'].includes(payout.status)) {
                    skipped.push({ reference_id, reason: 'already_finalized', status: payout.status });
                    continue;
                }

                const userId = payout.user?.user_id;
                if (!userId) {
                    skipped.push({ reference_id, reason: 'no_user' });
                    continue;
                }

                // Capture settlement before, then let finalizePayout do the atomic
                // status transition + refund. finalizePayout refunds the FULL deducted
                // amount to SETTLEMENT: amount + total_charges + gst_amount + platform_fee.
                const finBefore = await FinancialDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
                const settlementBefore = parseFloat(finBefore?.settlement || 0);

                // notifyMerchant: true -> fire the merchant's payout webhook so their
                // side is updated with the new (failed) status.
                const result = await finalizePayout({
                    referenceId: reference_id,
                    isSuccess: false,
                    message: 'Transaction marked as failed by admin',
                    notifyMerchant: true
                });

                if (!result?.changed) {
                    skipped.push({ reference_id, reason: result?.reason || 'not_changed' });
                    continue;
                }

                const finAfter = await FinancialDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
                const settlementAfter = parseFloat(finAfter?.settlement || 0);

                const amount = parseFloat(payout.amount) || 0;
                const totalCharges = parseFloat(payout.charges?.total_charges) || 0;
                const gst = parseFloat(payout.gst_amount) || 0;
                const platformFee = parseFloat(payout.platform_fee) || 0;
                const chargesRefunded = totalCharges + gst + platformFee;
                const totalRefunded = amount + chargesRefunded;

                const user = await User.findByPk(userId);

                walletUpdates.push({
                    user_id: userId,
                    user_name: user?.name || null,
                    amount_added: totalRefunded,
                    transaction_type: 'PayoutTransaction',
                    reference_id,
                    old_balance: settlementBefore,
                    new_balance: settlementAfter
                });

                // Store failed-transaction history. NOTE: the wallet_balance_* columns
                // now carry the SETTLEMENT balance (payouts move settlement, not wallet).
                await PayoutFailedHistory.create({
                    user_id: userId,
                    reference_id,
                    transaction_id: payout.transaction_id || null,
                    transaction_type: 'PayoutTransaction',
                    amount,
                    charges: chargesRefunded,
                    total_amount: totalRefunded,
                    wallet_balance_before: settlementBefore,
                    wallet_balance_after: settlementAfter,
                    beneficiary_name: payout.beneficiary_details?.beneficiary_name || null,
                    beneficiary_account: payout.beneficiary_details?.account_number || null,
                    beneficiary_ifsc: payout.beneficiary_details?.account_ifsc || null,
                    bank_name: payout.beneficiary_details?.bank_name || null,
                    utr_number: payout.gateway_response?.utr || null,
                    remark: 'Transaction marked as failed by admin',
                    failed_by: req.user.id,
                    original_status: 'pending',
                    new_status: 'failed'
                });
            } catch (err) {
                logger.error('Error failing payout', { reference_id, error: err.message });
                skipped.push({ reference_id, reason: 'error', error: err.message });
            }
        }

        const modifiedCount = walletUpdates.length;
        res.json({
            success: true,
            message: `Marked ${modifiedCount} payout(s) as failed and refunded the settlement balance`,
            data: {
                modifiedCount,
                totalMatched: uniqueRefs.length,
                payoutTransactionsUpdated: modifiedCount,
                walletUpdates,
                skipped
            }
        });

    } catch (error) {
        console.error('Error making payout failed:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating transaction status',
            error: error.message
        });
    }
};

// Get trash transaction count based on filters
const getTrashTransactionCount = async (req, res) => {
    try {
        const { userId, transactionType, status } = req.query;

        if (!userId || !transactionType || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId, transactionType, status'
            });
        }

        let count = 0;
        const mongoose = require('mongoose');

        // Build query based on status
        const statusQuery = status === 'all' ? {} : { status: status };

        if (transactionType === 'payin') {
            const PayinTransaction = mongoose.model('PayinTransaction');
            const UserTransaction = mongoose.model('UserTransaction');

            // Count from both collections
            const payinCount = await PayinTransaction.countDocuments({
                'user.user_id': userId,
                ...statusQuery
            });

            const userTransactionCount = await UserTransaction.countDocuments({
                'user.user_id': userId,
                transaction_type: 'payin',
                ...statusQuery
            });

            count = payinCount;
        } else if (transactionType === 'payout') {
            const PayoutTransaction = mongoose.model('PayoutTransaction');
            const UserTransaction = mongoose.model('UserTransaction');

            // Count from both collections
            const payoutCount = await PayoutTransaction.countDocuments({
                'user.user_id': userId,
                ...statusQuery
            });

            const userTransactionCount = await UserTransaction.countDocuments({
                'user.user_id': userId,
                transaction_type: 'payout',
                ...statusQuery
            });

            count = payoutCount;
        }

        const statusText = status === 'all' ? 'all statuses' : `status "${status}"`;
        res.json({
            success: true,
            count: count,
            message: `Found ${count} ${transactionType} transactions with ${statusText} for user ${userId}`
        });

    } catch (error) {
        console.error('Error getting trash transaction count:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting transaction count',
            error: error.message
        });
    }
};

// Delete trash transactions based on filters
const deleteTrashTransactions = async (req, res) => {
    try {
        const { userId, transactionType, status } = req.body;

        if (!userId || !transactionType || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId, transactionType, status'
            });
        }

        let deletedCount = 0;
        const mongoose = require('mongoose');

        // Build query based on status
        const statusQuery = status === 'all' ? {} : { status: status };

        if (transactionType === 'payin') {
            const PayinTransaction = mongoose.model('PayinTransaction');
            const UserTransaction = mongoose.model('UserTransaction');

            // Delete from both collections
            const payinResult = await PayinTransaction.deleteMany({
                'user.user_id': userId,
                ...statusQuery
            });

            const userTransactionResult = await UserTransaction.deleteMany({
                'user.user_id': userId,
                transaction_type: 'payin',
                ...statusQuery
            });

            deletedCount = payinResult.deletedCount;
        } else if (transactionType === 'payout') {
            const PayoutTransaction = mongoose.model('PayoutTransaction');
            const UserTransaction = mongoose.model('UserTransaction');

            // Delete from both collections
            const payoutResult = await PayoutTransaction.deleteMany({
                'user.user_id': userId,
                transaction_type: 'payout',
                ...statusQuery
            });

            const userTransactionResult = await UserTransaction.deleteMany({
                'user.user_id': userId,
                transaction_type: 'payout',
                ...statusQuery
            });

            deletedCount = payoutResult.deletedCount;
        }

        const statusText = status === 'all' ? 'all statuses' : `status "${status}"`;
        res.json({
            success: true,
            deletedCount: deletedCount,
            message: `Successfully deleted ${deletedCount} ${transactionType} transactions with ${statusText} for user ${userId}`
        });

    } catch (error) {
        console.error('Error deleting trash transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting transactions',
            error: error.message
        });
    }
};

// Get payout failed history with pagination
const getPayoutFailedHistory = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            user,
            transactionType,
            startDate,
            endDate,
            search
        } = req.query;

        const offset = (page - 1) * pageSize;
        const limit = parseInt(pageSize);

        // Build where clause
        const whereClause = {};

        // Add user filter
        if (user && user !== '') {
            whereClause.user_id = parseInt(user);
        }

        // Add transaction type filter
        if (transactionType && transactionType !== 'all') {
            whereClause.transaction_type = transactionType;
        }

        // Add date range filter
        if (startDate || endDate) {
            whereClause.created_at = {};
            if (startDate) {
                whereClause.created_at[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                whereClause.created_at[Op.lte] = new Date(endDate);
            }
        }

        // Add search filter
        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { reference_id: { [Op.like]: `%${search}%` } },
                { transaction_id: { [Op.like]: `%${search}%` } },
                { beneficiary_name: { [Op.like]: `%${search}%` } },
                { beneficiary_account: { [Op.like]: `%${search}%` } },
                { utr_number: { [Op.like]: `%${search}%` } }
            ];
        }

        // Get total count
        const totalCount = await PayoutFailedHistory.count({
            where: whereClause
        });

        // Get paginated history
        const history = await PayoutFailedHistory.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: User,
                    as: 'failedByUser',
                    attributes: ['id', 'name', 'user_name']
                }
            ],
            order: [['created_at', 'DESC']],
            offset,
            limit
        });

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: totalCount,
                    pageSize: limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payout failed history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payout failed history',
            error: error.message
        });
    }
};

// Download payout failed history
const downloadPayoutFailedHistory = async (req, res) => {
    try {
        const { user, transactionType, startDate, endDate, search } = req.query;

        // Build where clause
        const whereClause = {};

        // Add user filter
        if (user && user !== '') {
            whereClause.user_id = parseInt(user);
        }

        // Add transaction type filter
        if (transactionType && transactionType !== 'all') {
            whereClause.transaction_type = transactionType;
        }

        // Add date range filter
        if (startDate || endDate) {
            whereClause.created_at = {};
            if (startDate) {
                whereClause.created_at[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                whereClause.created_at[Op.lte] = new Date(endDate);
            }
        }

        // Add search filter
        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { reference_id: { [Op.like]: `%${search}%` } },
                { transaction_id: { [Op.like]: `%${search}%` } },
                { beneficiary_name: { [Op.like]: `%${search}%` } },
                { beneficiary_account: { [Op.like]: `%${search}%` } },
                { utr_number: { [Op.like]: `%${search}%` } }
            ];
        }

        // Get all failed history based on filters
        const history = await PayoutFailedHistory.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: User,
                    as: 'failedByUser',
                    attributes: ['id', 'name', 'user_name']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Import ExcelJS for Excel generation
        const ExcelJS = require('exceljs');

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Failed Transaction History');

        // Define columns
        worksheet.columns = [
            { header: 'Reference ID', key: 'reference_id', width: 20 },
            { header: 'Transaction ID', key: 'transaction_id', width: 20 },
            { header: 'Transaction Type', key: 'transaction_type', width: 15 },
            { header: 'User Name', key: 'user_name', width: 20 },
            { header: 'User Email', key: 'user_email', width: 25 },
            { header: 'User Mobile', key: 'user_mobile', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Charges', key: 'charges', width: 15 },
            { header: 'Total Amount', key: 'total_amount', width: 15 },
            { header: 'Beneficiary Name', key: 'beneficiary_name', width: 20 },
            { header: 'Account Number', key: 'beneficiary_account', width: 20 },
            { header: 'IFSC Code', key: 'beneficiary_ifsc', width: 15 },
            { header: 'Bank Name', key: 'bank_name', width: 20 },
            { header: 'UTR Number', key: 'utr_number', width: 20 },
            { header: 'Failed By', key: 'failed_by', width: 20 },
            { header: 'Original Status', key: 'original_status', width: 15 },
            { header: 'New Status', key: 'new_status', width: 15 },
            { header: 'Created Date', key: 'created_date', width: 20 },
            { header: 'Remark', key: 'remark', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        history.forEach(item => {
            worksheet.addRow({
                reference_id: item.reference_id,
                transaction_id: item.transaction_id || 'N/A',
                transaction_type: item.transaction_type,
                user_name: item.user?.name || 'N/A',
                user_email: item.user?.email || 'N/A',
                user_mobile: item.user?.mobile || 'N/A',
                amount: item.amount,
                charges: item.charges,
                total_amount: item.total_amount,
                beneficiary_name: item.beneficiary_name || 'N/A',
                beneficiary_account: item.beneficiary_account || 'N/A',
                beneficiary_ifsc: item.beneficiary_ifsc || 'N/A',
                bank_name: item.bank_name || 'N/A',
                utr_number: item.utr_number || 'N/A',
                failed_by: item.failedByUser?.name || 'N/A',
                original_status: item.original_status,
                new_status: item.new_status,
                created_date: new Date(item.created_at).toLocaleString('en-IN'),
                remark: item.remark || 'N/A'
            });
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=failed-transaction-history-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating failed transaction history download:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating failed transaction history download',
            error: error.message
        });
    }
};

// Get last 5 days transaction details with charges breakdown
const { clearCacheKey } = require('../middleware/cache.middleware');

const getLastNDaysTransactionDetails = async (req, res) => {
    try {
        const { days = 5 } = req.query; // Default to 5 days if not specified

        // Validate days parameter
        const validDays = [3, 5, 10];
        const selectedDays = validDays.includes(parseInt(days)) ? parseInt(days) : 5;

        const lastNDaysData = [];

        // Bucket by IST calendar day. created_at is stored in UTC (same instant
        // as Mongo), so each IST day maps to a UTC [startDate, endDate] window.
        for (const { startUtc: startDate, endUtc: endDate, dateLabel } of istDaySkeleton(selectedDays)) {
            // Get payin transactions for the day
            const payinTransactions = await TransactionCharges.findAll({
                where: {
                    transaction_type: 'payin',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email']
                }],
                attributes: [
                    'user_id',
                    'transaction_amount',
                    'merchant_charge',
                    'agent_charge',
                    'total_charges',
                    'gst_amount',
                    'platform_fee',
                    'reference_id',
                    'transaction_utr',
                    'created_at'
                ]
            });

            // Get payout transactions for the day
            const payoutTransactions = await TransactionCharges.findAll({
                where: {
                    transaction_type: 'payout',
                    status: 'completed',
                    created_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email']
                }],
                attributes: [
                    'user_id',
                    'transaction_amount',
                    'merchant_charge',
                    'agent_charge',
                    'total_charges',
                    'gst_amount',
                    'platform_fee',
                    'reference_id',
                    'transaction_utr',
                    'created_at'
                ]
            });

            // Calculate totals for payin
            const payinTotal = payinTransactions.reduce((sum, t) => sum + parseFloat(t.transaction_amount || 0), 0);
            const payinTotalCharges = payinTransactions.reduce((sum, t) => sum + parseFloat(t.total_charges || 0), 0);
            const payinTotalGST = payinTransactions.reduce((sum, t) => sum + parseFloat(t.gst_amount || 0), 0);
            const payinTotalPlatformFee = payinTransactions.reduce((sum, t) => sum + parseFloat(t.platform_fee || 0), 0);

            // Calculate totals for payout
            const payoutTotal = payoutTransactions.reduce((sum, t) => sum + parseFloat(t.transaction_amount || 0), 0);
            const payoutTotalCharges = payoutTransactions.reduce((sum, t) => sum + parseFloat(t.total_charges || 0), 0);
            const payoutTotalGST = payoutTransactions.reduce((sum, t) => sum + parseFloat(t.gst_amount || 0), 0);
            const payoutTotalPlatformFee = payoutTransactions.reduce((sum, t) => sum + parseFloat(t.platform_fee || 0), 0);

            // User-wise aggregation for payin transactions
            const payinUserWise = {};
            // console.log(`Processing ${payinTransactions.length} payin transactions for ${startDate.toISOString().split('T')[0]}`);

            payinTransactions.forEach(transaction => {
                const userId = transaction.user_id;
                const userName = transaction.User?.name || 'Unknown User';
                const userEmail = transaction.User?.email || 'No Email';

                // console.log(`Payin Transaction - UserID: ${userId}, Name: ${userName}, Amount: ${transaction.transaction_amount}`);

                if (!payinUserWise[userId]) {
                    payinUserWise[userId] = {
                        user_id: userId,
                        user_name: userName,
                        user_email: userEmail,
                        total_amount: 0,
                        total_charges: 0,
                        total_gst: 0,
                        total_platform_fee: 0,
                        transaction_count: 0,
                        transactions: []
                    };
                }

                payinUserWise[userId].total_amount += parseFloat(transaction.transaction_amount || 0);
                payinUserWise[userId].total_charges += parseFloat(transaction.total_charges || 0);
                payinUserWise[userId].total_gst += parseFloat(transaction.gst_amount || 0);
                payinUserWise[userId].total_platform_fee += parseFloat(transaction.platform_fee || 0);
                payinUserWise[userId].transaction_count += 1;
                payinUserWise[userId].transactions.push({
                    reference_id: transaction.reference_id,
                    amount: parseFloat(transaction.transaction_amount || 0),
                    charges: parseFloat(transaction.total_charges || 0),
                    gst: parseFloat(transaction.gst_amount || 0),
                    platform_fee: parseFloat(transaction.platform_fee || 0),
                    utr: transaction.transaction_utr || null,
                    created_at: transaction.created_at
                });
            });

            // console.log(`Payin User Wise Summary:`, Object.keys(payinUserWise).map(uid => ({
            //     userId: uid,
            //     name: payinUserWise[uid].user_name,
            //     count: payinUserWise[uid].transaction_count
            // })));

            // User-wise aggregation for payout transactions
            const payoutUserWise = {};
            console.log(`Processing ${payoutTransactions.length} payout transactions for ${startDate.toISOString().split('T')[0]}`);

            payoutTransactions.forEach(transaction => {
                const userId = transaction.user_id;
                const userName = transaction.User?.name || 'Unknown User';
                const userEmail = transaction.User?.email || 'No Email';

                // console.log(`Payout Transaction - UserID: ${userId}, Name: ${userName}, Amount: ${transaction.transaction_amount}`);

                if (!payoutUserWise[userId]) {
                    payoutUserWise[userId] = {
                        user_id: userId,
                        user_name: userName,
                        user_email: userEmail,
                        total_amount: 0,
                        total_charges: 0,
                        total_gst: 0,
                        total_platform_fee: 0,
                        transaction_count: 0,
                        transactions: []
                    };
                }

                payoutUserWise[userId].total_amount += parseFloat(transaction.transaction_amount || 0);
                payoutUserWise[userId].total_charges += parseFloat(transaction.total_charges || 0);
                payoutUserWise[userId].total_gst += parseFloat(transaction.gst_amount || 0);
                payoutUserWise[userId].total_platform_fee += parseFloat(transaction.platform_fee || 0);
                payoutUserWise[userId].transaction_count += 1;
                payoutUserWise[userId].transactions.push({
                    reference_id: transaction.reference_id,
                    amount: parseFloat(transaction.transaction_amount || 0),
                    charges: parseFloat(transaction.total_charges || 0),
                    gst: parseFloat(transaction.gst_amount || 0),
                    platform_fee: parseFloat(transaction.platform_fee || 0),
                    utr: transaction.transaction_utr || null,
                    created_at: transaction.created_at
                });
            });

            // console.log(`Payout User Wise Summary:`, Object.keys(payoutUserWise).map(uid => ({
            //     userId: uid,
            //     name: payoutUserWise[uid].user_name,
            //     count: payoutUserWise[uid].transaction_count
            // })));

            lastNDaysData.push({
                date: dateLabel,
                payin: {
                    total_amount: payinTotal,
                    total_charges: payinTotalCharges,
                    total_gst: payinTotalGST,
                    total_platform_fee: payinTotalPlatformFee,
                    transaction_count: payinTransactions.length,
                    user_wise: Object.values(payinUserWise),
                    transactions: payinTransactions.map(t => ({
                        reference_id: t.reference_id,
                        amount: parseFloat(t.transaction_amount || 0),
                        charges: parseFloat(t.total_charges || 0),
                        gst: parseFloat(t.gst_amount || 0),
                        platform_fee: parseFloat(t.platform_fee || 0),
                        user_name: t.User?.name || 'N/A',
                        user_email: t.User?.email || 'N/A',
                        created_at: t.created_at
                    }))
                },
                payout: {
                    total_amount: payoutTotal,
                    total_charges: payoutTotalCharges,
                    total_gst: payoutTotalGST,
                    total_platform_fee: payoutTotalPlatformFee,
                    transaction_count: payoutTransactions.length,
                    user_wise: Object.values(payoutUserWise),
                    transactions: payoutTransactions.map(t => ({
                        reference_id: t.reference_id,
                        amount: parseFloat(t.transaction_amount || 0),
                        charges: parseFloat(t.total_charges || 0),
                        gst: parseFloat(t.gst_amount || 0),
                        platform_fee: parseFloat(t.platform_fee || 0),
                        user_name: t.User?.name || 'N/A',
                        user_email: t.User?.email || 'N/A',
                        created_at: t.created_at
                    }))
                }
            });
        }

        res.json({
            success: true,
            data: lastNDaysData,
            selectedDays: selectedDays
        });
    } catch (error) {
        // console.error('Error fetching last N days transaction details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching last N days transaction details',
            error: error.message
        });
    }
};

// Helper function to invalidate last 5 days cache
const invalidateLast5DaysCache = async () => {
    try {
        await clearCacheKey('last5days:transactions');
        console.log('Last 5 days transaction cache invalidated');
    } catch (error) {
        console.error('Error invalidating last 5 days cache:', error);
    }
};

const adminCheckPayinStatus = async (req, res) => {
    try {
        const { reference_id } = req.params;
        if (!reference_id) {
            return res.status(400).json({ success: false, message: 'Reference ID is required' });
        }

        const transaction = await PayinTransaction.findOne({ reference_id });
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Use gateway stored on the transaction — immune to merchant config changes.
        // For old transactions without gateway_name, default to HDFC (all pre-AirPay transactions
        // were HDFC/Unpay/Spay; using current MerchantDetails would route to the wrong gateway
        // if the merchant has since been switched).
        let merchantName = transaction.metadata?.gateway_name;
        if (!merchantName) {
            const merchantDetails = await MerchantDetails.findOne({ where: { user_id: transaction.user.user_id } });
            const currentGateway = merchantDetails?.payin_merchant_name;
            // Only trust current config if AirPay (new gateway — no legacy transactions).
            // For everything else fall back to HDFC as the safe default for old records.
            merchantName = currentGateway === 'AirPay' ? 'HDFC' : (currentGateway || 'HDFC');
        }

        logger.info('Admin check payin status', { reference_id, merchantName, source: transaction.metadata?.gateway_name ? 'transaction' : 'inferred' });

        if (merchantName === 'AirPay') {
            const response = await axios.get(
                `${process.env.ECOMMERCE_API_URL}/api/v1/payments/airpay/ap-check`,
                {
                    params: { reference_id },
                    headers: { 'x-api-key': process.env.AIRPAY_SHARED_SECRET },
                    timeout: 30000
                }
            );
            const result = response.data;
            const statusMap = { TXN: 'success', FAILED: 'failed', PENDING: 'pending' };
            const apStatus = statusMap[result.status?.toUpperCase()] || result.status || 'unknown';
            return res.status(200).json({
                success: true,
                transaction: {
                    reference_id: result.reference_id ?? transaction.reference_id,
                    type: 'payin',
                    status: apStatus,
                    amount: result.amount ?? transaction.amount,
                    utr: apStatus === 'success' ? (result.utr || null) : null,
                    message: apStatus === 'success'
                        ? 'Transaction processed'
                        : apStatus === 'pending' ? 'Transaction is pending' : 'Transaction failed',
                    timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
                    ap_transaction_id: result.ap_transaction_id || null,
                }
            });
        }

        if (merchantName === 'HDFC') {
            const response = await axios.get(
                `${process.env.ECOMMERCE_API_URL}/api/v1/payments/hdfc/pg-check`,
                {
                    params: { reference_id },
                    headers: { 'x-api-key': process.env.HDFC_SHARED_SECRET, 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );
            const result = response.data;
            const normalizeHdfcStatus = (s) => {
                if (!s) return 'pending';
                const u = s.toUpperCase();
                if (u === 'TXN' || u === 'CHARGED') return 'success';
                if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ABORTED', 'ERROR',
                     'AUTHORIZATION_FAILED', 'JUSPAY_DECLINED', 'PAYMENT_FAILED'].includes(u)) return 'failed';
                return 'pending';
            };
            const hdfcNormalized = normalizeHdfcStatus(result.status);
            return res.status(200).json({
                success: true,
                transaction: {
                    reference_id: result.reference_id ?? transaction.reference_id,
                    type: 'payin',
                    status: hdfcNormalized,
                    amount: result.amount ?? transaction.amount,
                    utr: hdfcNormalized === 'success' ? (result.utr || null) : null,
                    message: hdfcNormalized === 'success'
                        ? 'Transaction processed'
                        : hdfcNormalized === 'pending' ? 'Transaction is pending' : 'Transaction failed',
                    timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
                    hdfc_status: result.status || null,
                    payerVpa: hdfcNormalized === 'success' ? (result.payer_vpa || null) : null,
                }
            });
        }

        if (merchantName === 'Razorpay') {
            const response = await axios.get(
                `${process.env.ECOMMERCE_API_URL}/api/v1/payments/razorpay/rp-check`,
                {
                    params: { reference_id },
                    headers: { 'x-api-key': process.env.RAZORPAY_SHARED_SECRET, 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );
            const result = response.data;
            const normalizeRazorpayStatus = (s) => {
                if (!s) return 'pending';
                const u = s.toUpperCase();
                if (u === 'TXN' || u === 'CAPTURED' || u === 'FORWARDED') return 'success';
                if (['FAILED', 'FAILURE', 'CANCELLED', 'CANCEL', 'ERROR', 'EXPIRED'].includes(u)) return 'failed';
                return 'pending';
            };
            const rpNormalized = normalizeRazorpayStatus(result.razorpay_status || result.status);
            return res.status(200).json({
                success: true,
                transaction: {
                    reference_id: result.reference_id ?? transaction.reference_id,
                    type: 'payin',
                    status: rpNormalized,
                    amount: result.amount ?? transaction.amount,
                    utr: rpNormalized === 'success' ? (result.utr || null) : null,
                    message: rpNormalized === 'success'
                        ? 'Transaction processed'
                        : rpNormalized === 'pending' ? 'Transaction is pending' : 'Transaction failed',
                    timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString(),
                }
            });
        }

        // Unknown/legacy gateway (only HDFC, AirPay, Razorpay are live) — no external
        // status API to query. Serve the authoritative status from our own record.
        const localStatus = transaction.status === 'completed' ? 'success'
            : transaction.status === 'failed' ? 'failed'
                : 'pending';
        return res.status(200).json({
            success: true,
            transaction: {
                reference_id: transaction.reference_id,
                type: 'payin',
                status: localStatus,
                amount: transaction.amount,
                utr: transaction.gateway_response?.utr || null,
                message: localStatus === 'success'
                    ? 'Transaction processed'
                    : localStatus === 'pending' ? 'Transaction is pending' : 'Transaction failed',
                timestamp: transaction.updatedAt || transaction.createdAt || new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Admin check payin status error', { error: error.message });
        res.status(500).json({ success: false, message: 'Error checking transaction status' });
    }
};

const resendPayinWebhook = async (req, res) => {
    try {
        const { reference_id } = req.params;
        const transaction = await PayinTransaction.findOne({ reference_id });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        if (transaction.status !== 'completed') {
            return res.status(400).json({ success: false, message: `Transaction is not completed (status: ${transaction.status})` });
        }

        const userId = transaction.user.user_id;
        const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });

        if (!merchantDetails?.payin_callback) {
            return res.status(400).json({ success: false, message: 'No callback URL configured for this merchant' });
        }

        const callbackData = {
            reference_id,
            type: 'payin',
            status: 'success',
            amount: transaction.amount,
            utr: transaction.gateway_response?.utr || null,
            message: 'Transaction processed',
            timestamp: new Date().toISOString()
        };

        // Print the exact payload being POSTed so it's visible in the server terminal / PM2 logs.
        console.log('===== Manual payin webhook resend =====');
        console.log('URL   :', merchantDetails.payin_callback);
        console.log('BODY  :', JSON.stringify(callbackData, null, 2));
        console.log('=======================================');
        logger.info('Manual payin webhook payload', { reference_id, url: merchantDetails.payin_callback, body: callbackData });

        const response = await axios.post(merchantDetails.payin_callback, callbackData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        await PayinTransaction.updateOne(
            { reference_id },
            { $set: { 'metadata.callback_received_at': new Date() } }
        );

        logger.info('Manual webhook resent', { reference_id, status: response.status, admin: req.user?.id });
        // Return the sent payload + target URL so it's also visible in the UI response.
        return res.status(200).json({
            success: true,
            message: 'Webhook resent successfully',
            http_status: response.status,
            callback_url: merchantDetails.payin_callback,
            payload: callbackData
        });
    } catch (error) {
        logger.error('Error resending webhook', { error: error.message, reference_id: req.params.reference_id });
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Manually re-send the payout webhook for a finalized (completed/failed) payout.
// Mirrors resendPayinWebhook — builds the uniform payload and re-POSTs it to the
// merchant's payout_callback without re-querying the gateway.
const resendPayoutWebhook = async (req, res) => {
    try {
        const { reference_id } = req.params;
        const transaction = await PayoutTransaction.findOne({ reference_id });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        if (!['completed', 'failed'].includes(transaction.status)) {
            return res.status(400).json({ success: false, message: `Transaction is not finalized (status: ${transaction.status})` });
        }

        const userId = transaction.user.user_id;
        const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });

        if (!merchantDetails?.payout_callback) {
            return res.status(400).json({ success: false, message: 'No payout callback URL configured for this merchant' });
        }

        const isSuccess = transaction.status === 'completed';
        const callbackData = {
            reference_id,
            type: 'payout',
            status: isSuccess ? 'success' : 'failed',
            amount: transaction.amount,
            utr: transaction.gateway_response?.utr || null,
            message: isSuccess ? 'Transaction processed' : 'Transaction failed',
            timestamp: new Date().toISOString()
        };

        // sendMerchantPayoutCallback already console.logs the body and retries with backoff.
        const delivered = await sendMerchantPayoutCallback(merchantDetails.payout_callback, callbackData);

        logger.info('Manual payout webhook resent', { reference_id, delivered, admin: req.user?.id });
        return res.status(delivered ? 200 : 502).json({
            success: delivered,
            message: delivered ? 'Webhook resent successfully' : 'Failed to deliver webhook after retries',
            callback_url: merchantDetails.payout_callback,
            payload: callbackData
        });
    } catch (error) {
        logger.error('Error resending payout webhook', { error: error.message, reference_id: req.params.reference_id });
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Query the payout gateway for the live status of a transaction, resolving the
// gateway from the TRANSACTION's owner (not the logged-in admin). All gateway
// helpers return a normalized result.data.status of success|failed|pending.
const getLivePayoutStatus = async (transaction) => {
    const userId = transaction.user?.user_id;
    const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });
    const merchantName = merchantDetails?.payout_merchant_name;

    const statusFns = {
        BluSwap: bluswapTransactionStatus,
        MizorPay: mizorpayTransactionStatus,
    };
    const fn = statusFns[merchantName];
    if (!fn) return { supported: false, merchantName: merchantName || null };

    let statusResult;
    try {
        statusResult = await fn(transaction.reference_id);
    } catch (err) {
        logger.error('Gateway payout status check failed', { reference_id: transaction.reference_id, merchant: merchantName, error: err.message });
        return { supported: true, merchantName, derived: 'error', error: err.message };
    }

    const derived = statusResult?.data?.status || 'unknown'; // success | failed | pending | error | unknown
    const gw = statusResult?.data?.response?.data || statusResult?.data?.response || {};
    return {
        supported: true,
        merchantName,
        derived,
        utr: gw.utr || gw.rrn || gw.bank_reference_id || transaction.gateway_response?.utr || null,
        gatewayTransactionId: gw.bluswap_transaction_id || gw.provider_payout_id || gw.payout_order_id || gw.transaction_id || null,
        message: gw.status_description || gw.failure_reason || gw.message || null,
    };
};

// Read-only: report the live gateway status alongside the stored status so the
// admin UI can decide whether an update is needed. Does NOT modify anything.
const adminCheckPayoutStatus = async (req, res) => {
    try {
        const { reference_id } = req.params;
        const transaction = await PayoutTransaction.findOne({ reference_id });
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const live = await getLivePayoutStatus(transaction);
        if (!live.supported) {
            return res.status(400).json({ success: false, message: `Live status check not supported for gateway: ${live.merchantName || 'unknown'}` });
        }

        // Map gateway 'success' to our stored 'completed' for comparison.
        const mappedStatus = live.derived === 'success' ? 'completed'
            : live.derived === 'failed' ? 'failed'
                : live.derived;
        const differs = ['completed', 'failed'].includes(mappedStatus) && mappedStatus !== transaction.status;

        return res.status(200).json({
            success: true,
            reference_id,
            db_status: transaction.status,
            live_status: live.derived,      // success | failed | pending | error | unknown
            mapped_status: mappedStatus,    // completed | failed | pending | ...
            differs,
            utr: live.utr,
            message: live.message,
        });
    } catch (error) {
        logger.error('Admin check payout status error', { error: error.message, reference_id: req.params.reference_id });
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Apply the live gateway status: if terminal and the transaction is still
// pending/processing, finalize it (atomic status change + refund on failure +
// merchant webhook), reusing the same path as the automatic reconciler.
const adminSyncPayoutStatus = async (req, res) => {
    try {
        const { reference_id } = req.params;
        const transaction = await PayoutTransaction.findOne({ reference_id });
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        if (!['pending', 'processing'].includes(transaction.status)) {
            return res.status(400).json({ success: false, message: `Transaction already finalized (status: ${transaction.status})` });
        }

        const live = await getLivePayoutStatus(transaction);
        if (!live.supported) {
            return res.status(400).json({ success: false, message: `Live status check not supported for gateway: ${live.merchantName || 'unknown'}` });
        }
        if (live.derived !== 'success' && live.derived !== 'failed') {
            return res.status(200).json({ success: false, message: `Gateway still reports '${live.derived}' — nothing to update`, live_status: live.derived });
        }

        const result = await finalizePayout({
            referenceId: reference_id,
            isSuccess: live.derived === 'success',
            utr: live.utr,
            gatewayTransactionId: live.gatewayTransactionId,
            message: live.message,
        });

        return res.status(200).json({
            success: !!result?.changed,
            message: result?.changed ? `Transaction updated to ${live.derived}` : (result?.reason || 'No change applied'),
            new_status: live.derived,
            result,
        });
    } catch (error) {
        logger.error('Admin sync payout status error', { error: error.message, reference_id: req.params.reference_id });
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getGatewayStats = async (req, res) => {
    try {
        const { from, to } = req.query;

        const matchStage = {};
        if (from || to) {
            matchStage.createdAt = {};
            if (from) matchStage.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = toDate;
            }
        }

        const stats = await PayinTransaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$metadata.gateway_name',
                    totalRequests: { $sum: 1 },
                    successfulRequests: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    failedRequests: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    },
                    pendingRequests: {
                        $sum: { $cond: [{ $in: ['$status', ['pending', 'payin_qr_generated']] }, 1, 0] }
                    },
                    totalCollection: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
                    },
                    totalAttemptedAmount: { $sum: '$amount' },
                    totalCharges: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$charges.total_charges', 0] }
                    }
                }
            },
            { $sort: { totalCollection: -1 } }
        ]);

        const formatted = stats.map(g => ({
            gateway: g._id || 'Unknown',
            totalRequests: g.totalRequests,
            successfulRequests: g.successfulRequests,
            failedRequests: g.failedRequests,
            pendingRequests: g.pendingRequests,
            successRate: g.totalRequests > 0
                ? parseFloat(((g.successfulRequests / g.totalRequests) * 100).toFixed(2))
                : 0,
            totalCollection: parseFloat(g.totalCollection.toFixed(2)),
            totalAttemptedAmount: parseFloat(g.totalAttemptedAmount.toFixed(2)),
            totalCharges: parseFloat(g.totalCharges.toFixed(2))
        }));

        const overall = {
            totalRequests: formatted.reduce((s, g) => s + g.totalRequests, 0),
            successfulRequests: formatted.reduce((s, g) => s + g.successfulRequests, 0),
            failedRequests: formatted.reduce((s, g) => s + g.failedRequests, 0),
            pendingRequests: formatted.reduce((s, g) => s + g.pendingRequests, 0),
            totalCollection: parseFloat(formatted.reduce((s, g) => s + g.totalCollection, 0).toFixed(2)),
            totalAttemptedAmount: parseFloat(formatted.reduce((s, g) => s + g.totalAttemptedAmount, 0).toFixed(2)),
            totalCharges: parseFloat(formatted.reduce((s, g) => s + g.totalCharges, 0).toFixed(2)),
        };
        overall.successRate = overall.totalRequests > 0
            ? parseFloat(((overall.successfulRequests / overall.totalRequests) * 100).toFixed(2))
            : 0;

        res.status(200).json({ success: true, gateways: formatted, overall });
    } catch (error) {
        logger.error('Error fetching gateway stats', { error: error.message });
        res.status(500).json({ success: false, message: 'Error fetching gateway stats' });
    }
};

// Return the full ordered journey (INITIATED → … → merchant callback) of a
// single transaction, payin or payout, keyed by reference_id. Auto-detects the
// type from whichever transaction record exists and returns a summary alongside
// the ordered events for the dashboard timeline.
const adminGetTransactionTrace = async (req, res) => {
    try {
        const { reference_id } = req.params;

        const [payin, payout, events] = await Promise.all([
            PayinTransaction.findOne({ reference_id }).lean(),
            PayoutTransaction.findOne({ reference_id }).lean(),
            getTransactionTrace(reference_id),
        ]);

        const txn = payin || payout;
        const type = payin ? 'payin' : payout ? 'payout' : (events[0]?.trace_type || null);

        if (!txn && (!events || events.length === 0)) {
            return res.status(404).json({ success: false, message: 'No transaction or trace found for this reference_id' });
        }

        const summary = {
            reference_id,
            type,
            status: txn?.status || null,
            amount: txn?.amount ?? null,
            gateway_name: txn?.metadata?.gateway_name || events.find(e => e.gateway_name)?.gateway_name || null,
            utr: txn?.gateway_response?.utr || null,
            created_at: txn?.createdAt || (events[0]?.ts ?? null),
            updated_at: txn?.updatedAt || (events[events.length - 1]?.ts ?? null),
        };

        return res.status(200).json({
            success: true,
            reference_id,
            type,
            summary,
            event_count: events.length,
            events,
        });
    } catch (error) {
        logger.error('Error fetching transaction trace', { error: error.message, reference_id: req.params.reference_id });
        return res.status(500).json({ success: false, message: 'Error fetching transaction trace', error: error.message });
    }
};

/**
 * Per-user amount-distribution analytics for payin and payout.
 *
 * Reads MongoDB (the dashboard source of truth) and answers "how are this
 * user's transaction amounts distributed?" — most/least used amounts, spread
 * (median/mode/std-dev/percentiles), banded histogram, and the behavioural
 * niches (hour-of-day and weekday cadence, status mix). Amounts are the
 * requested principal (`amount`), not amount+charges, since the question is
 * about the user's ticket-size behaviour.
 *
 * Query params: startDate, endDate (IST calendar dates), status ('all' or a
 * specific transaction status).
 */

// Fixed rupee bands tuned for Indian payment ticket sizes.
const AMOUNT_BANDS = [
    [0, 100], [100, 500], [500, 1000], [1000, 2000], [2000, 5000],
    [5000, 10000], [10000, 25000], [25000, 50000], [50000, 100000], [100000, Infinity],
];

const bandLabel = (lo, hi) => {
    const fmt = (n) => (n >= 100000 ? `${n / 100000}L` : n >= 1000 ? `${n / 1000}k` : `${n}`);
    return hi === Infinity ? `₹${fmt(lo)}+` : `₹${fmt(lo)}–${fmt(hi)}`;
};

// Turn a `$group by amount` result into the full statistical picture. All the
// heavy stats are derived here in JS from the compact per-amount frequency list
// (one row per distinct amount), which keeps the Mongo pipeline cheap.
function summarizeAmounts(byAmount) {
    const rows = (byAmount || [])
        .filter(r => r._id != null)
        .map(r => ({
            amount: r._id,
            count: r.count,
            completed: r.completed || 0,
            volume: r.volume || 0,
        }));

    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const uniqueCount = rows.length;
    const totalVolume = rows.reduce((s, r) => s + r.volume, 0);

    const empty = {
        totalCount: 0, uniqueCount: 0, totalVolume: 0, mean: 0, median: 0, mode: 0,
        stddev: 0, min: 0, max: 0, p25: 0, p75: 0, p90: 0, repeatRatio: 0, avgTicket: 0,
        mostUsed: [], leastUsed: [], distribution: [], histogram: [],
    };
    if (totalCount === 0) return empty;

    const asc = [...rows].sort((a, b) => a.amount - b.amount);
    const mean = totalVolume / totalCount;
    const variance = asc.reduce((s, r) => s + r.count * Math.pow(r.amount - mean, 2), 0) / totalCount;
    const stddev = Math.sqrt(variance);
    const min = asc[0].amount;
    const max = asc[asc.length - 1].amount;

    // Weighted percentile over the frequency table.
    const pct = (p) => {
        const target = (p / 100) * totalCount;
        let cum = 0;
        for (const r of asc) {
            cum += r.count;
            if (cum >= target) return r.amount;
        }
        return max;
    };

    const byCountDesc = [...rows].sort((a, b) => b.count - a.count || b.amount - a.amount);
    const byCountAsc = [...rows].sort((a, b) => a.count - b.count || a.amount - b.amount);

    const histogram = AMOUNT_BANDS.map(([lo, hi]) => {
        const band = rows.filter(r => r.amount >= lo && r.amount < hi);
        return {
            label: bandLabel(lo, hi),
            min: lo,
            max: hi === Infinity ? null : hi,
            count: band.reduce((s, r) => s + r.count, 0),
            volume: band.reduce((s, r) => s + r.volume, 0),
        };
    }).filter(b => b.count > 0);

    return {
        totalCount,
        uniqueCount,
        totalVolume,
        mean,
        avgTicket: mean,
        median: pct(50),
        mode: byCountDesc[0].amount,
        stddev,
        min,
        max,
        p25: pct(25),
        p75: pct(75),
        p90: pct(90),
        // Share of transactions that reuse an already-seen amount — a high value
        // means the user transacts in a few repeated ticket sizes.
        repeatRatio: (totalCount - uniqueCount) / totalCount,
        mostUsed: byCountDesc.slice(0, 12),
        leastUsed: byCountAsc.slice(0, 12),
        // Top distinct amounts by frequency, for the frequency bar chart.
        distribution: byCountDesc.slice(0, 25),
        histogram,
    };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Run the single faceted aggregation for one collection and shape the result.
async function buildAmountAnalytics(Model, match) {
    const [facet] = await Model.aggregate([
        { $match: match },
        {
            $facet: {
                byAmount: [
                    {
                        $group: {
                            _id: '$amount',
                            count: { $sum: 1 },
                            volume: { $sum: '$amount' },
                            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                        },
                    },
                ],
                byStatus: [
                    { $group: { _id: '$status', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
                ],
                byHour: [
                    {
                        $group: {
                            _id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
                            count: { $sum: 1 },
                            volume: { $sum: '$amount' },
                        },
                    },
                ],
                byDow: [
                    {
                        $group: {
                            _id: { $dayOfWeek: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
                            count: { $sum: 1 },
                            volume: { $sum: '$amount' },
                        },
                    },
                ],
            },
        },
    ]);

    const stats = summarizeAmounts(facet?.byAmount);

    const statusBreakdown = (facet?.byStatus || []).map(s => ({
        status: s._id || 'unknown',
        count: s.count,
        volume: s.volume || 0,
    })).sort((a, b) => b.count - a.count);

    // Fill every hour 0–23 so the cadence chart has no gaps.
    const hourMap = new Map((facet?.byHour || []).map(h => [h._id, h]));
    const hourly = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        count: hourMap.get(h)?.count || 0,
        volume: hourMap.get(h)?.volume || 0,
    }));

    // $dayOfWeek is 1 (Sunday) … 7 (Saturday).
    const dowMap = new Map((facet?.byDow || []).map(d => [d._id, d]));
    const weekday = WEEKDAY_LABELS.map((label, i) => ({
        weekday: label,
        count: dowMap.get(i + 1)?.count || 0,
        volume: dowMap.get(i + 1)?.volume || 0,
    }));

    return { ...stats, statusBreakdown, hourly, weekday };
}

const getUserAmountAnalytics = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, status } = req.query;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const match = { 'user.user_id': String(userId) };
        const dateRange = istCreatedAtRange(startDate, endDate);
        if (Object.keys(dateRange).length) match.createdAt = dateRange;
        if (status && status !== 'all') match.status = status;

        const [payin, payout] = await Promise.all([
            buildAmountAnalytics(PayinTransaction, match),
            buildAmountAnalytics(PayoutTransaction, match),
        ]);

        return res.json({
            success: true,
            data: {
                user: { id: user.id, name: user.name, user_name: user.user_name },
                filters: { startDate: startDate || null, endDate: endDate || null, status: status || 'all' },
                payin,
                payout,
            },
        });
    } catch (error) {
        logger.error('Error building user amount analytics', { error: error.message, userId: req.params.userId });
        return res.status(500).json({ success: false, message: 'Error building user amount analytics', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    getAllAgents,
    getUserDetails,
    getAgentDetails,
    getAgentUsers,
    addOrUpdateMerchantDetails,
    getUserMerchantDetails,
    addMerchantCharges,
    updateMerchantCharges,
    getUserMerchantCharges,
    updateUserMerchantCharges,
    updateMerchantCharge,
    updateUserDetails,
    toggleTestRandomBeneficiary,
    togglePayoutAlert,
    getUserCallbacks,
    getUserPayoutGatewayStats,
    updateUserWallet,
    getUserWallet,
    getUserRollingReserve,
    updateUserRollingReserve,
    getUserIPs,
    addUserIP,
    removeUserIP,
    getPlatformCharges,
    addPlatformCharge,
    removePlatformCharge,
    deleteMerchantCharge,
    updateUserPayinCallback,
    updateUserPayoutCallback,
    getAdminDashboard,
    getWalletTransactions,
    settleAmount,
    getSettlementHistory,
    getSettlementDashboard,
    getManageFundRequest,
    updateManageFundRequest,
    getChargeback,
    handleChargebackAction,
    getPayoutTransactions,
    getPayinTransactions,
    getPayinCollectionSummary,
    getPayinTransactionsDownload,
    getPayoutTransactionsDownload,
    getWalletTransactionsDownload,
    getUsersForDropdown,
    makePayoutFailed,
    getTrashTransactionCount,
    deleteTrashTransactions,
    getUserWalletTransactionHistory,
    getPayoutFailedHistory,
    downloadPayoutFailedHistory,
    getLastNDaysTransactionDetails,
    invalidateLast5DaysCache,
    adminCheckPayinStatus,
    getGatewayStats,
    resendPayinWebhook,
    resendPayoutWebhook,
    adminCheckPayoutStatus,
    adminSyncPayoutStatus,
    adminGetTransactionTrace,
    getUserAmountAnalytics
};
