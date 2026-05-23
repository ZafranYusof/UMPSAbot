/**
 * RAG (Retrieval Augmented Generation) Service
 * Orchestrates the full RAG pipeline: embed query → search → generate
 */

const { generateEmbedding, cosineSimilarity, isJinaEnabled, getEmbeddingDimension } = require('./embedding');
const { generateResponse, generateSuggestions, estimateConfidence } = require('./llm');
const { generateTemplateFallback } = require('./templateFallback');
const { chunkText, extractText } = require('./chunking');
const { classifyIntent, getGreetingResponse, extractCompareItems } = require('./intent');
const { getCachedResponse, cacheResponse } = require('./cache');
const { flagLowConfidence } = require('./feedbackLoop');
const { processWithMalaya } = require('./malaya');
const Document = require('../models/Document');
const UserPreference = require('../models/UserPreference');

const TOP_K = parseInt(process.env.TOP_K_RESULTS) || 8;
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.15;
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
  const ragStart = Date.now();
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
  const intentClassifyStart = Date.now();
  const intentResult = classifyIntent(query);
  console.log(`[${new Date().toISOString()}] RAG intent classify: ${Date.now() - intentClassifyStart}ms`);

  // Step 2: Handle greetings without RAG (skip caching for greetings)
  if (!intentResult.needsRAG) {
    // Timetable intent with course codes → use planner
    if (intentResult.intent === 'timetable' && intentResult.courseCodes?.length >= 2) {
      try {
        const { findValidCombinations } = require('./timetable');
        const result = await findValidCombinations(intentResult.courseCodes);
        const validCombos = result.valid || [];
        let content;
        if (validCombos.length === 0) {
          content = language === 'en'
            ? `No valid non-clashing combinations found for: ${intentResult.courseCodes.join(', ')}. ${result.missingCourses ? 'Missing courses: ' + result.missingCourses.join(', ') + '. ' : ''}Some courses may have time conflicts in all available sections.`
            : `Tiada kombinasi jadual yang tidak clash ditemui untuk: ${intentResult.courseCodes.join(', ')}. ${result.missingCourses ? 'Kursus tidak dijumpai: ' + result.missingCourses.join(', ') + '. ' : ''}Sesetengah kursus mungkin bertembung dalam semua seksyen yang ada.`;
        } else {
          const topCombos = validCombos.slice(0, 3);
          content = language === 'en'
            ? `Found ${validCombos.length} valid timetable combination(s) for ${intentResult.courseCodes.join(', ')}:\n\n`
            : `Ditemui ${validCombos.length} kombinasi jadual yang valid untuk ${intentResult.courseCodes.join(', ')}:\n\n`;
          topCombos.forEach((combo, idx) => {
            content += `**Option ${idx + 1}:**\n`;
            combo.sections.forEach(section => {
              section.slots.forEach(slot => {
                content += `- ${section.courseCode} (Section ${section.section}): ${slot.day} ${slot.startTime}-${slot.endTime} @ ${slot.venue || 'TBA'}\n`;
              });
            });
            content += '\n';
          });
          if (validCombos.length > 3) {
            content += language === 'en'
              ? `...and ${validCombos.length - 3} more combinations available.`
              : `...dan ${validCombos.length - 3} lagi kombinasi tersedia.`;
          }
        }
        return {
          content,
          sources: [],
          confidence: 0.95,
          isLowConfidence: false,
          intent: 'timetable',
          suggestions: language === 'en'
            ? ['Show me more combinations', 'What other courses are available?', 'How to register courses?']
            : ['Tunjuk lagi kombinasi', 'Apa kursus lain yang ada?', 'Macam mana nak daftar kursus?'],
          handoff: false,
          handoffContact: null,
          timetableResult: result
        };
      } catch (err) {
        console.error('Timetable planner error:', err.message);
        // Fall through to guidance message
      }
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
    const cacheStart = Date.now();
    const cached = await getCachedResponse(query, language);
    console.log(`[${new Date().toISOString()}] RAG cache lookup: ${Date.now() - cacheStart}ms`);
    if (cached) {
      console.log(`[${new Date().toISOString()}] Cache HIT for: "${query.substring(0, 50)}..." | Total: ${Date.now() - ragStart}ms`);
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

  // Step 3b: Enhance query with Malaya NLP before embedding
  let enhancedQuery = query;
  try {
    const malayaResult = await processWithMalaya(query);
    if (malayaResult && malayaResult.expanded && malayaResult.expanded !== query.toLowerCase()) {
      enhancedQuery = malayaResult.expanded;
      console.log(`[${new Date().toISOString()}] Malaya enhanced query: "${query}" → "${enhancedQuery}"`);
    }
  } catch (err) {
    // Non-critical
  }

  // Step 3c: Generate embedding for the (enhanced) query
  const embedStart = Date.now();
  const queryEmbedding = await generateEmbedding(enhancedQuery);
  console.log(`[${new Date().toISOString()}] RAG embedding: ${Date.now() - embedStart}ms`);

  // Step 4: Search for similar chunks in the vector store
  // For comparison intent, search for BOTH items separately and combine
  const searchStart = Date.now();
  let searchResults;

  if (intentResult.intent === 'comparison' && intentResult.compareItems && intentResult.compareItems.length === 2) {
    const [itemA, itemB] = intentResult.compareItems;
    console.log(`[${new Date().toISOString()}] Comparison search: "${itemA}" vs "${itemB}"`);

    // Generate embeddings for each item
    const [embeddingA, embeddingB] = await Promise.all([
      generateEmbedding(itemA),
      generateEmbedding(itemB)
    ]);

    // Search for each item separately
    const halfK = Math.ceil(topK / 2);
    const [resultsA, resultsB] = await Promise.all([
      searchSimilarChunks(embeddingA, halfK, itemA),
      searchSimilarChunks(embeddingB, halfK, itemB)
    ]);

    // Also search with the full query for broader context
    const resultsQuery = await searchSimilarChunks(queryEmbedding, halfK, query);

    // Combine and deduplicate results (by chunk content to avoid duplicates)
    const seen = new Set();
    searchResults = [];
    for (const result of [...resultsA, ...resultsB, ...resultsQuery]) {
      const key = `${result.documentId}-${result.chunk.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        searchResults.push(result);
      }
    }

    // Sort by score and limit to topK
    searchResults.sort((a, b) => b.score - a.score);
    searchResults = searchResults.slice(0, topK);

    console.log(`[${new Date().toISOString()}] Comparison search: ${resultsA.length} for "${itemA}", ${resultsB.length} for "${itemB}", ${resultsQuery.length} from full query | Combined: ${searchResults.length}`);
  } else {
    searchResults = await searchSimilarChunks(queryEmbedding, topK, query);
  }
  console.log(`[${new Date().toISOString()}] RAG vector search: ${Date.now() - searchStart}ms | Results: ${searchResults.length}`);

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

  // Step 7: If confidence is too low and no results at all, provide general guidance fallback
  if (confidence < CONFIDENCE_THRESHOLD && searchResults.length === 0) {
    return {
      content: getLowConfidenceResponse(language, intentResult.intent),
      sources: [],
      confidence,
      isLowConfidence: true,
      intent: intentResult.intent,
      suggestions: getLowConfidenceSuggestions(language, intentResult.intent),
      handoff,
      handoffContact
    };
  }

  // Step 7b: If confidence is low but we DO have search results, still use them with a disclaimer
  // This prevents the bot from saying "tak jumpa" when there ARE relevant docs
  if (confidence < CONFIDENCE_THRESHOLD && searchResults.length > 0) {
    // Continue to Step 8 - let the LLM use whatever context we found
    // The disclaimer will be added in Step 10
    console.log(`[${new Date().toISOString()}] Low confidence (${confidence.toFixed(3)}) but found ${searchResults.length} results - proceeding with context`);
  }

  // Step 8: Format context texts with source labels for LLM
  const contexts = searchResults.map((r, i) => {
    return `Document: ${r.documentTitle}\nContent: ${r.chunk.content}`;
  });

  // Step 9: Generate response using LLM with retrieved context
  const llmStart = Date.now();
  const llmResponse = await generateResponse(query, contexts, {
    language,
    conversationHistory,
    intent: intentResult.intent,
    userContext,
    compareItems: intentResult.compareItems || null
  });
  console.log(`[${new Date().toISOString()}] RAG LLM generation: ${Date.now() - llmStart}ms`);

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

  // Step 10: Post-process — catch LLM saying "tak jumpa" when we have context
  let responseContent = llmResponse.content;
  if (searchResults.length > 0 && responseContent) {
    const rejectPatterns = /tak jumpa|tidak menemui|tiada maklumat|tidak pasti|don't have.*information|no information|tidak mempunyai/i;
    if (rejectPatterns.test(responseContent.substring(0, 150))) {
      // LLM rejected despite having context — use template fallback instead
      console.log(`[${new Date().toISOString()}] LLM falsely rejected (said tak jumpa with ${searchResults.length} results) — using template fallback`);
      const templateResult = generateTemplateFallback(searchResults, language);
      if (templateResult) {
        responseContent = templateResult.content;
      }
    }
  }

  // Step 10b: Add disclaimer if low confidence (but still share the info!)
  if (confidence < CONFIDENCE_THRESHOLD) {
    const disclaimer = language === 'ms'
      ? '\n\nNota: Maklumat ni berdasarkan dokumen yang ada, tapi mungkin tak 100% tepat untuk situasi kau. Boleh double check dengan pejabat berkaitan ya.'
      : "\n\nNote: This information is based on available documents but may not be 100% accurate for your situation. You can double-check with the relevant office.";
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

  // Step 14: Flag low-confidence queries for knowledge base expansion (non-blocking)
  flagLowConfidence(query, language, confidence).catch(err => {
    console.error(`[${new Date().toISOString()}] FeedbackLoop flag failed:`, err.message);
  });

  console.log(`[${new Date().toISOString()}] RAG total pipeline: ${Date.now() - ragStart}ms`);
  return finalResult;
}

/**
 * Search for chunks similar to the query embedding
 * Hybrid approach: vector similarity + keyword matching
 * Lower similarity threshold to include more relevant results
 */
async function searchSimilarChunks(queryEmbedding, topK = TOP_K, query = '') {
  const searchStart = Date.now();
  const documents = await Document.find({ isProcessed: true }).lean();

  const results = [];
  const MIN_SIMILARITY = 0.1; // Low threshold to include more chunks
  const MAX_CHUNKS_TO_SCAN = 2000; // Cap scanning to avoid slow searches on large DBs
  let chunksScanned = 0;
  const expectedDims = getEmbeddingDimension();
  let dimensionMismatchWarned = false;

  // Comprehensive BM/EN synonym map for cross-language matching
  // Generated from Malaya NLP + manual UMPSA context pairs (75 entries)
  const synonyms = {
    'admission': ['kemasukan', 'masuk', 'syarat', 'requirements', 'entry', 'intake', 'upu', 'kelayakan', 'permohonan', 'apply'],
    'kemasukan': ['admission', 'masuk', 'syarat', 'requirements', 'entry', 'intake', 'upu', 'kelayakan', 'permohonan'],
    'syarat': ['requirements', 'kemasukan', 'admission', 'kelayakan', 'entry', 'criteria', 'minimum'],
    'masuk': ['admission', 'kemasukan', 'entry', 'intake', 'daftar', 'apply', 'permohonan'],
    'kelayakan': ['eligibility', 'syarat', 'requirements', 'kemasukan', 'admission', 'criteria'],
    'apply': ['mohon', 'permohonan', 'daftar', 'masuk', 'kemasukan'],
    'permohonan': ['application', 'apply', 'mohon', 'masuk', 'kemasukan'],
    'register': ['daftar', 'pendaftaran', 'registration', 'enrol', 'enroll'],
    'daftar': ['register', 'pendaftaran', 'registration', 'enrol', 'enroll'],
    'pendaftaran': ['registration', 'daftar', 'register', 'enrolment'],
    'course': ['kursus', 'subjek', 'subject', 'program', 'programme', 'pengajian'],
    'kursus': ['course', 'subjek', 'subject', 'program', 'programme'],
    'subjek': ['subject', 'course', 'kursus', 'mata pelajaran'],
    'fees': ['yuran', 'bayaran', 'payment', 'kewangan', 'tuition', 'bayar', 'caj'],
    'yuran': ['fees', 'bayaran', 'payment', 'tuition', 'bayar', 'kewangan', 'caj'],
    'bayar': ['payment', 'fees', 'yuran', 'kewangan', 'cara', 'kaedah', 'online', 'fpx'],
    'payment': ['bayar', 'bayaran', 'fees', 'yuran', 'fpx', 'bank', 'online'],
    'scholarship': ['biasiswa', 'bantuan', 'financial', 'aid', 'ptptn', 'dermasiswa'],
    'biasiswa': ['scholarship', 'bantuan', 'financial', 'ptptn', 'dermasiswa'],
    'ptptn': ['pinjaman', 'loan', 'biasiswa', 'scholarship', 'bantuan'],
    'gpa': ['cgpa', 'gred', 'grade', 'akademik', 'pointer', 'kedudukan', 'purata'],
    'graduate': ['graduan', 'konvokesyen', 'convocation', 'tamat', 'grad', 'bergraduat'],
    'grad': ['graduate', 'graduan', 'tamat', 'bergraduat', 'konvokesyen'],
    'exam': ['peperiksaan', 'result', 'keputusan', 'examination', 'ujian'],
    'peperiksaan': ['exam', 'examination', 'ujian', 'result', 'keputusan'],
    'result': ['keputusan', 'exam', 'peperiksaan', 'semak', 'gred'],
    'tukar': ['change', 'transfer', 'pindah', 'pertukaran', 'switch'],
    'pindah': ['transfer', 'tukar', 'change', 'pertukaran'],
    'transfer': ['tukar', 'pindah', 'pertukaran', 'change'],
    'library': ['perpustakaan', 'pustaka', 'lib', 'buku', 'pinjam'],
    'perpustakaan': ['library', 'pustaka', 'buku', 'pinjam'],
    'hostel': ['asrama', 'kolej', 'kediaman', 'accommodation', 'residential', 'bilik'],
    'asrama': ['hostel', 'kolej', 'kediaman', 'residential', 'bilik'],
    'clinic': ['klinik', 'kesihatan', 'health', 'medical', 'pusat', 'hospital', 'doktor'],
    'klinik': ['clinic', 'health', 'kesihatan', 'medical', 'pusat', 'doktor'],
    'health': ['kesihatan', 'klinik', 'clinic', 'medical', 'pusat', 'centre'],
    'kesihatan': ['health', 'klinik', 'clinic', 'medical', 'centre'],
    'gym': ['gimnasium', 'kecergasan', 'fitness', 'sports', 'sukan', 'recreation', 'rekreasi', 'centre'],
    'sukan': ['sports', 'gym', 'recreation', 'rekreasi', 'fitness', 'centre', 'gimnasium'],
    'sports': ['sukan', 'gym', 'recreation', 'rekreasi', 'fitness', 'centre'],
    'wifi': ['internet', 'rangkaian', 'network', 'ict', 'eduroam', 'password'],
    'internet': ['wifi', 'rangkaian', 'network', 'ict', 'eduroam'],
    'bus': ['bas', 'shuttle', 'pengangkutan', 'transport', 'transportation'],
    'bas': ['bus', 'shuttle', 'pengangkutan', 'transport'],
    'transport': ['pengangkutan', 'bas', 'bus', 'shuttle', 'transportation'],
    'counselling': ['kaunseling', 'kaunselor', 'bimbingan', 'wellness', 'sejahtera', 'counselor'],
    'kaunseling': ['counselling', 'kaunselor', 'bimbingan', 'wellness', 'sejahtera', 'counselor'],
    'kaunselor': ['counselor', 'kaunseling', 'counselling', 'bimbingan'],
    'club': ['kelab', 'persatuan', 'societies', 'society', 'clubs', 'organization', 'organisasi'],
    'kelab': ['club', 'persatuan', 'societies', 'organization'],
    'persatuan': ['club', 'kelab', 'society', 'organization'],
    'peraturan': ['rules', 'regulations', 'discipline', 'disiplin', 'kaedah', 'tatatertib'],
    'rules': ['peraturan', 'regulations', 'discipline', 'disiplin', 'kaedah'],
    'disiplin': ['discipline', 'peraturan', 'rules', 'tatatertib', 'kaedah'],
    'convocation': ['konvokesyen', 'graduan', 'graduate', 'majlis', 'grad'],
    'konvokesyen': ['convocation', 'graduan', 'graduate', 'majlis', 'grad'],
    'waktu': ['time', 'masa', 'jam', 'pukul', 'operasi', 'schedule'],
    'jadual': ['schedule', 'timetable', 'waktu', 'masa'],
    'schedule': ['jadual', 'timetable', 'waktu', 'masa'],
    'open': ['buka', 'operasi', 'waktu', 'masa', 'available'],
    'buka': ['open', 'operasi', 'waktu', 'masa'],
    'operasi': ['operation', 'waktu', 'buka', 'open', 'hours'],
    'contact': ['hubungi', 'telefon', 'phone', 'nombor', 'number', 'email'],
    'hubungi': ['contact', 'telefon', 'phone', 'nombor', 'email'],
    'telefon': ['contact', 'phone', 'hubungi', 'nombor'],
    'pensyarah': ['lecturer', 'professor', 'dr', 'penasihat', 'akademik'],
    'lecturer': ['pensyarah', 'professor', 'dr', 'penasihat'],
    'parking': ['tempat letak kereta', 'parkir', 'kenderaan'],
    'makanan': ['food', 'makan', 'cafe', 'kafeteria', 'kantin', 'kedai'],
    'cafe': ['kafeteria', 'kantin', 'makanan', 'food', 'makan', 'kedai'],
    'kantin': ['cafe', 'kafeteria', 'makanan', 'food', 'makan'],
    'computer': ['komputer', 'computing', 'software', 'it', 'teknologi'],
    'computing': ['computer', 'komputer', 'software', 'fakulti'],
    'sem': ['semester', 'penggal'],
    'lect': ['lecturer', 'pensyarah'],
  };

  // Extract keywords from query
  const rawWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Malaya NLP: get stems for better keyword matching (non-blocking, graceful fallback)
  let malayaStems = [];
  try {
    const malayaResult = await processWithMalaya(query);
    if (malayaResult && malayaResult.stems) {
      malayaStems = malayaResult.stems.filter(s => s.length > 2);
      console.log(`[${new Date().toISOString()}] Malaya stems: [${malayaStems.join(', ')}]`);
    }
  } catch (err) {
    // Non-critical — continue without stems
  }

  // Normalize Manglish shortforms/slang to standard BM/EN
  const shortformMap = {
    'brapa': 'berapa', 'brape': 'berapa',
    'nk': 'nak',
    'mcm': 'macam', 'mcam': 'macam',
    'cmna': 'macam mana', 'cmne': 'macam mana',
    'dkt': 'dekat', 'dkat': 'dekat',
    'utk': 'untuk',
    'dgn': 'dengan',
    'yg': 'yang',
    'ni': 'ini',
    'tu': 'itu',
    'je': 'sahaja', 'ja': 'sahaja',
    'blh': 'boleh', 'bole': 'boleh',
    'npe': 'kenapa', 'knpe': 'kenapa', 'knp': 'kenapa',
    'psl': 'pasal',
    'sbb': 'sebab',
    'lg': 'lagi', 'lgi': 'lagi',
    'dh': 'sudah', 'dah': 'sudah',
    'blm': 'belum',
    'ade': 'ada',
    'xde': 'tiada', 'takde': 'tiada', 'xda': 'tiada',
    'aq': 'saya', 'aku': 'saya',
    'ko': 'awak', 'kau': 'awak',
    'sem': 'semester',
    'lect': 'lecturer',
    'lib': 'library'
  };

  // Add normalized forms (keep originals too for broader matching)
  const normalizedWords = [];
  for (const word of rawWords) {
    normalizedWords.push(word); // keep original
    if (shortformMap[word]) {
      // Add the full form(s) — handle multi-word expansions
      const expanded = shortformMap[word].split(/\s+/);
      normalizedWords.push(...expanded);
    }
  }
  const uniqueNormalized = [...new Set(normalizedWords)];

  // Expand with synonyms (using normalized words for better matching)
  // Also include Malaya stems for root-word matching (e.g. pendaftaran → daftar)
  const queryWords = [...new Set([...uniqueNormalized, ...uniqueNormalized.flatMap(w => synonyms[w] || []), ...malayaStems])];


  for (const doc of documents) {
    if (!doc.chunks || doc.chunks.length === 0) continue;

    // Cap total chunks scanned to avoid slow searches
    if (chunksScanned >= MAX_CHUNKS_TO_SCAN) break;

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
      chunksScanned++;

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
  console.log(`[${new Date().toISOString()}] searchSimilarChunks: scanned ${chunksScanned} chunks from ${documents.length} docs in ${Date.now() - searchStart}ms`);
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
 * Get low confidence response - still tries to be helpful with general guidance
 */
function getLowConfidenceResponse(language, intent = 'general') {
  const contactInfo = HANDOFF_CONTACTS[intent] || HANDOFF_CONTACTS.general;
  
  if (language === 'ms') {
    let response = 'Hmm, tak jumpa maklumat spesifik pasal ni dalam dokumen yang ada.';
    
    // Add intent-specific general guidance
    switch (intent) {
      case 'academic':
        response += ' Tapi untuk hal akademik, biasanya boleh check kat portal E-Comm (https://std-comm.ump.edu.my) atau Student Portal. Kalau tak jumpa jugak, boleh terus pergi Pejabat Akademik.';
        break;
      case 'hostel':
        response += ' Untuk hal kolej/hostel, biasanya boleh check kat portal SMAS atau hubungi pejabat kolej kediaman. Kalau nak apply atau ada masalah bilik, pergi je terus office kolej.';
        break;
      case 'fees':
        response += ' Untuk hal yuran/bayaran, boleh check kat portal pelajar bahagian kewangan. Kalau ada masalah bayaran, hubungi Pejabat Bendahari.';
        break;
      case 'registration':
        response += ' Untuk pendaftaran, biasanya semua buat online kat portal E-Comm. Kalau ada masalah, boleh pergi Pejabat Pendaftar.';
        break;
      default:
        response += ' Tapi boleh cuba check kat Student Portal atau pergi One Stop Centre (OSC) untuk bantuan.';
    }
    
    response += `\n\nKalau nak cakap terus dengan staff, boleh hubungi ${contactInfo.office} (${contactInfo.phone}) atau email ${contactInfo.email}.`;
    return response;
  }
  
  let response = "I don't have specific information about this in my documents.";
  
  switch (intent) {
    case 'academic':
      response += ' For academic matters, you can usually check the E-Comm portal (https://std-comm.ump.edu.my) or Student Portal. If you can\'t find it there, visit the Academic Office directly.';
      break;
    case 'hostel':
      response += ' For hostel/residential matters, check the SMAS portal or contact the Residential College office. For room issues or applications, visit the college office directly.';
      break;
    case 'fees':
      response += ' For fees and payment matters, check the student portal finance section. For payment issues, contact the Bursar\'s Office.';
      break;
    case 'registration':
      response += ' For registration matters, most things are done online via E-Comm portal. For issues, visit the Registrar\'s Office.';
      break;
    default:
      response += ' You can try checking the Student Portal or visit the One Stop Centre (OSC) for assistance.';
  }
  
  response += `\n\nFor direct assistance, contact ${contactInfo.office} (${contactInfo.phone}) or email ${contactInfo.email}.`;
  return response;
}

/**
 * Get helpful suggestions when confidence is low
 */
function getLowConfidenceSuggestions(language, intent = 'general') {
  if (language === 'ms') {
    switch (intent) {
      case 'academic':
        return ['Macam mana nak daftar kursus?', 'Apa syarat graduation?', 'Macam mana nak check result?'];
      case 'hostel':
        return ['Macam mana nak apply hostel?', 'Apa peraturan kolej?', 'Macam mana nak tukar bilik?'];
      case 'fees':
        return ['Berapa yuran semester?', 'Macam mana nak bayar yuran?', 'Ada biasiswa tak?'];
      default:
        return ['Macam mana nak daftar kursus?', 'Berapa yuran semester?', 'Macam mana nak apply hostel?'];
    }
  }
  switch (intent) {
    case 'academic':
      return ['How to register courses?', 'What are graduation requirements?', 'How to check results?'];
    case 'hostel':
      return ['How to apply for hostel?', 'What are college rules?', 'How to change room?'];
    case 'fees':
      return ['How much are semester fees?', 'How to pay fees?', 'Are there scholarships?'];
    default:
      return ['How to register courses?', 'What are semester fees?', 'How to apply for hostel?'];
  }
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
