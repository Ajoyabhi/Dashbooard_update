const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const register = async (req, res) => {
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
            user_type,
            agent_id
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
        res.status(500).json({ error: 'Error creating user' });
    }
};

const login = async (req, res) => {
    try {
        const { user_name, password } = req.body;
        console.log("user_name",user_name);
        // Find user
        const user = await User.findOne({ where: { user_name } });
        if (!user) {
            return res.status(401).json({ error: 'user not found' });
        }

        // Validate password
        console.log("password",password);
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
                user_type: user.user_type
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
};

module.exports = {
    register,
    login,
    getProfile
}; 