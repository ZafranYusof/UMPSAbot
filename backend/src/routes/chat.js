const express = require('express');
const router = express.Router();
const { sendMessage, streamMessage, getConversation, listConversations, deleteConversation } = require('../controllers/chatController');
const { submitFeedback } = require('../controllers/feedbackController');
const { chatRateLimiter } = require('../middleware');

// Send a message and get AI response (rate limited)
router.post('/send', chatRateLimiter, sendMessage);

// Stream a message response via SSE (rate limited)
router.post('/stream', chatRateLimiter, streamMessage);

// Feedback endpoint
router.post('/feedback', submitFeedback);

// Get conversation history
router.get('/conversations', listConversations);
router.get('/conversations/:conversationId', getConversation);

// Delete a conversation
router.delete('/conversations/:conversationId', deleteConversation);

module.exports = router;
