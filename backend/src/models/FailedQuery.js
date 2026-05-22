/**
 * FailedQuery Model
 * Tracks questions with low confidence or negative feedback for knowledge base expansion
 */

const mongoose = require('mongoose');

const failedQuerySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'mixed'
  },
  confidence: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  source: {
    type: String,
    enum: ['low_confidence', 'thumbs_down'],
    default: 'low_confidence'
  }
});

// Index for admin queries - unresolved sorted by timestamp
failedQuerySchema.index({ resolved: 1, timestamp: -1 });

// Index for frequency aggregation
failedQuerySchema.index({ query: 1, resolved: 1 });

module.exports = mongoose.model('FailedQuery', failedQuerySchema);
