const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { initiatePayment, getTransactionStatus, handleUnpayCallback, handleSpayCallback,
  handleSpayPayoutCallback, handlePhilpayPayoutCallback, handleBluswapPayoutCallback, hdfcCallback, airpayCallback } = require('../controllers/payment.controller');
const { initiatePayout , getPayoutTransactionStatus, handleBalanceCheck, reconcilePayoutByReference, reconcileProcessingPayouts } = require('../controllers/payment.payout');


// Initiate payout - Only admin and agent can initiate payouts
router.post('/payout', 
  auth,
  checkRole(['admin', 'agent', 'payin_payout', 'payout_only', 'payin_only']), 
  initiatePayout
);

// Initiate payment - All authenticated users can initiate payments
router.post('/payin', 
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']), 
  initiatePayment
);

// Get transaction status - Users can only view their own transactions
router.get('/payin/transaction/:transaction_id', 
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']), 
  getTransactionStatus
);


// Get transaction status - payout
router.get('/payout/transaction/:transaction_id',
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']),
  getPayoutTransactionStatus
);

// Reconcile all stuck 'processing' payouts against the gateway status API (admin/agent maintenance)
router.post('/payout/reconcile',
  auth,
  checkRole(['admin', 'agent']),
  reconcileProcessingPayouts
);

// Reconcile a single payout by reference_id against the gateway status API
router.post('/payout/reconcile/:reference_id',
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']),
  reconcilePayoutByReference
);

// router.get
// Unpay callback route - no authentication needed as it's called by Unpay
router.get('/unpay/callback', handleUnpayCallback);
router.post('/unpay/callback', handleUnpayCallback);

// Spay callback route - no authentication needed as it's called by Spay
router.get('/spay/callback', handleSpayCallback);
router.post('/spay/callback', handleSpayCallback);

// Spay payout callback route - no authentication needed as it's called by Spay
router.get('/spay/payout/callback', handleSpayPayoutCallback);
router.post('/spay/payout/callback', handleSpayPayoutCallback);

// Philpay callback route - no authentication needed as it's called by Philpay
router.get('/philpay/payout/callback', handlePhilpayPayoutCallback);
router.post('/philpay/payout/callback', handlePhilpayPayoutCallback);

// BluSwap callback route - no authentication needed as it's called by BluSwap
router.get('/bluswap/payout/callback', handleBluswapPayoutCallback);
router.post('/bluswap/payout/callback', handleBluswapPayoutCallback);

// HDFC callback — called by ecommerce after HDFC notifies payment result
router.post('/hdfc/callback', hdfcCallback);

// AirPay callback — called by anpamart backend after AirPay IPN is verified
// registered at both paths: the doc-specified /rp/callback and the explicit /airpay/callback
router.post('/airpay/callback', airpayCallback);
router.post('/rp/callback', airpayCallback);

router.get('/balanceCheck',
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']),
  handleBalanceCheck
);

// ---------------------------------------------------------------------------
// Internal test webhook sink. Set a merchant's payin/payout callback URL to
// this endpoint to inspect exactly what the system delivers to merchants.
// It does nothing except log the received payload and reply 200 OK.
// No auth — it must be reachable by the callback worker like a real merchant URL.
// ---------------------------------------------------------------------------
const logTestWebhook = (req, res) => {
  console.log('=================================================================');
  console.log('>>> This is the data transferred to the merchant (TEST webhook) <<<');
  console.log('Method :', req.method);
  console.log('Query  :', JSON.stringify(req.query || {}));
  console.log('Body   :', JSON.stringify(req.body || {}, null, 2));
  console.log('=================================================================');
  return res.status(200).json({ received: true });
};
router.post('/test-webhook', logTestWebhook);
router.get('/test-webhook', logTestWebhook);

module.exports = router;