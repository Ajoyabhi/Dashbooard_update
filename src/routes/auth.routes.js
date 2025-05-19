const express = require('express');
const router = express.Router();
const { login, registerUser, forgotPassword, changePassword, getProfile } = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// Public routes
router.post('/login', login);
router.post('/register', registerUser);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.post('/change-password', auth, changePassword);
router.get('/profile', auth, getProfile);

module.exports = router; 