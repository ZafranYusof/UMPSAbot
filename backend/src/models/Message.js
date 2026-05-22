const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sources: [{
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    title: String,
    chunk: String,
    score: Number
  }],
  language: {
    type: String,
    enum: ['en', 'ms', 'mixed'],
    default: 'mixed'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  metadata: {
    tokensUsed: Number,
    responseTime: Number,
    model: String
  }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
