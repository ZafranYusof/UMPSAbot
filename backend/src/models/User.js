const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  faculty: {
    type: String,
    default: ''
  },
  matricNo: {
    type: String,
    default: ''
  },
  preferences: {
    language: { type: String, enum: ['en', 'ms', 'mixed'], default: 'mixed' },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
