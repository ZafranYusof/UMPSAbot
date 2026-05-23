const express = require('express');
const router = express.Router();
const { login, register, getProfile, getMyProfile, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Login
router.post('/login', login);

// Register
router.post('/register', register);

// Get authenticated user's profile
router.get('/profile', authMiddleware, getMyProfile);

// Update authenticated user's profile
router.put('/profile', authMiddleware, updateProfile);

// Get profile by userId (legacy)
router.get('/profile/:userId', getProfile);

module.exports = router;
