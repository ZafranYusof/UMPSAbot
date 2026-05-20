/**
 * CachedResponse Model
 * Stores cached RAG responses to avoid redundant Groq API calls
 */

const mongoose = require('mongoose');

const cachedResponseSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    index: true
  },
  queryNormalized: {
    type: String,
    required: true,
    index: true
  },
  queryEmbedding: {
    type: [Number],
    required: true
  },
  response: {
    content: String,
    sources: [mongoose.Schema.Types.Mixed],
    suggestions: [String],
    confidence: Number,
    intent: String
  },
  language: {
    type: String,
    default: 'mixed'
  },
  hitCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index: auto-delete after 24 hours
cachedResponseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('CachedResponse', cachedResponseSchema);
