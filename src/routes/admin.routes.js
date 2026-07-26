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
  toggleTestRandomBeneficiary,
  getUserCallbacks,
  updateUserWallet,
  getUserWallet,
  getUserRollingReserve,
  updateUserRollingReserve,
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
  getPayinCollectionSummary,
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
  resendPayinWebhook,
  resendPayoutWebhook,
  adminCheckPayoutStatus,
  adminSyncPayoutStatus
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
router.patch('/users/:userId/test-beneficiary', toggleTestRandomBeneficiary);
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

// User Rolling Reserve Management
router.get('/users/:userId/rolling-reserve', getUserRollingReserve);
router.post('/users/:userId/rolling-reserve', updateUserRollingReserve);

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
router.get('/payin-transactions/summary', getPayinCollectionSummary);
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
router.post('/payout/:reference_id/resend-webhook', resendPayoutWebhook);

// Per-transaction payout status: check live gateway status (read-only) and sync/apply it
router.get('/payout-transactions/:reference_id/check-status', adminCheckPayoutStatus);
router.post('/payout-transactions/:reference_id/sync-status', adminSyncPayoutStatus);

// Callback queue health
router.get('/queue/health', async (req, res) => {
  try {
    const { callbackQueue, philpayPayoutQueue, bluswapPayoutQueue } = require('../config/queue.config');

    // Bull requires an explicit range for getFailed; cap it so a huge backlog can't blow up the request.
    const MAX_FAILED_TO_SCAN = 2000;

    const describeQueue = async (queue, getRef) => {
      const counts = await queue.getJobCounts();
      const [allFailed, active, waiting] = await Promise.all([
        queue.getFailed(0, Math.min(counts.failed || 0, MAX_FAILED_TO_SCAN)),
        queue.getActive(),
        queue.getWaiting(0, 5),
      ]);

      const uniqueFailedReferenceIds = new Set(allFailed.map(j => getRef(j.data)).filter(Boolean)).size;

      return {
        counts,
        uniqueFailedReferenceIds,
        active: active.map(j => ({ id: j.id, reference_id: getRef(j.data), attempts: j.attemptsMade, since: j.processedOn ? new Date(j.processedOn).toISOString() : null })),
        waiting: waiting.map(j => ({ id: j.id, reference_id: getRef(j.data), queued_at: new Date(j.timestamp).toISOString() })),
        last10Failed: allFailed.slice(0, 10).map(j => ({
          id: j.id,
          reference_id: getRef(j.data),
          attempts: j.attemptsMade,
          reason: j.failedReason,
          failed_at: j.finishedOn ? new Date(j.finishedOn).toISOString() : null,
          data: j.data,
        })),
      };
    };

    const [payin, philpayPayout, bluswapPayout] = await Promise.all([
      describeQueue(callbackQueue, 'apitxnid'),
      describeQueue(philpayPayoutQueue, (data) => data?.data?.object?.merchant_order_id),
      describeQueue(bluswapPayoutQueue, (data) => data?.data?.order_id),
    ]);

    res.json({
      success: true,
      note: 'Each queue accumulates failed jobs forever (removeOnFail: false) and the same transaction can be queued multiple times if the upstream gateway sends duplicate callbacks — counts.failed is a lifetime total of jobs, not distinct transactions. Use uniqueFailedReferenceIds for the deduplicated count.',
      queues: {
        payin,
        philpayPayout,
        bluswapPayout,
      },
      // Backward-compatible top-level fields mirroring the payin queue (previous shape of this endpoint)
      counts: payin.counts,
      active: payin.active,
      waiting: payin.waiting,
      last10Failed: payin.last10Failed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; 