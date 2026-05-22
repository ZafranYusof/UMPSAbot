const mongoose = require('mongoose');

/**
 * Conversation Model
 * Tracks conversation sessions with full message history for persistent multi-turn memory.
 * Messages are stored directly in the conversation document for fast retrieval.
 */
const messageEntrySchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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
  // Full message history embedded in conversation
  messages: {
    type: [messageEntrySchema],
    default: []
  },
  // Store last assistant answer for follow-up detection
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
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Auto-expire conversations after 30 days of inactivity
conversationSchema.index({ lastActive: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Conversation', conversationSchema);
