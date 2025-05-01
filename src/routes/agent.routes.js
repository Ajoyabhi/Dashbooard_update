const express = require('express');
const router = express.Router();
const {
  getRegisteredUsers,
  getUserDetails
} = require('../controllers/agent.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require agent authentication
router.use(auth, authorize('agent'));

// User management routes
router.get('/users', getRegisteredUsers);
router.get('/users/:userId', getUserDetails);

module.exports = router; 