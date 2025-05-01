const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getUserProfile,
  getAgentProfile,
  updateUserProfile,
  updateAgentProfile
} = require('../controllers/dashboard.controller');
const { auth, authorize, checkAgentAccess } = require('../middleware/auth.middleware');

// Dashboard data route - accessible by all authenticated users
router.get('/', auth, getDashboardData);

// User profile routes
router.get('/user/:userId', auth, authorize('admin', 'agent'), checkAgentAccess, getUserProfile);
router.put('/user/profile', auth, authorize('user'), updateUserProfile);

// Agent profile routes
router.get('/agent/:agentId', auth, authorize('admin'), getAgentProfile);
router.put('/agent/profile', auth, authorize('agent'), updateAgentProfile);

module.exports = router; 