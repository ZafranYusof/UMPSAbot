const express = require('express');
const router = express.Router();
const { login, register, getProfile } = require('../controllers/authController');

// Login
router.post('/login', login);

// Register
router.post('/register', register);

// Get profile
router.get('/profile/:userId', getProfile);

module.exports = router;
