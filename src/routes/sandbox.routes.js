const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const {
  sandboxPayin,
  sandboxPayout,
  getSandboxPayinStatus,
  getSandboxPayoutStatus,
  simulateOutcome,
  resendCallback,
  listTransactions
} = require('../controllers/sandbox.controller');

// API Playground sandbox. No gateway calls, no balance changes, separate
// collection — see controllers/sandbox.controller.js.
router.use(auth, checkRole(['admin', 'agent', 'user', 'payin_payout', 'payout_only', 'payin_only']));

router.post('/payin', sandboxPayin);
router.post('/payout', sandboxPayout);
router.get('/payin/transaction/:reference_id', getSandboxPayinStatus);
router.get('/payout/transaction/:reference_id', getSandboxPayoutStatus);
router.get('/transactions', listTransactions);

const typeParam = (req, res, next) =>
  (['payin', 'payout'].includes(req.params.type) ? next() : res.status(404).json({ success: false, message: 'Route not found' }));
router.post('/:type/:reference_id/simulate', typeParam, simulateOutcome);
router.post('/:type/:reference_id/callback', typeParam, resendCallback);

module.exports = router;
