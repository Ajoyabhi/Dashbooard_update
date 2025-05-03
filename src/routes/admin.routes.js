const express = require('express');
const router = express.Router();
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
  updateManageFundRequest
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

// User IP Management
router.get('/users/:user_id/ips', getUserIPs);
router.post('/users/:user_id/ips', addUserIP);
router.delete('/users/:user_id/ips/:ip_id', removeUserIP);

// Platform Charges Management
router.get('/platform-charges', getPlatformCharges);
router.post('/platform-charges', addPlatformCharge);
router.delete('/platform-charges/:charge_id', removePlatformCharge);

// admin dashboard routes
router.get('/dashboard', getAdminDashboard);


// Wallet transactions route with pagination
router.get('/wallet-transactions', getWalletTransactions);

// Settlement management routes
router.post('/settle-amount', settleAmount);
router.get('/settlement-history/:userId', getSettlementHistory);
router.get('/settlement-dashboard', getSettlementDashboard);

// manage fund request routes
router.get('/manage-fund-request', getManageFundRequest);
// router.post('/manage-fund-request', addManageFundRequest);
router.post('/manage-fund-request/:id', updateManageFundRequest);

module.exports = router; 