const mongoose = require('mongoose');

/**
 * Conversation Model
 * Tracks conversation sessions with metadata and last answer for follow-up detection
 */
const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: null
  },
  // Store last assistant answer for multi-turn follow-up
  lastAnswer: {
    content: { type: String, default: '' },
    query: { type: String, default: '' },
    sources: [{
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      title: String,
      chunk: String,
      score: Number
    }],
    intent: { type: String, default: 'general' }
  },
  // Conversation metadata
  messageCount: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    enum: ['en', 'ms', 'mixed'],
    default: 'mixed'
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Auto-expire conversations after 7 days of inactivity
conversationSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('Conversation', conversationSchema);
