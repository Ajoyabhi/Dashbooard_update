const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserWalletReports,
  getUserPayinReports,
  getUserPayoutReports
} = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require user authentication
router.use(auth, authorize('payin_payout', 'staff', 'agent', 'payout_only', 'payin_only'));

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// User wallet , payin , payout routes reports
router.get('/wallet_reports', getUserWalletReports);
router.get('/payin_reports', getUserPayinReports);
router.get('/payout_reports', getUserPayoutReports);

module.exports = router; 