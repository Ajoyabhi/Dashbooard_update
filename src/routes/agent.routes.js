const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/agent.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require agent authentication
router.use(auth, authorize('agent'));

// dashboard routes
router.get('/dashboard', getDashboardData);

// User management routes
router.get('/users', getRegisteredUsers);
router.get('/users/:userId', getUserDetails);

router.post('/users-register', registerUser);
router.get('/users/:userId/charges', getUserCharges);
router.put('/users/:userId/charges', updateUserCharges);

// User callbacks routes
router.get('/users/:userId/callbacks', getUserCallbacks);
router.put('/users/:userId/callbacks', updateUserCallbacks);

// wallet report routes
router.get('/wallet-reports', getWalletReports);

// payin report routes
router.get('/payin-reports', getPayinReports);

// payout report routes
router.get('/payout-reports', getPayoutReports);

module.exports = router; 