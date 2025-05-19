const jwt = require('jsonwebtoken');
const { User, UserStatus, MerchantDetails } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require("dotenv").config();

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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        // Save reset token to user
        await user.update({
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry
        });

        // Log email configuration (without sensitive data)
        console.log('Attempting to send email with configuration:', {
            service: 'sendgrid',
            from: process.env.SENDGRID_FROM_EMAIL,
            hasApiKey: !!process.env.SENDGRID_API_KEY
        });

        // Create email transporter with SendGrid configuration
        const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });

        // Verify SMTP connection configuration
        try {
            await transporter.verify();
            console.log('SMTP connection verified successfully');
        } catch (error) {
            console.error('SMTP Connection Error Details:', {
                code: error.code,
                command: error.command,
                responseCode: error.responseCode,
                response: error.response,
                stack: error.stack
            });

            if (error.code === 'EAUTH') {
                return res.status(500).json({ 
                    error: 'SendGrid authentication failed. Please check your API key.'
                });
            }
            return res.status(500).json({ error: 'Email service configuration error' });
        }

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: process.env.SENDGRID_FROM_EMAIL,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <p>You requested a password reset</p>
                <p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully to:', user.email);
        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        if (error.code === 'EAUTH') {
            return res.status(500).json({ 
                error: 'SendGrid authentication failed. Please check your API key.'
            });
        }
        res.status(500).json({ error: 'Error processing password reset request' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate current password
        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        await user.update({ password: newPassword });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Error changing password' });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: UserStatus },
                { model: MerchantDetails }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Error fetching profile' });
    }
};

module.exports = {
    login,
    registerUser,
    forgotPassword,
    changePassword,
    getProfile
}; 