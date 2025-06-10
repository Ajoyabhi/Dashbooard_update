const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { initiatePayment, getTransactionStatus, handleUnpayCallback, handleSpayCallback } = require('../controllers/payment.controller');
const { initiatePayout , getPayoutTransactionStatus} = require('../controllers/payment.payout');

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

// Unpay callback route - no authentication needed as it's called by Unpay
router.get('/unpay/callback', handleUnpayCallback);
router.post('/unpay/callback', handleUnpayCallback);

// Spay callback route - no authentication needed as it's called by Spay
router.get('/spay/callback', handleSpayCallback);
router.post('/spay/callback', handleSpayCallback);

module.exports = router; 