const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const {
    getDashboard,
    getUserDetails,
    updateUserStatus,
    getTransactionHistory
} = require('../controllers/agentController');

// All routes require authentication and agent role
router.use(auth);
router.use(checkRole(['agent']));

// Dashboard routes
router.get('/dashboard', getDashboard);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/users/:userId/transactions', getTransactionHistory);

module.exports = router; 