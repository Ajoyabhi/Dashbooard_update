const express = require('express');
const router = express.Router();
const { cacheMiddleware } = require('../middleware/cache.middleware');
const {
  getAllUsers,
  getAllAgents,
  getUserDetails,
  getAgentDetails,
  getAgentUsers,
  addOrUpdateMerchantDetails,
  getUserMerchantDetails,
  addMerchantCharges,
  updateMerchantCharges,
  getUserMerchantCharges,
  updateUserMerchantCharges,
  updateMerchantCharge,
  updateUserDetails,
  getUserCallbacks,
  updateUserWallet,
  getUserWallet,
  getUserWalletTransactionHistory,
  getUserIPs,
  addUserIP,
  removeUserIP,
  getPlatformCharges,
  addPlatformCharge,
  removePlatformCharge,
  deleteMerchantCharge,
  updateUserPayinCallback,
  updateUserPayoutCallback,
  getAdminDashboard,
  getWalletTransactions,
  settleAmount,
  getSettlementHistory,
  getSettlementDashboard,
  getManageFundRequest,
  updateManageFundRequest,
  getChargeback,
  handleChargebackAction,
  getPayoutTransactions,
  getPayinTransactions,
  getPayinTransactionsDownload,
  getPayoutTransactionsDownload,
  getWalletTransactionsDownload,
  getUsersForDropdown,
  makePayoutFailed,
  getTrashTransactionCount,
  deleteTrashTransactions,
  getPayoutFailedHistory,
  downloadPayoutFailedHistory,
  getLastNDaysTransactionDetails,
  adminCheckPayinStatus,
  getGatewayStats,
  resendPayinWebhook
} = require('../controllers/admin.controller');
const { registerUser } = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(auth, authorize('admin'));

// User management routes
// router.use('/user')
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId', updateUserDetails);
router.post('/users/register', registerUser);

// Agent management routes
router.get('/agents', getAllAgents);
router.get('/agents/:agentId', getAgentDetails);
router.get('/agents/:agentId/users', getAgentUsers);

// Merchant Details Management
router.post('/users/:user_id/merchant-details', addOrUpdateMerchantDetails);
router.get('/users/:user_id/merchant-details', getUserMerchantDetails);

// Merchant Charges Management
router.post('/merchant-charges', addMerchantCharges);
router.put('/merchant-charges/:id', updateMerchantCharges);
router.get('/users/:user_id/merchant-charges', getUserMerchantCharges);
router.post('/users/:user_id/merchant-charges', updateUserMerchantCharges);
router.put('/users/:user_id/merchant-charges/:charge_id', updateMerchantCharge);
router.delete('/users/:user_id/merchant-charges/:charge_id', deleteMerchantCharge);

// User Callbacks Management
router.get('/users/:userId/callback', getUserCallbacks);
router.post('/users/:userId/callback/payin', updateUserPayinCallback);
router.post('/users/:userId/callback/payout', updateUserPayoutCallback);


// User Wallet Management
router.get('/users/:userId/wallet', getUserWallet);
router.post('/users/:userId/wallet', updateUserWallet);
router.get('/users/:userId/wallet/transactions', getUserWalletTransactionHistory);

// User IP Management
router.get('/users/:user_id/ips', getUserIPs);
router.post('/users/:user_id/ips', addUserIP);
router.delete('/users/:user_id/ips/:ip_id', removeUserIP);

// Platform Charges Management
router.get('/platform-charges', getPlatformCharges);
router.post('/platform-charges', addPlatformCharge);
router.delete('/platform-charges/:charge_id', removePlatformCharge);

// admin dashboard routes
router.get('/dashboard',
  cacheMiddleware({
    ttl: 60, // 1 minute cache for admin dashboard data (fresher than user dashboard)
    keyPrefix: 'admin:dashboard:',
    generateKey: (req) => {
      // Cache key for admin dashboard (same for all admins since it's global data)
      return 'admin:dashboard:global';
    }
  }),
  getAdminDashboard
);

// Apply cache with 5 minutes TTL for last 5 days transactions
router.get('/lastNdays-transactions',
  cacheMiddleware({
    ttl: 300, // 5 minutes cache
    keyPrefix: 'lastNdays:',
    generateKey: (req) => {
      // Cache key based on days parameter
      const days = req.query.days || '5';
      return `lastNdays:transactions:${days}`;
    }
  }),
  getLastNDaysTransactionDetails
);


// Wallet transactions route with pagination
router.get('/wallet-transactions', getWalletTransactions);

router.get('/payout-transactions', getPayoutTransactions);

router.get('/payin-transactions', getPayinTransactions);
router.get('/payin-transactions/:reference_id/check-status', adminCheckPayinStatus);

// payout , payin, wallet transaction report downlaod route
router.get('/payin-transactions/download', getPayinTransactionsDownload);
router.get('/payout-transactions/download', getPayoutTransactionsDownload);
router.get('/wallet-transactions/download', getWalletTransactionsDownload);

// Users for dropdown
router.get('/users-dropdown', getUsersForDropdown);

// Settlement management routes
router.post('/settle-amount', settleAmount);
router.get('/settlement-history/:userId', getSettlementHistory);
router.get('/settlement-dashboard', getSettlementDashboard);

// manage fund request routes
router.get('/manage-fund-request', getManageFundRequest);
// router.post('/manage-fund-request', addManageFundRequest);
router.post('/manage-fund-request/:id', updateManageFundRequest);

// chargeback routes
router.get('/chargeback', getChargeback);
router.post('/chargeback/:id/:action', handleChargebackAction);

// Make payout failed route
router.post('/make-payout-failed', makePayoutFailed);

// Payout failed history route
router.get('/payout-failed-history', getPayoutFailedHistory);
router.get('/payout-failed-history/download', downloadPayoutFailedHistory);

// Trash transaction management routes
router.get('/trash-transactions/count', getTrashTransactionCount);
router.delete('/trash-transactions/delete', deleteTrashTransactions);

// Gateway stats
router.get('/gateway-stats', getGatewayStats);

// Manual webhook resend for stuck completed transactions
router.post('/payin/:reference_id/resend-webhook', resendPayinWebhook);

// Callback queue health
router.get('/queue/health', async (req, res) => {
  try {
    const { callbackQueue } = require('../config/queue.config');
    const [counts, failed, active, waiting] = await Promise.all([
      callbackQueue.getJobCounts(),
      callbackQueue.getFailed(0, 10),
      callbackQueue.getActive(),
      callbackQueue.getWaiting(0, 5),
    ]);
    res.json({
      success: true,
      counts,
      active: active.map(j => ({ id: j.id, reference_id: j.data?.apitxnid, attempts: j.attemptsMade, since: new Date(j.processedOn).toISOString() })),
      waiting: waiting.map(j => ({ id: j.id, reference_id: j.data?.apitxnid, queued_at: new Date(j.timestamp).toISOString() })),
      last10Failed: failed.map(j => ({
        id: j.id,
        reference_id: j.data?.apitxnid,
        attempts: j.attemptsMade,
        reason: j.failedReason,
        failed_at: new Date(j.finishedOn).toISOString(),
        data: j.data,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 