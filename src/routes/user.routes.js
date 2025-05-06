const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  createFundRequest,
  getUserFundRequests
} = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validateRequest');

// All routes require user authentication
router.use(auth, authorize('user','payin_payout'));

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Fund Request Routes
router.post(
  '/fund-request',
  [
    body('settlement_wallet').isNumeric().withMessage('Settlement wallet must be a number'),
    body('reference_id').notEmpty().withMessage('Reference ID is required'),
    body('from_bank').notEmpty().withMessage('From bank is required'),
    body('to_bank').notEmpty().withMessage('To bank is required'),
    body('payment_type').isIn(['NEFT', 'RTGS', 'IMPS']).withMessage('Invalid payment type'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  validateRequest,
  createFundRequest
);

// Get user's fund requests
router.get('/fund-requests', getUserFundRequests);

module.exports = router; 