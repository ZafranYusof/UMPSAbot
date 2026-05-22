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

// Pronouns and references that imply previous context (BM + EN + Manglish)
const PRONOUN_REFERENCES = new Set([
  'dia', 'tu', 'ni', 'yang', 'itu', 'ini', 'nya', 'mereka',
  'it', 'that', 'this', 'they', 'them', 'those', 'these',
  'the one', 'yang tu', 'yang ni', 'benda tu', 'pasal tu'
]);

// Conjunctions/connectors that start follow-up queries
const FOLLOWUP_STARTERS = /^(dan|tapi|kalau|so|then|but|and|or|also|what about|how about|pastu|lepas tu|selain|besides|furthermore)/i;

/**
 * Detect if a query is a follow-up to previous answer
 * Enhanced detection: patterns, pronouns, short contextual queries, conjunctions
 */
function isFollowUpQuery(query, hasHistory = false) {
  const trimmed = query.trim().toLowerCase();
  const words = trimmed.split(/\s+/);
  const wordCount = words.length;

  // 1. Check explicit follow-up patterns (e.g. "tell me more", "terangkan lagi")
  if (trimmed.length < 60) {
    for (const pattern of FOLLOWUP_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
  }

  // 2. Queries starting with conjunctions/connectors ("dan", "tapi", "kalau", "so", "then")
  if (FOLLOWUP_STARTERS.test(trimmed)) return true;

  // 3. Short queries (< 5 words) containing pronouns/references
  //    e.g. "untuk diploma?", "yang tu?", "berapa?", "macam mana?"
  if (wordCount < 5) {
    // Check if any word is a pronoun/reference
    for (const word of words) {
      if (PRONOUN_REFERENCES.has(word)) return true;
    }
    // Also check multi-word references
    for (const ref of PRONOUN_REFERENCES) {
      if (ref.includes(' ') && trimmed.includes(ref)) return true;
    }
    // Very short queries with question mark are likely follow-ups
    if (wordCount <= 3 && trimmed.includes('?')) return true;
    // Single word queries like "berapa?", "bila?", "where?" are follow-ups
    if (wordCount === 1 && /^(berapa|bila|mana|siapa|apa|where|when|who|how|what)\??$/.test(trimmed)) return true;
  }

  // 4. Short queries (< 5 words) with contextual particles
  if (wordCount < 5) {
    const contextParticles = ['je', 'la', 'lah', 'kan', 'eh', 'ke', 'kot'];
    const hasParticle = words.some(w => contextParticles.includes(w));
    if (hasParticle && (trimmed.includes('?') || wordCount <= 3)) return true;
  }

  return false;
}

/**
 * Build follow-up context from conversation history
 * Extracts the last user query + assistant answer pair
 */
function buildFollowUpContextFromHistory(conversationHistory) {
  if (!conversationHistory || conversationHistory.length < 2) return null;

  // Find the last assistant message and its preceding user message
  let lastUserMsg = null;
  let lastAssistantMsg = null;

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (!lastAssistantMsg && conversationHistory[i].role === 'assistant') {
      lastAssistantMsg = conversationHistory[i];
    } else if (lastAssistantMsg && !lastUserMsg && conversationHistory[i].role === 'user') {
      lastUserMsg = conversationHistory[i];
      break;
    }
  }

  if (!lastUserMsg || !lastAssistantMsg) return null;

  return {
    previousQuery: lastUserMsg.content,
    previousAnswer: lastAssistantMsg.content
  };
}

/**
 * Send a message and get AI response
 */
async function sendMessage(req, res, next) {
  try {
    const startTime = Date.now();
    const { message, conversationId, language } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const convId = conversationId || uuidv4();

    // If frontend explicitly sends a language preference, respect it.
    // Only auto-detect if no preference sent.
    const rawLanguage = language ? language : detectLanguage(message);
    const detectedLanguage = (rawLanguage === 'bm') ? 'ms' : rawLanguage;

    // Classify intent early for quick-response path
    const intentResult = classifyIntent(message);

    // Quick-response path: greetings and simple intents skip full RAG pipeline
    if (!intentResult.needsRAG) {
      const greetingResponse = getGreetingResponse(detectedLanguage);
      const suggestions = detectedLanguage === 'en'
        ? ['How do I register for courses?', 'What are the semester fees?', 'How do I apply for hostel?']
        : ['Macam mana nak daftar kursus?', 'Berapa yuran semester ini?', 'Macam mana nak apply hostel?'];

      console.log(`[${new Date().toISOString()}] Quick response (greeting) in ${Date.now() - startTime}ms`);
      return res.json({
        conversationId: convId,
        messageId: null,
        message: greetingResponse,
        sources: [],
        suggestions,
        confidence: 1.0,
        language: detectedLanguage,
        intent: intentResult.intent,
        isLowConfidence: false,
        isFollowUp: false
      });
    }

    // Parallel: load conversation + history simultaneously
    const [conversation, previousMessages] = await Promise.all([
      Conversation.findOne({ conversationId: convId }).catch(err => {
        console.warn(`[${new Date().toISOString()}] Could not load conversation:`, err.message);
        return null;
      }),
      Message.find({ conversationId: convId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .catch(err => {
          console.warn(`[${new Date().toISOString()}] Could not fetch conversation history:`, err.message);
          return [];
        })
    ]);

    // Create conversation if not found
    let conv = conversation;
    if (!conv) {
      conv = new Conversation({ conversationId: convId });
    }

    const conversationHistory = (previousMessages || [])
      .reverse()
      .slice(-5)
      .map(m => ({ role: m.role, content: m.content }));

    // Check if this is a follow-up query (pass history presence for smarter detection)
    const hasHistory = conversationHistory.length > 0;
    const isFollowUp = isFollowUpQuery(message, hasHistory);
    let ragOptions = {
      language: detectedLanguage,
      conversationHistory,
      sessionId: convId
    };

    // If follow-up detected, attach previous context for the RAG pipeline
    if (isFollowUp && hasHistory) {
      if (conv?.lastAnswer?.content) {
        // Use stored last answer from conversation document
        ragOptions.followUpContext = {
          previousQuery: conv.lastAnswer.query,
          previousAnswer: conv.lastAnswer.content,
          previousSources: conv.lastAnswer.sources || [],
          previousIntent: conv.lastAnswer.intent
        };
      } else {
        // Fallback: build context from conversation history messages
        const historyContext = buildFollowUpContextFromHistory(conversationHistory);
        if (historyContext) {
          ragOptions.followUpContext = historyContext;
        }
      }
    }

    // Process through RAG pipeline
    const ragResponse = await queryRAG(message, ragOptions);

    console.log(`[${new Date().toISOString()}] Full RAG response in ${Date.now() - startTime}ms`);

    // Save messages and update conversation in parallel (non-blocking for response)
    let savedAssistantMsg = null;
    try {
      const [, assistantMsg] = await Promise.all([
        new Message({
          conversationId: convId,
          role: 'user',
          content: message,
          language: detectedLanguage
        }).save(),
        new Message({
          conversationId: convId,
          role: 'assistant',
          content: ragResponse.content,
          sources: ragResponse.sources,
          language: detectedLanguage,
          confidence: ragResponse.confidence,
          metadata: ragResponse.metadata
        }).save()
      ]);
      savedAssistantMsg = assistantMsg;
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not save messages to DB:`, dbError.message);
    }

    // Update conversation session with last answer (non-blocking)
    if (conv) {
      conv.lastAnswer = {
        content: ragResponse.content,
        query: message,
        sources: ragResponse.sources || [],
        intent: ragResponse.intent || 'general'
      };
      conv.messageCount = (conv.messageCount || 0) + 2;
      conv.language = detectedLanguage;
      conv.lastActiveAt = new Date();
      conv.save().catch(err => {
        console.warn(`[${new Date().toISOString()}] Could not update conversation:`, err.message);
      });
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

    // Log query for popular questions tracking (fire-and-forget)
    new QueryLog({
      query: message,
      normalizedQuery: message.toLowerCase().trim().replace(/\s+/g, ' '),
      intent: ragResponse.intent || 'general',
      language: detectedLanguage,
      responseTime: Date.now() - startTime,
      provider: ragResponse.metadata?.provider || 'unknown'
    }).save().catch(() => {});

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
    // If frontend explicitly sends a language preference, respect it.
    // Only auto-detect if no preference sent.
    const rawLang = language ? language : detectLanguage(message);
    const detectedLanguage = (rawLang === 'bm') ? 'ms' : rawLang;

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

    // Check if this is a follow-up query
    const hasHistory = conversationHistory.length > 0;
    const isFollowUp = isFollowUpQuery(message, hasHistory);
    let followUpContext = null;

    if (isFollowUp && hasHistory) {
      if (conversation?.lastAnswer?.content) {
        followUpContext = {
          previousQuery: conversation.lastAnswer.query,
          previousAnswer: conversation.lastAnswer.content,
          previousSources: conversation.lastAnswer.sources || [],
          previousIntent: conversation.lastAnswer.intent
        };
      } else {
        followUpContext = buildFollowUpContextFromHistory(conversationHistory);
      }
    }

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
    // For follow-ups, augment the search query with previous context for better retrieval
    const searchQuery = (isFollowUp && followUpContext?.previousQuery)
      ? `${followUpContext.previousQuery} ${message}`
      : message;
    const queryEmbedding = await generateEmbedding(searchQuery);
    const searchResults = await searchSimilarChunks(queryEmbedding, 8, searchQuery);

    const contexts = searchResults.map((r) => {
      return `Document: ${r.documentTitle}\nContent: ${r.chunk.content}`;
    });

    // Log query
    const startTime = Date.now();

    // Stream LLM response
    await streamGenerateResponse(
      message,
      contexts,
      { language: detectedLanguage, conversationHistory, intent: intentResult.intent, followUpContext },
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
