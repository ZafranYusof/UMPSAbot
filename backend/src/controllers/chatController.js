/**
 * Chat Controller
 * Handles chat message processing and conversation management
 * Includes conversation memory (last 5 messages) and follow-up detection
 */

const { queryRAG } = require('../services/rag');
const { streamGenerateResponse, generateSuggestions, stripMarkdown } = require('../services/llm');
const { generateEmbedding, cosineSimilarity } = require('../services/embedding');
const { classifyIntent, getGreetingResponse } = require('../services/intent');
const { getCachedResponse } = require('../services/cache');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const QueryLog = require('../models/QueryLog');
const { v4: uuidv4 } = require('uuid');

// Follow-up detection patterns (BM + EN + Manglish)
const FOLLOWUP_PATTERNS = [
  /^(tell me more|explain more|more details|elaborate|go on|continue)/i,
  /^(lagi|terangkan lagi|lebih detail|sambung|jelaskan|huraikan)/i,
  /^(details|what else|anything else|can you explain)/i,
  /^(apa lagi|ada lagi|boleh terangkan|macam mana tu)/i,
  /^(why|how come|kenapa|macam mana|camne)/i,
  /^(what do you mean|maksud|apa maksud)/i,
];

/**
 * Detect if a query is a follow-up to previous answer
 */
function isFollowUpQuery(query) {
  const trimmed = query.trim().toLowerCase();
  // Short queries that reference previous context
  if (trimmed.length < 40) {
    for (const pattern of FOLLOWUP_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
  }
  // Very short queries (< 4 words) are likely follow-ups
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 3 && (trimmed.includes('?') || trimmed.includes('lagi') || trimmed.includes('more'))) {
    return true;
  }
  return false;
}

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

    // Load or create conversation session
    let conversation = null;
    try {
      conversation = await Conversation.findOne({ conversationId: convId });
      if (!conversation) {
        conversation = new Conversation({ conversationId: convId });
      }
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not load conversation:`, dbError.message);
    }

    // Get conversation history (last 5 messages for context)
    let conversationHistory = [];
    try {
      const previousMessages = await Message.find({ conversationId: convId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      conversationHistory = previousMessages
        .reverse()
        .slice(-5) // Keep last 5 messages
        .map(m => ({ role: m.role, content: m.content }));
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not fetch conversation history:`, dbError.message);
    }

    // Detect language from message (normalize 'bm' from frontend to 'ms' for backend)
    const rawLanguage = language || detectLanguage(message);
    const detectedLanguage = rawLanguage === 'bm' ? 'ms' : rawLanguage;

    // Check if this is a follow-up query
    const isFollowUp = isFollowUpQuery(message);
    let ragOptions = {
      language: detectedLanguage,
      conversationHistory,
      sessionId: convId
    };

    // If follow-up, pass previous answer as additional context
    if (isFollowUp && conversation?.lastAnswer?.content) {
      ragOptions.followUpContext = {
        previousQuery: conversation.lastAnswer.query,
        previousAnswer: conversation.lastAnswer.content,
        previousSources: conversation.lastAnswer.sources || [],
        previousIntent: conversation.lastAnswer.intent
      };
    }

    // Process through RAG pipeline
    const ragResponse = await queryRAG(message, ragOptions);

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

    // Update conversation session with last answer
    try {
      if (conversation) {
        conversation.lastAnswer = {
          content: ragResponse.content,
          query: message,
          sources: ragResponse.sources || [],
          intent: ragResponse.intent || 'general'
        };
        conversation.messageCount = (conversation.messageCount || 0) + 2;
        conversation.language = detectedLanguage;
        conversation.lastActiveAt = new Date();
        await conversation.save();
      }
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not update conversation:`, dbError.message);
    }

    // Build response in unified format
    const response = {
      conversationId: convId,
      messageId: savedAssistantMsg ? savedAssistantMsg._id : null,
      message: stripMarkdown(ragResponse.content),
      sources: ragResponse.sources || [],
      suggestions: ragResponse.suggestions || [],
      confidence: ragResponse.confidence,
      language: detectedLanguage,
      intent: ragResponse.intent,
      isLowConfidence: ragResponse.isLowConfidence,
      isFollowUp
    };

    // Add handoff info if triggered
    if (ragResponse.handoff) {
      response.handoff = true;
      response.handoffContact = ragResponse.handoffContact;
    }

    // Log query for popular questions tracking (non-blocking)
    try {
      await new QueryLog({
        query: message,
        normalizedQuery: message.toLowerCase().trim().replace(/\s+/g, ' '),
        intent: ragResponse.intent || 'general',
        language: detectedLanguage,
        responseTime: ragResponse.metadata?.responseTime || 0,
        provider: ragResponse.metadata?.provider || 'unknown'
      }).save();
    } catch (logErr) {
      // Non-critical, don't fail the request
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
    await Conversation.deleteOne({ conversationId });
    res.json({ success: true, conversationId });
  } catch (error) {
    next(error);
  }
}

/**
 * Improved language detection (BM vs English vs Manglish)
 * Uses word frequency analysis with weighted scoring
 */
function detectLanguage(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return 'mixed';

  // Common BM words (high frequency in Malay text)
  const bmWords = new Set([
    'apa', 'ini', 'itu', 'saya', 'nak', 'macam', 'mana', 'bila', 'kenapa',
    'bagaimana', 'boleh', 'tidak', 'ada', 'untuk', 'dengan', 'yang', 'dan',
    'di', 'ke', 'dari', 'berapa', 'siapa', 'dimana', 'mengapa', 'adakah',
    'pelajar', 'universiti', 'fakulti', 'kursus', 'semester', 'adalah',
    'akan', 'telah', 'sudah', 'belum', 'juga', 'atau', 'tetapi', 'kerana',
    'oleh', 'pada', 'dalam', 'lagi', 'sahaja', 'hanya', 'perlu', 'hendak',
    'mereka', 'kami', 'kita', 'awak', 'kamu', 'dia', 'ia', 'bagi',
    'tentang', 'antara', 'setiap', 'semua', 'banyak', 'sedikit', 'lebih',
    'paling', 'sangat', 'amat', 'terlalu', 'agak', 'cukup', 'masih',
    'sedang', 'sering', 'selalu', 'kadang', 'jarang', 'tak', 'takde',
    'camne', 'camna', 'mcm', 'nk', 'ade', 'xde', 'dah', 'blm', 'dgn',
    'utk', 'yg', 'ni', 'tu', 'je', 'la', 'lah', 'kan', 'eh', 'wei'
  ]);

  // Common English words
  const enWords = new Set([
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'shall', 'can', 'need', 'must', 'ought', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'how', 'when', 'where',
    'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'than', 'too', 'very', 'just', 'because', 'about',
    'between', 'through', 'during', 'before', 'after', 'above', 'below',
    'from', 'with', 'without', 'again', 'further', 'then', 'once', 'here',
    'there', 'where', 'when', 'why', 'how', 'not', 'only', 'own', 'same',
    'also', 'but', 'and', 'for', 'nor', 'yet', 'so', 'if', 'or'
  ]);

  let bmScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (bmWords.has(word)) bmScore++;
    if (enWords.has(word)) enScore++;
  }

  const bmRatio = bmScore / words.length;
  const enRatio = enScore / words.length;

  // Clear BM majority
  if (bmRatio > 0.3 && bmRatio > enRatio * 1.5) return 'ms';
  // Clear EN majority
  if (enRatio > 0.3 && enRatio > bmRatio * 1.5) return 'en';
  // Mixed (Manglish) - both present or neither dominant
  if (bmRatio > 0.1 && enRatio > 0.1) return 'mixed';
  // Default based on higher score
  if (bmRatio > enRatio) return 'ms';
  if (enRatio > bmRatio) return 'en';
  
  return 'mixed';
}

/**
 * Stream a message response via Server-Sent Events
 * POST /api/chat/stream
 */
async function streamMessage(req, res, next) {
  try {
    const { message, conversationId, language } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const convId = conversationId || uuidv4();
    const rawLang = language || detectLanguage(message);
    const detectedLanguage = rawLang === 'bm' ? 'ms' : rawLang;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Load conversation for context
    let conversation = null;
    let conversationHistory = [];
    try {
      conversation = await Conversation.findOne({ conversationId: convId });
      if (!conversation) {
        conversation = new Conversation({ conversationId: convId });
      }
      const previousMessages = await Message.find({ conversationId: convId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      conversationHistory = previousMessages
        .reverse()
        .slice(-5)
        .map(m => ({ role: m.role, content: m.content }));
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Stream: Could not load conversation:`, dbError.message);
    }

    // Classify intent
    const intentResult = classifyIntent(message);

    // Handle greetings without streaming
    if (!intentResult.needsRAG) {
      const greetingResponse = getGreetingResponse(detectedLanguage);
      const greetingSuggestions = detectedLanguage === 'en'
        ? ['How do I register for courses?', 'What are the semester fees?', 'How do I apply for hostel?']
        : ['Macam mana nak daftar kursus?', 'Berapa yuran semester ini?', 'Macam mana nak apply hostel?'];
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: greetingResponse })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', conversationId: convId, sources: [], suggestions: greetingSuggestions, confidence: 1.0, intent: intentResult.intent })}\n\n`);
      res.end();
      return;
    }

    // Check cache
    try {
      const cached = await getCachedResponse(message, detectedLanguage);
      if (cached) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: stripMarkdown(cached.content) })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done', conversationId: convId, sources: cached.sources || [], suggestions: cached.suggestions || [], confidence: cached.confidence || 0.8, intent: cached.intent || intentResult.intent, fromCache: true })}\n\n`);
        res.end();
        return;
      }
    } catch (cacheErr) {
      // Continue without cache
    }

    // Run RAG retrieval (embedding + search) without LLM generation
    const { searchSimilarChunks } = require('../services/rag');
    const queryEmbedding = await generateEmbedding(message);
    const searchResults = await searchSimilarChunks(queryEmbedding, 8, message);

    const contexts = searchResults.map((r) => {
      return `Document: ${r.documentTitle}\nContent: ${r.chunk.content}`;
    });

    // Log query
    const startTime = Date.now();

    // Stream LLM response
    await streamGenerateResponse(
      message,
      contexts,
      { language: detectedLanguage, conversationHistory, intent: intentResult.intent },
      (chunk) => {
        // Send each chunk as SSE event (strip markdown formatting)
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: stripMarkdown(chunk) })}\n\n`);
      },
      async (result) => {
        const responseTime = Date.now() - startTime;

        // Generate suggestions
        let suggestions = [];
        try {
          suggestions = generateSuggestions(message, result.content, intentResult.intent, detectedLanguage);
        } catch (e) {}

        // Format sources
        const sources = searchResults.map(r => ({
          documentId: r.documentId,
          title: r.documentTitle,
          chunk: r.chunk.content.substring(0, 200) + '...',
          score: r.score
        }));

        const { estimateConfidence } = require('../services/llm');
        const confidence = estimateConfidence(searchResults.map(r => r.score));

        // Send final event with metadata
        res.write(`data: ${JSON.stringify({ type: 'done', conversationId: convId, sources, suggestions, confidence, intent: intentResult.intent, metadata: result.metadata })}\n\n`);
        res.end();

        // Save messages to DB (non-blocking)
        try {
          await new Message({ conversationId: convId, role: 'user', content: message, language: detectedLanguage }).save();
          await new Message({ conversationId: convId, role: 'assistant', content: result.content, sources, language: detectedLanguage, confidence, metadata: result.metadata }).save();
          if (conversation) {
            conversation.lastAnswer = { content: result.content, query: message, sources, intent: intentResult.intent };
            conversation.messageCount = (conversation.messageCount || 0) + 2;
            conversation.language = detectedLanguage;
            conversation.lastActiveAt = new Date();
            await conversation.save();
          }
        } catch (dbErr) {
          console.warn(`[${new Date().toISOString()}] Stream: DB save failed:`, dbErr.message);
        }

        // Log query for popular questions tracking
        try {
          await new QueryLog({
            query: message,
            normalizedQuery: message.toLowerCase().trim().replace(/\s+/g, ' '),
            intent: intentResult.intent,
            language: detectedLanguage,
            responseTime,
            provider: result.metadata?.provider || 'unknown'
          }).save();
        } catch (logErr) {
          // Non-critical
        }
      }
    );
  } catch (error) {
    // If headers already sent, end the stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred while streaming the response.' })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
}

module.exports = {
  sendMessage,
  streamMessage,
  getConversation,
  listConversations,
  deleteConversation,
  detectLanguage
};
