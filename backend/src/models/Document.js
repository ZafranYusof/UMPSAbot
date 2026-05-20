const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  index: { type: Number, required: true }
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  chunks: [chunkSchema],
  fileType: {
    type: String,
    enum: ['pdf', 'txt', 'md'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'facilities', 'faq', 'general'],
    default: 'general'
  },
  language: {
    type: String,
    enum: ['en', 'ms', 'mixed'],
    default: 'mixed'
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: String,
    default: 'admin'
  }
}, { timestamps: true });

documentSchema.index({ title: 'text', content: 'text' }, { language_override: 'textSearchLanguage' });

module.exports = mongoose.model('Document', documentSchema);
