/**
 * RAG (Retrieval Augmented Generation) Service
 * Orchestrates the full RAG pipeline: embed query → search → generate
 */

const { generateEmbedding, cosineSimilarity } = require('./embedding');
const { generateResponse, generateSuggestions, estimateConfidence } = require('./llm');
const { chunkText, extractText } = require('./chunking');
const { classifyIntent, getGreetingResponse } = require('./intent');
const { getCachedResponse, cacheResponse } = require('./cache');
const Document = require('../models/Document');

const TOP_K = parseInt(process.env.TOP_K_RESULTS) || 8;
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.2;
const HANDOFF_THRESHOLD = parseFloat(process.env.HANDOFF_THRESHOLD) || 0.15;

// Track low-confidence attempts per session for handoff logic
const lowConfidenceTracker = new Map();

/**
 * UMPSA contact info for live agent handoff
 */
const HANDOFF_CONTACTS = {
  academic: {
    office: 'Pejabat Akademik UMPSA',
    phone: '09-424 5000',
    email: 'akademik@umpsa.edu.my'
  },
  hostel: {
    office: 'Pejabat Pengurusan Kolej Kediaman',
    phone: '09-424 5500',
    email: 'kolej@umpsa.edu.my'
  },
  fees: {
    office: 'Pejabat Bendahari',
    phone: '09-424 5100',
    email: 'bendahari@umpsa.edu.my'
  },
  registration: {
    office: 'Pejabat Pendaftar',
    phone: '09-424 5200',
    email: 'pendaftar@umpsa.edu.my'
  },
  general: {
    office: 'Pusat Perkhidmatan Pelajar (One Stop Centre)',
    phone: '09-424 5000',
    email: 'osc@umpsa.edu.my'
  }
};

/**
 * Process a user query through the RAG pipeline
 * @param {string} query - User's question
 * @param {object} options - Query options
 * @returns {object} Response with sources, confidence, suggestions, handoff
 */
async function queryRAG(query, options = {}) {
  const { language = 'mixed', conversationHistory = [], topK = TOP_K, sessionId = 'default' } = options;

  // Step 1: Classify intent
  const intentResult = classifyIntent(query);

  // Step 2: Handle greetings without RAG (skip caching for greetings)
  if (!intentResult.needsRAG) {
    const greetingResponse = getGreetingResponse(language);
    lowConfidenceTracker.delete(sessionId);
    return {
      content: greetingResponse,
      sources: [],
      confidence: 1.0,
      isLowConfidence: false,
      intent: intentResult.intent,
      suggestions: getSuggestionsForGreeting(language),
      handoff: false,
      handoffContact: null
    };
  }

  // Step 2.5: Check cache before running full RAG pipeline
  try {
    const cached = await getCachedResponse(query, language);
    if (cached) {
      console.log(`[${new Date().toISOString()}] Cache HIT for: "${query.substring(0, 50)}..."`);
      return {
        content: cached.content,
        sources: cached.sources || [],
        confidence: cached.confidence || 0.8,
        isLowConfidence: false,
        intent: cached.intent || intentResult.intent,
        suggestions: cached.suggestions || [],
        handoff: false,
        handoffContact: null,
        fromCache: true
      };
    }
  } catch (cacheErr) {
    console.error(`[${new Date().toISOString()}] Cache lookup failed:`, cacheErr.message);
  }

  // Step 3: Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Step 4: Search for similar chunks in the vector store
  const searchResults = await searchSimilarChunks(queryEmbedding, topK);

  // Step 5: Check confidence
  const scores = searchResults.map(r => r.score);
  const confidence = estimateConfidence(scores);

  // Step 6: Check handoff logic
  let handoff = false;
  let handoffContact = null;

  if (confidence < HANDOFF_THRESHOLD) {
    const tracker = lowConfidenceTracker.get(sessionId) || 0;
    lowConfidenceTracker.set(sessionId, tracker + 1);

    if (tracker + 1 >= 2) {
      handoff = true;
      handoffContact = HANDOFF_CONTACTS[intentResult.intent] || HANDOFF_CONTACTS.general;
      lowConfidenceTracker.delete(sessionId);
    }
  } else {
    lowConfidenceTracker.set(sessionId, 0);
  }

  // Step 7: If confidence is too low and no results, return fallback
  if (confidence < CONFIDENCE_THRESHOLD && searchResults.length === 0) {
    return {
      content: getLowConfidenceResponse(language),
      sources: [],
      confidence,
      isLowConfidence: true,
      intent: intentResult.intent,
      suggestions: [],
      handoff,
      handoffContact
    };
  }

  // Step 8: Format context texts with source labels for LLM
  const contexts = searchResults.map((r, i) => {
    return `Document: ${r.documentTitle}\nContent: ${r.chunk.content}`;
  });

  // Step 9: Generate response using LLM with retrieved context
  const llmResponse = await generateResponse(query, contexts, {
    language,
    conversationHistory,
    intent: intentResult.intent
  });

  // Step 10: Add disclaimer if low confidence
  let responseContent = llmResponse.content;
  if (confidence < CONFIDENCE_THRESHOLD) {
    const disclaimer = language === 'ms'
      ? '\n\n⚠️ Saya tidak pasti tentang jawapan ini. Sila hubungi pejabat berkaitan untuk pengesahan.'
      : "\n\n⚠️ I'm not fully confident about this answer. Please contact the relevant office for confirmation.";
    responseContent += disclaimer;
  }

  // Step 11: Format sources for citation
  const sources = searchResults.map(r => ({
    documentId: r.documentId,
    title: r.documentTitle,
    chunk: r.chunk.content.substring(0, 200) + '...',
    score: r.score
  }));

  // Step 12: Generate follow-up suggestions
  let suggestions = [];
  try {
    suggestions = await generateSuggestions(query, responseContent, intentResult.intent, language);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Failed to generate suggestions:`, err.message);
  }

  const finalResult = {
    content: responseContent,
    sources,
    confidence,
    isLowConfidence: confidence < CONFIDENCE_THRESHOLD,
    intent: intentResult.intent,
    suggestions,
    handoff,
    handoffContact,
    metadata: llmResponse.metadata
  };

  // Step 13: Save to cache (non-blocking, don't await)
  cacheResponse(query, queryEmbedding, finalResult, language).catch(err => {
    console.error(`[${new Date().toISOString()}] Cache save failed:`, err.message);
  });

  return finalResult;
}

/**
 * Search for chunks similar to the query embedding
 * Uses in-memory cosine similarity search across all document chunks
 * Lower similarity threshold to include more relevant results
 */
async function searchSimilarChunks(queryEmbedding, topK = TOP_K) {
  const documents = await Document.find({ isProcessed: true }).lean();

  const results = [];
  const MIN_SIMILARITY = 0.1; // Low threshold to include more chunks

  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    for (const chunk of doc.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const score = cosineSimilarity(queryEmbedding, chunk.embedding);

      // Only include chunks above minimum similarity
      if (score >= MIN_SIMILARITY) {
        results.push({
          documentId: doc._id,
          documentTitle: doc.title,
          chunk,
          score
        });
      }
    }
  }

  // Sort by similarity score (descending) and return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Ingest a document: extract text, chunk, embed, and store
 * @param {Buffer} fileBuffer - File content buffer
 * @param {object} metadata - Document metadata
 * @returns {object} Processed document info
 */
async function ingestDocument(fileBuffer, metadata) {
  const { title, filename, fileType, fileSize, category, language } = metadata;

  // Step 1: Extract text from file
  const text = await extractText(fileBuffer, fileType);

  // Step 2: Chunk the text
  const chunks = chunkText(text);

  // Step 3: Generate embeddings for each chunk
  const chunksWithEmbeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    chunksWithEmbeddings.push({
      content: chunks[i],
      embedding,
      index: i
    });
  }

  // Step 4: Store in MongoDB
  const document = new Document({
    title,
    originalFilename: filename,
    content: text,
    chunks: chunksWithEmbeddings,
    fileType,
    fileSize,
    category: category || 'general',
    language: language || 'mixed',
    isProcessed: true,
    chunkCount: chunks.length
  });

  await document.save();

  return {
    id: document._id,
    title: document.title,
    chunkCount: chunks.length,
    fileType,
    fileSize
  };
}

/**
 * Get low confidence response
 */
function getLowConfidenceResponse(language) {
  if (language === 'ms') {
    return 'Maaf, saya tidak menemui maklumat yang cukup dalam pangkalan data untuk menjawab soalan ini. Sila hubungi pejabat akademik UMPSA atau semak portal pelajar untuk maklumat terkini.';
  }
  return "I don't have enough information in my knowledge base to answer this question. Please check the UMPSA student portal or contact the academic office for the most up-to-date information.";
}

/**
 * Get default suggestions for greeting
 */
function getSuggestionsForGreeting(language) {
  if (language === 'ms') {
    return [
      'Bagaimana cara mendaftar kursus?',
      'Berapa yuran semester ini?',
      'Macam mana nak apply hostel?'
    ];
  }
  return [
    'How do I register for courses?',
    'What are the semester fees?',
    'How do I apply for hostel?'
  ];
}

module.exports = {
  queryRAG,
  ingestDocument,
  searchSimilarChunks
};
