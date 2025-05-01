const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile
} = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// All routes require user authentication
router.use(auth, authorize('user'));

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

module.exports = router; 