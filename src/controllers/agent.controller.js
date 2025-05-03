const { User, UserStatus, FinancialDetails, MerchantDetails,MerchantCharges } = require('../models');
const { Op } = require('sequelize');

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

module.exports = {
    getRegisteredUsers,
    getUserDetails,
    registerUser,
    getUserCharges,
    updateUserCharges,
    getUserCallbacks,
    updateUserCallbacks
}; 