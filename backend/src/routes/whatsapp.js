/**
 * WhatsApp Webhook Routes (Twilio Integration)
 * Handles incoming WhatsApp messages via Twilio sandbox/production
 */

const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const rateLimit = require('express-rate-limit');
const { queryRAG } = require('../services/rag');
const Message = require('../models/Message');

// Rate limit per phone number: 10 messages per minute
const whatsappRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.body.From || req.ip,
  message: 'Too many messages. Please wait a moment before sending again.',
  standardHeaders: true,
  legacyHeaders: false
});

// WhatsApp message character limit
const WHATSAPP_MAX_LENGTH = 1600;

/**
 * Truncate message to fit WhatsApp limit
 */
function truncateForWhatsApp(text) {
  if (!text || text.length <= WHATSAPP_MAX_LENGTH) return text;
  return text.substring(0, WHATSAPP_MAX_LENGTH - 3) + '...';
}

/**
 * Format response for WhatsApp (no markdown tables, clean formatting)
 */
function formatForWhatsApp(text) {
  if (!text) return '';

  let formatted = text;

  // Convert markdown tables to bullet points
  const tableRegex = /\|(.+)\|/g;
  if (tableRegex.test(formatted)) {
    const lines = formatted.split('\n');
    const nonTableLines = [];
    let inTable = false;

    for (const line of lines) {
      if (line.trim().startsWith('|')) {
        if (!inTable && !line.includes('---')) {
          inTable = true;
          // Parse header
          const cells = line.split('|').filter(c => c.trim());
          if (cells.length > 0) {
            nonTableLines.push(cells.map(c => `• ${c.trim()}`).join('\n'));
          }
        } else if (!line.includes('---')) {
          const cells = line.split('|').filter(c => c.trim());
          if (cells.length > 0) {
            nonTableLines.push(cells.map(c => `  - ${c.trim()}`).join('\n'));
          }
        }
      } else {
        inTable = false;
        nonTableLines.push(line);
      }
    }
    formatted = nonTableLines.join('\n');
  }

  // Convert markdown bold **text** to *text* (WhatsApp bold)
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // Remove markdown headers (## Header -> Header)
  formatted = formatted.replace(/^#{1,6}\s+/gm, '');

  // Clean up excessive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages from Twilio
 */
router.post('/webhook', whatsappRateLimiter, async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const incomingMessage = req.body.Body;
    const sender = req.body.From; // format: whatsapp:+60xxxxxxxxxx

    if (!incomingMessage || !sender) {
      twiml.message('Sorry, I could not process your message. Please try again.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Use sender phone as conversationId (strip "whatsapp:" prefix for cleaner ID)
    const conversationId = sender.replace('whatsapp:', 'wa_');

    // Get conversation history
    let conversationHistory = [];
    try {
      const previousMessages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      conversationHistory = previousMessages
        .reverse()
        .map(m => ({ role: m.role, content: m.content }));
    } catch (dbError) {
      console.warn(`[WhatsApp] Could not fetch history for ${conversationId}:`, dbError.message);
    }

    // Detect language
    const language = detectLanguage(incomingMessage);

    // Process through RAG pipeline
    const ragResponse = await queryRAG(incomingMessage, {
      language,
      conversationHistory,
      sessionId: conversationId
    });

    // Format and truncate response for WhatsApp
    let responseText = formatForWhatsApp(ragResponse.content);
    responseText = truncateForWhatsApp(responseText);

    // Save messages to DB
    try {
      await new Message({
        conversationId,
        role: 'user',
        content: incomingMessage,
        language,
        metadata: { channel: 'whatsapp', sender }
      }).save();

      await new Message({
        conversationId,
        role: 'assistant',
        content: ragResponse.content,
        sources: ragResponse.sources,
        language,
        confidence: ragResponse.confidence,
        metadata: { channel: 'whatsapp' }
      }).save();
    } catch (dbError) {
      console.warn(`[WhatsApp] Could not save messages:`, dbError.message);
    }

    // Add sources as footer if available
    if (ragResponse.sources && ragResponse.sources.length > 0) {
      const sourcesText = '\n\n📚 Sources: ' + ragResponse.sources.slice(0, 3).map(s => s.title || s.name || 'Document').join(', ');
      const fullResponse = responseText + sourcesText;
      responseText = truncateForWhatsApp(fullResponse);
    }

    twiml.message(responseText);
  } catch (error) {
    console.error('[WhatsApp] Error processing message:', error);
    twiml.message('Maaf, saya mengalami masalah teknikal. Sila cuba lagi sebentar. 🙏');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

/**
 * GET /api/whatsapp/webhook
 * Twilio webhook verification
 */
router.get('/webhook', (req, res) => {
  res.status(200).send('WhatsApp webhook is active.');
});

/**
 * GET /api/whatsapp/status
 * Status endpoint
 */
router.get('/status', (req, res) => {
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  res.json({
    active: twilioConfigured,
    number: process.env.TWILIO_WHATSAPP_NUMBER || 'not configured',
    sandbox: !process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER.includes('14155238886')
  });
});

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

module.exports = router;
