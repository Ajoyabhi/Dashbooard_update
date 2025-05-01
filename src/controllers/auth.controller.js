const jwt = require('jsonwebtoken');
const { User, UserStatus, MerchantDetails } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const login = async (req, res) => {
    try {
        const { user_name, password } = req.body;

        // Find user in MySQL database
        const user = await User.findOne({ 
            where: { user_name },
            include: [
                { model: UserStatus },
                { model: MerchantDetails }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            user: {
                id: user.id,
                name: user.name,
                user_name: user.user_name,
                email: user.email,
                user_type: user.user_type,
                status: user.UserStatus,
                merchant_details: user.MerchantDetails
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

const registerUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            user_name,
            password,
            email,
            mobile,
            company_name,
            business_type,
            user_type
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ user_name }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // If the current user is an agent, set the agent_id to their ID
        const agent_id = req.user?.user_type === 'agent' ? req.user.id : null;

        // Create user
        const user = await User.create({
            name,
            user_name,
            password,
            email,
            mobile,
            company_name,
            business_type,
            user_type,
            agent_id,
            created_by: req.user?.id || null
        });

        // Create user status   
        await UserStatus.create({
            user_id: user.id
        });

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                user_name: user.user_name,
                email: user.email,
                user_type: user.user_type
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

module.exports = {
    login,
    registerUser
}; 