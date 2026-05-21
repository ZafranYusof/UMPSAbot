/**
 * RAG (Retrieval Augmented Generation) Service
 * Orchestrates the full RAG pipeline: embed query → search → generate
 */

const { generateEmbedding, cosineSimilarity, isJinaEnabled, getEmbeddingDimension } = require('./embedding');
const { generateResponse, generateSuggestions, estimateConfidence } = require('./llm');
const { generateTemplateFallback } = require('./templateFallback');
const { chunkText, extractText } = require('./chunking');
const { classifyIntent, getGreetingResponse } = require('./intent');
const { getCachedResponse, cacheResponse } = require('./cache');
const Document = require('../models/Document');
const UserPreference = require('../models/UserPreference');

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
  const { language = 'mixed', conversationHistory = [], topK = TOP_K, sessionId = 'default', followUpContext = null, userId = null } = options;

  // Step 0: Load user preferences for personalization
  let userContext = '';
  if (userId) {
    try {
      const prefs = await UserPreference.findOne({ userId }).lean();
      if (prefs) {
        const parts = [];
        if (prefs.faculty) parts.push(`Faculty: ${prefs.faculty}`);
        if (prefs.programme) parts.push(`Programme: ${prefs.programme}`);
        if (prefs.year) parts.push(`Year ${prefs.year} student`);
        if (parts.length > 0) {
          userContext = `[Student context: ${parts.join(', ')}] `;
        }
      }
    } catch (prefErr) {
      // Non-critical
    }
  }

  // Step 1: Classify intent
  const intentResult = classifyIntent(query);

  // Step 2: Handle greetings without RAG (skip caching for greetings)
  if (!intentResult.needsRAG) {
    // Timetable intent with course codes → use planner
    if (intentResult.intent === 'timetable' && intentResult.courseCodes?.length >= 2) {
      const greetingResponse = getGreetingResponse(language);
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

  // Step 2.1: Timetable intent without course codes - give helpful guidance
  if (intentResult.intent === 'timetable' && (!intentResult.courseCodes || intentResult.courseCodes.length < 2)) {
    const timetableGuide = language === 'en'
      ? 'To plan your timetable, please provide at least 2 course codes. For example: "Plan timetable BCS2313 BCS3133 BUM1433". I will find non-clashing combinations for you. You can check your course codes at the E-Comm Student Portal (https://std-comm.ump.edu.my).'
      : 'Untuk plan jadual, sila bagi sekurang-kurangnya 2 kod kursus. Contoh: "Plan jadual BCS2313 BCS3133 BUM1433". Saya akan cari kombinasi yang tak clash. Boleh check kod kursus kat E-Comm Student Portal (https://std-comm.ump.edu.my).';
    return {
      content: timetableGuide,
      sources: [],
      confidence: 0.9,
      isLowConfidence: false,
      intent: 'timetable',
      suggestions: language === 'en'
        ? ['How to register courses?', 'When is course registration?', 'What are the semester fees?']
        : ['Macam mana nak daftar kursus?', 'Bila tarikh pendaftaran kursus?', 'Berapa yuran semester?'],
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

  // Step 3: Handle follow-up queries — use previous context instead of fresh RAG
  if (followUpContext && followUpContext.previousAnswer) {
    console.log(`[${new Date().toISOString()}] Follow-up detected, using previous context`);
    
    // Build context from previous answer + sources
    const followUpContexts = [
      `Previous question: ${followUpContext.previousQuery}\nPrevious answer: ${followUpContext.previousAnswer}`
    ];
    
    // Also include previous sources for richer context
    if (followUpContext.previousSources && followUpContext.previousSources.length > 0) {
      for (const src of followUpContext.previousSources.slice(0, 3)) {
        if (src.chunk) {
          followUpContexts.push(`Document: ${src.title}\nContent: ${src.chunk}`);
        }
      }
    }

    const llmResponse = await generateResponse(query, followUpContexts, {
      language,
      conversationHistory,
      intent: followUpContext.previousIntent || intentResult.intent,
      userContext
    });

    // Generate suggestions for follow-up too
    let suggestions = [];
    try {
      suggestions = await generateSuggestions(query, llmResponse.content, followUpContext.previousIntent || intentResult.intent, language);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failed to generate suggestions:`, err.message);
    }

    return {
      content: llmResponse.content,
      sources: followUpContext.previousSources || [],
      confidence: 0.7,
      isLowConfidence: false,
      intent: followUpContext.previousIntent || intentResult.intent,
      suggestions,
      handoff: false,
      handoffContact: null,
      metadata: { ...llmResponse.metadata, isFollowUp: true }
    };
  }

  // Step 3b: Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Step 4: Search for similar chunks in the vector store
  const searchResults = await searchSimilarChunks(queryEmbedding, topK, query);

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
    intent: intentResult.intent,
    userContext
  });

  // Step 9.5: If LLM returned fallback (all providers failed), try template fallback
  if (llmResponse.metadata?.model === 'fallback' && searchResults.length > 0) {
    console.log(`[${new Date().toISOString()}] LLM failed, trying template fallback...`);
    const templateResult = generateTemplateFallback(searchResults, language);
    if (templateResult) {
      const templateResponse = {
        content: templateResult.content,
        sources: templateResult.sources,
        confidence,
        isLowConfidence: confidence < CONFIDENCE_THRESHOLD,
        intent: intentResult.intent,
        suggestions: [],
        handoff,
        handoffContact,
        metadata: {
          ...llmResponse.metadata,
          model: 'template-fallback',
          provider: 'template'
        }
      };

      // Cache template response too (non-blocking)
      cacheResponse(query, queryEmbedding, templateResponse, language).catch(err => {
        console.error(`[${new Date().toISOString()}] Cache save failed:`, err.message);
      });

      return templateResponse;
    }
  }

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
 * Hybrid approach: vector similarity + keyword matching
 * Lower similarity threshold to include more relevant results
 */
async function searchSimilarChunks(queryEmbedding, topK = TOP_K, query = '') {
  const documents = await Document.find({ isProcessed: true }).lean();

  const results = [];
  const MIN_SIMILARITY = 0.1; // Low threshold to include more chunks
  const expectedDims = getEmbeddingDimension();
  let dimensionMismatchWarned = false;

  // Synonym map for BM/EN cross-language matching
  const synonyms = {
    'club': ['kelab', 'persatuan', 'societies', 'society', 'clubs', 'organization', 'organisasi'],
    'kelab': ['club', 'persatuan', 'societies', 'organization'],
    'persatuan': ['club', 'kelab', 'society', 'organization'],
    'gym': ['gimnasium', 'kecergasan', 'fitness', 'sports', 'sukan', 'recreation', 'rekreasi', 'centre'],
    'sukan': ['sports', 'gym', 'recreation', 'rekreasi', 'fitness', 'centre'],
    'sports': ['sukan', 'gym', 'recreation', 'rekreasi', 'fitness', 'centre'],
    'library': ['perpustakaan', 'pustaka', 'lib'],
    'perpustakaan': ['library', 'pustaka'],
    'hostel': ['asrama', 'kolej', 'kediaman', 'accommodation', 'residential'],
    'asrama': ['hostel', 'kolej', 'kediaman', 'residential'],
    'peraturan': ['rules', 'regulations', 'discipline', 'disiplin', 'kaedah', 'tatatertib'],
    'rules': ['peraturan', 'regulations', 'discipline', 'disiplin', 'kaedah'],
    'disiplin': ['discipline', 'peraturan', 'rules', 'tatatertib', 'kaedah'],
    'clinic': ['klinik', 'kesihatan', 'health', 'medical', 'pusat', 'hospital'],
    'klinik': ['clinic', 'health', 'kesihatan', 'medical', 'pusat'],
    'health': ['kesihatan', 'klinik', 'clinic', 'medical', 'pusat', 'centre'],
    'kesihatan': ['health', 'klinik', 'clinic', 'medical', 'centre'],
    'wifi': ['internet', 'rangkaian', 'network', 'ict', 'eduroam'],
    'internet': ['wifi', 'rangkaian', 'network', 'ict', 'eduroam'],
    'bus': ['bas', 'shuttle', 'pengangkutan', 'transport', 'transportation'],
    'transport': ['pengangkutan', 'bas', 'bus', 'shuttle', 'transportation'],
    'fees': ['yuran', 'bayaran', 'payment', 'kewangan', 'tuition', 'bayar'],
    'yuran': ['fees', 'bayaran', 'payment', 'tuition', 'bayar', 'kewangan'],
    'bayar': ['payment', 'fees', 'yuran', 'kewangan', 'cara', 'kaedah'],
    'payment': ['bayar', 'bayaran', 'fees', 'yuran', 'fpx', 'bank'],
    'gpa': ['cgpa', 'gred', 'grade', 'akademik', 'pointer', 'kedudukan'],
    'exam': ['peperiksaan', 'result', 'keputusan', 'examination'],
    'result': ['keputusan', 'exam', 'peperiksaan', 'semak'],
    'course': ['kursus', 'subjek', 'program', 'programme', 'pengajian'],
    'kursus': ['course', 'subjek', 'program', 'programme'],
    'computer': ['komputer', 'computing', 'software', 'it', 'teknologi'],
    'computing': ['computer', 'komputer', 'software', 'fakulti'],
    'register': ['daftar', 'pendaftaran', 'registration'],
    'daftar': ['register', 'pendaftaran', 'registration'],
    'scholarship': ['biasiswa', 'bantuan', 'financial', 'aid'],
    'biasiswa': ['scholarship', 'bantuan', 'financial'],
    'graduate': ['graduan', 'konvokesyen', 'convocation', 'tamat'],
    'convocation': ['konvokesyen', 'graduan', 'graduate', 'majlis'],
    'konvokesyen': ['convocation', 'graduan', 'graduate', 'majlis'],
    'counselling': ['kaunseling', 'bimbingan', 'wellness', 'sejahtera'],
    'kaunseling': ['counselling', 'bimbingan', 'wellness', 'sejahtera'],
    'parking': ['tempat letak kereta', 'parkir'],
    'contact': ['hubungi', 'telefon', 'phone', 'nombor', 'number'],
    'telefon': ['contact', 'phone', 'hubungi', 'nombor'],
  };

  // Extract keywords from query + expand with synonyms
  const rawWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const queryWords = [...new Set([...rawWords, ...rawWords.flatMap(w => synonyms[w] || [])])];


  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    // Document-level title boost: if query keywords match doc title, boost ALL chunks
    const titleLower = (doc.title || '').toLowerCase();
    let titleBoost = 0;
    if (queryWords.length > 0) {
      let titleHits = 0;
      for (const word of queryWords) {
        if (titleLower.includes(word)) titleHits++;
      }
      // Strong title boost (up to 0.4) — title match is very strong signal
      titleBoost = Math.min(0.4, (titleHits / queryWords.length) * 0.5);
    }

    for (const chunk of doc.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      // Warn once if stored embeddings have different dimensions (needs re-ingestion)
      if (!dimensionMismatchWarned && chunk.embedding.length !== expectedDims) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Embedding dimension mismatch: query=${expectedDims}d, stored=${chunk.embedding.length}d. Run GET /api/admin/reingest to re-embed documents with Jina AI.`);
        dimensionMismatchWarned = true;
      }

      let score = cosineSimilarity(queryEmbedding, chunk.embedding);

      // Apply title boost to all chunks in matching document
      score += titleBoost;

      // Keyword boost: if query words appear in chunk content, boost score
      if (queryWords.length > 0) {
        const chunkLower = (chunk.content || '').toLowerCase();
        let keywordHits = 0;
        for (const word of queryWords) {
          if (chunkLower.includes(word)) keywordHits++;
        }
        // Chunk keyword boost (up to 0.35 bonus)
        const keywordBoost = Math.min(0.35, (keywordHits / queryWords.length) * 0.4);
        score += keywordBoost;
      }

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
