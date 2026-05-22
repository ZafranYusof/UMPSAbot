const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  conversationId: {
    type: String,
    index: true
  },
  rating: {
    type: String,
    enum: ['up', 'down'],
    required: true
  },
  comment: {
    type: String,
    default: null
  },
  userQuery: {
    type: String,
    default: null
  },
  assistantResponse: {
    type: String,
    default: null
  }
}, { timestamps: true });

feedbackSchema.index({ rating: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
