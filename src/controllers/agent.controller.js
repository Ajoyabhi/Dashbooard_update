const { User, UserStatus } = require('../models');
const { Op } = require('sequelize');

const getRegisteredUsers = async (req, res) => {
    try {
        const agentId = req.user.id;

        // Get all users registered by this agent
        const users = await User.findAll({
            where: { created_by: agentId },
            include: [
                { model: UserStatus }
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
                agent_id: agentId
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

module.exports = {
    getRegisteredUsers,
    getUserDetails
}; 