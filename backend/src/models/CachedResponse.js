/**
 * CachedResponse Model
 * Stores cached RAG responses to avoid redundant LLM API calls
 * Smart caching: hit counter, TTL refresh on access, popularity-based TTL
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
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h default
  }
});

// TTL index: MongoDB auto-deletes when expiresAt is reached
cachedResponseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CachedResponse', cachedResponseSchema);
