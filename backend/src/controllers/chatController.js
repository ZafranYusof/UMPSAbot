/**
 * Chat Controller
 * Handles chat message processing and conversation management
 */

const { queryRAG } = require('../services/rag');
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

/**
 * Send a message and get AI response
 */
async function sendMessage(req, res, next) {
  try {
    const { message, conversationId, language } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const convId = conversationId || uuidv4();

    // Get conversation history for context
    let conversationHistory = [];
    try {
      const previousMessages = await Message.find({ conversationId: convId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      conversationHistory = previousMessages
        .reverse()
        .map(m => ({ role: m.role, content: m.content }));
    } catch (dbError) {
      // Continue without history if DB is unavailable
      console.warn(`[${new Date().toISOString()}] Could not fetch conversation history:`, dbError.message);
    }

    // Detect language from message
    const detectedLanguage = language || detectLanguage(message);

    // Process through RAG pipeline (now includes intent, suggestions, handoff)
    const ragResponse = await queryRAG(message, {
      language: detectedLanguage,
      conversationHistory,
      sessionId: convId
    });

    // Save user message
    let savedAssistantMsg = null;
    try {
      await new Message({
        conversationId: convId,
        role: 'user',
        content: message,
        language: detectedLanguage
      }).save();

      // Save assistant response
      savedAssistantMsg = await new Message({
        conversationId: convId,
        role: 'assistant',
        content: ragResponse.content,
        sources: ragResponse.sources,
        language: detectedLanguage,
        confidence: ragResponse.confidence,
        metadata: ragResponse.metadata
      }).save();
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not save messages to DB:`, dbError.message);
    }

    // Build response in unified format
    const response = {
      conversationId: convId,
      messageId: savedAssistantMsg ? savedAssistantMsg._id : null,
      message: ragResponse.content,
      sources: ragResponse.sources || [],
      suggestions: ragResponse.suggestions || [],
      confidence: ragResponse.confidence,
      language: detectedLanguage,
      intent: ragResponse.intent,
      isLowConfidence: ragResponse.isLowConfidence
    };

    // Add handoff info if triggered
    if (ragResponse.handoff) {
      response.handoff = true;
      response.handoffContact = ragResponse.handoffContact;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get conversation history
 */
async function getConversation(req, res, next) {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      conversationId,
      messages: messages.map(m => ({
        id: m._id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        confidence: m.confidence,
        timestamp: m.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all conversations (list)
 */
async function listConversations(req, res, next) {
  try {
    const conversations = await Message.aggregate([
      { $group: {
        _id: '$conversationId',
        lastMessage: { $last: '$content' },
        lastRole: { $last: '$role' },
        messageCount: { $sum: 1 },
        updatedAt: { $max: '$createdAt' }
      }},
      { $sort: { updatedAt: -1 } },
      { $limit: 50 }
    ]);

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a conversation
 */
async function deleteConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    await Message.deleteMany({ conversationId });
    res.json({ success: true, conversationId });
  } catch (error) {
    next(error);
  }
}

/**
 * Simple language detection (BM vs English)
 */
function detectLanguage(text) {
  const bmWords = ['apa', 'ini', 'itu', 'saya', 'nak', 'macam', 'mana', 'bila', 'kenapa', 'bagaimana', 'boleh', 'tidak', 'ada', 'untuk', 'dengan', 'yang', 'dan', 'di', 'ke', 'dari', 'berapa', 'siapa', 'dimana', 'mengapa', 'adakah', 'pelajar', 'universiti', 'fakulti', 'kursus', 'semester'];
  
  const words = text.toLowerCase().split(/\s+/);
  const bmCount = words.filter(w => bmWords.includes(w)).length;
  const ratio = bmCount / words.length;

  if (ratio > 0.3) return 'ms';
  if (ratio > 0.1) return 'mixed';
  return 'en';
}

module.exports = {
  sendMessage,
  getConversation,
  listConversations,
  deleteConversation
};
