const mongoose = require('mongoose');

const scrapedPageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  lastScraped: {
    type: Date,
    default: null
  },
  contentHash: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'error', 'unchanged'],
    default: 'pending'
  },
  category: {
    type: String,
    default: 'general'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScrapedPage', scrapedPageSchema);
