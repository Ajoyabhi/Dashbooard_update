const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { initiatePayment, getTransactionStatus, handleUnpayCallback } = require('../controllers/payment.controller');
const { initiatePayout } = require('../controllers/payment.payout');

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
router.get('/transaction/:transaction_id', 
  auth,
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']), 
  getTransactionStatus
);

// Unpay callback route - no authentication needed as it's called by Unpay
router.post('/unpay/callback', handleUnpayCallback);

module.exports = router; 