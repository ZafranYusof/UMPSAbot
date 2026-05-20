/**
 * Auth Controller
 * Basic authentication for admin panel
 */

const User = require('../models/User');

/**
 * Login (simplified - no bcrypt for hackathon demo)
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // For hackathon demo: simple auth
    // In production, use bcrypt + JWT
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastActive = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
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
    const { username, email, password, faculty, matricNo } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    // Check if user exists
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const user = new User({
      username,
      email,
      password, // In production: hash with bcrypt
      faculty: faculty || '',
      matricNo: matricNo || '',
      role: 'student'
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
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
