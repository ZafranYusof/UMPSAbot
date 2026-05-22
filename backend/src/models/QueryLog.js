/**
 * QueryLog Model
 * Tracks every query for analytics and popular questions
 */

const mongoose = require('mongoose');

const queryLogSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  normalizedQuery: {
    type: String,
    required: true,
    index: true
  },
  intent: {
    type: String,
    default: 'general'
  },
  language: {
    type: String,
    default: 'mixed'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  responseTime: {
    type: Number,
    default: 0
  },
  provider: {
    type: String,
    default: 'unknown'
  }
});

// Index for aggregation queries
queryLogSchema.index({ normalizedQuery: 1, timestamp: -1 });

module.exports = mongoose.model('QueryLog', queryLogSchema);
