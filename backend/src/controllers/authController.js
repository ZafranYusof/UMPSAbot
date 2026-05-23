/**
 * Auth Controller
 * JWT-based authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'umpsa-chatbot-secret-2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.username
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Login - accepts email or username
 */
async function login(req, res, next) {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password required' });
    }

    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        faculty: user.faculty
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a new user
 */
async function register(req, res, next) {
  try {
    const { name, username, email, password, faculty, matricNo } = req.body;
    const uname = username || name;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!uname) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if user exists
    const existing = await User.findOne({ $or: [{ username: uname }, { email: email.toLowerCase() }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const user = new User({
      username: uname,
      email: email.toLowerCase(),
      password,
      faculty: faculty || '',
      matricNo: matricNo || '',
      role: 'student'
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  register,
  getProfile
};
