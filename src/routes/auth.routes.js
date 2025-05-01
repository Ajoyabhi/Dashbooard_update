const express = require('express');
const router = express.Router();
const { login, registerUser } = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

// Public routes
router.post('/login', login);

// Protected routes
router.post('/register/user', auth, authorize('admin', 'agent'), registerUser);

module.exports = router; 