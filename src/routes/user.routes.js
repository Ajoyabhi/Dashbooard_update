const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserWalletReports,
  getUserPayinReports,
  getUserPayoutReports,
  getUserFundRequests,
  createFundRequest,
  getUserDashboard,
  getUserSettlementReport,
  getUserWalletTransactionHistory
} = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require user authentication
router.use(auth, authorize('payin_payout', 'staff', 'agent', 'payout_only', 'payin_only'));

//dashboard
router.get('/dashboard', getUserDashboard);

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// User wallet , payin , payout routes reports
router.get('/wallet_reports', getUserWalletReports);
router.get('/payin_reports', getUserPayinReports);
router.get('/payout_reports', getUserPayoutReports);

// User wallet transaction history
router.get('/wallet_transaction_history', getUserWalletTransactionHistory);

// User fund request routes
router.get('/fund-requests', getUserFundRequests);
router.post('/fund-request', createFundRequest);

router.get('/settlement-report', getUserSettlementReport);


module.exports = router; 