const express = require('express');
const router = express.Router();
const { cacheMiddleware } = require('../middleware/cache.middleware');
const {
  getUserProfile,
  updateUserProfile,
  getUserWalletReports,
  getUserPayinReports,
  downloadUserPayinReports,
  getUserPayoutReports,
  downloadUserPayoutReports,
  getUserFundRequests,
  createFundRequest,
  getUserDashboard,
  getLastNDaysTransactions,
  getUserSettlementReport,
  getUserWalletTransactionHistory,
  getUserPayoutFailedHistory,
  downloadSettlementReport,
  downloadPayoutFailedHistory
} = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require user authentication
router.use(auth, authorize('payin_payout', 'staff', 'agent', 'payout_only', 'payin_only'));

//dashboard
router.get('/dashboard',
  cacheMiddleware({
    ttl: 60, // 1 minute cache for dashboard data
    keyPrefix: 'user:dashboard:',
    generateKey: (req) => {
      // Uniform cache key based on user ID only (no days parameter)
      const userId = req.user.id;
      return `user:dashboard:${userId}:v2`;
    }
  }),
  getUserDashboard
);

// Apply cache with 5 minutes TTL for last N days transactions
router.get('/lastNdays-transactions',
  cacheMiddleware({
    ttl: 300, // 5 minutes cache
    keyPrefix: 'user:lastNdays:',
    generateKey: (req) => {
      // Include days parameter in cache key to differentiate between different day requests
      const userId = req.user.id;
      const days = req.query.days || '5'; // Default to 5 if not specified
      return `user:lastNdays:${userId}:${days}:v2`;
    }
  }),
  getLastNDaysTransactions
);

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// User wallet , payin , payout routes reports
router.get('/wallet_reports', getUserWalletReports);
router.get('/payin_reports', getUserPayinReports);
router.get('/payin_reports/download', downloadUserPayinReports);
router.get('/payout_reports', getUserPayoutReports);
router.get('/payout_reports/download', downloadUserPayoutReports);

// User wallet transaction history
router.get('/wallet_transaction_history', getUserWalletTransactionHistory);

router.get('/payout_failed_history', getUserPayoutFailedHistory);
router.get('/payout_failed_history/download', downloadPayoutFailedHistory);
router.get('/settlement_report', getUserSettlementReport);

// User fund request routes
router.get('/fund-requests', getUserFundRequests);
router.post('/fund-request', createFundRequest);

router.get('/settlement-report', getUserSettlementReport);
router.get('/settlement-report/download', downloadSettlementReport);


module.exports = router; 