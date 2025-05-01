const User = require('../models/User');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get all users registered by this agent
        const users = await User.findAll({
            where: { agent_id: agentId },
            attributes: { exclude: ['password'] }
        });

        // Get total count of users
        const totalUsers = users.length;

        // Get active users count
        const activeUsers = users.filter(user => user.status).length;

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
        res.status(500).json({ error: 'Error fetching dashboard data' });
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
                agent_id: agentId
            },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user details' });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        const agentId = req.user.id;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                agent_id: agentId
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user status
        await user.update({ status });

        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating user status' });
    }
};

const getTransactionHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const agentId = req.user.id;

        // Verify that the user belongs to this agent
        const user = await User.findOne({
            where: {
                id: userId,
                agent_id: agentId
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get transaction history for the user
        // This will be implemented when we create the transaction model
        res.json({ message: 'Transaction history will be implemented' });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transaction history' });
    }
};

module.exports = {
    getDashboard,
    getUserDetails,
    updateUserStatus,
    getTransactionHistory
}; 