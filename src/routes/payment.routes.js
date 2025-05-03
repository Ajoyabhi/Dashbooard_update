const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const { initiatePayment, getTransactionStatus } = require('../controllers/payment.controller');
const { initiatePayout } = require('../controllers/payment.payout');

// Apply authentication middleware to all routes
router.use(auth);

// Initiate payout - Only admin and agent can initiate payouts
router.post('/payout', 
  checkRole(['admin', 'agent', 'payin_payout', 'payout_only', 'payin_only']), 
  initiatePayout
);

// Initiate payment - All authenticated users can initiate payments
router.post('/payin', 
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']), 
  initiatePayment
);

// Get transaction status - Users can only view their own transactions
router.get('/transaction/:transaction_id', 
  checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']), 
  getTransactionStatus
);

module.exports = router; 