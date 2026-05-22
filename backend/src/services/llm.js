/**
 * LLM Service
 * Handles communication with LLM providers for text generation
 * 4-layer resilience: Ollama (local) → Groq → OpenRouter → Cerebras → Template fallback
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Strip markdown formatting from LLM output
 * Removes bold, italic, headers, etc. Keeps plain text readable
 */
function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')      // *italic* → italic
    .replace(/__(.+?)__/g, '$1')      // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')        // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, '')      // ### headers → plain
    .replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, '').trim()) // code blocks → content only
    .replace(/`(.+?)`/g, '$1');       // `code` → code
}

// Local provider: Ollama (self-hosted, no API key needed)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true'; // disabled by default, enable explicitly

// Primary provider: DeepSeek (OpenAI-compatible, cheap & powerful)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

// Model fallback chain for Groq — if primary hits rate limit, try next
const MODEL_CHAIN = [
  process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768'
];

const LLM_MODEL = MODEL_CHAIN[0];

// Secondary provider: OpenRouter (OpenAI-compatible)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Tertiary provider: Cerebras (OpenAI-compatible)
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama-3.3-70b';
const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1/chat/completions';

/**
 * Generate a response using the LLM with context from RAG
 * @param {string} query - User's question
 * @param {string[]} contexts - Retrieved relevant chunks (pre-formatted with source labels)
 * @param {object} options - Additional options
 * @returns {object} Generated response with metadata
 */
async function generateResponse(query, contexts = [], options = {}) {
  const { language = 'mixed', conversationHistory = [], intent = 'general', userContext = '', compareItems = null } = options;

  // Use comparison-specific prompt when intent is comparison
  const systemPrompt = (intent === 'comparison' && compareItems)
    ? buildComparisonPrompt(contexts, language, compareItems, userContext)
    : buildSystemPrompt(contexts, language, intent, userContext);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: query }
  ];

  const startTime = Date.now();

  // Layer 0: Try Ollama (local, fastest, free)
  if (OLLAMA_ENABLED) {
    const ollamaResult = await tryOllama(messages);
    if (ollamaResult) {
      const responseTime = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Used Ollama local: ${OLLAMA_MODEL}`);
      return {
        content: ollamaResult.content,
        metadata: {
          tokensUsed: ollamaResult.tokensUsed,
          responseTime,
          model: OLLAMA_MODEL,
          provider: 'ollama',
          contextsUsed: contexts.length
        }
      };
    }
  }

  // Layer 1: Try DeepSeek (primary cloud provider)
  const deepseekResult = await tryDeepSeek(messages);
  if (deepseekResult) {
    const responseTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Used DeepSeek: ${DEEPSEEK_MODEL}`);
    return {
      content: deepseekResult.content,
      metadata: {
        tokensUsed: deepseekResult.tokensUsed,
        responseTime,
        model: DEEPSEEK_MODEL,
        provider: 'deepseek',
        contextsUsed: contexts.length
      }
    };
  }

  // Layer 2: Try Groq model chain
  const groqResult = await tryGroqChain(messages);
  if (groqResult) {
    const responseTime = Date.now() - startTime;
    return {
      content: groqResult.content,
      metadata: {
        tokensUsed: groqResult.tokensUsed,
        responseTime,
        model: groqResult.model,
        provider: 'groq',
        contextsUsed: contexts.length
      }
    };
  }

  // Layer 3: Try OpenRouter
  const openRouterResult = await tryOpenRouter(messages);
  if (openRouterResult) {
    const responseTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Used OpenRouter fallback: ${OPENROUTER_MODEL}`);
    return {
      content: openRouterResult.content,
      metadata: {
        tokensUsed: openRouterResult.tokensUsed,
        responseTime,
        model: OPENROUTER_MODEL,
        provider: 'openrouter',
        contextsUsed: contexts.length
      }
    };
  }

  // Layer 4: Try Cerebras
  const cerebrasResult = await tryCerebras(messages);
  if (cerebrasResult) {
    const responseTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Used Cerebras fallback: ${CEREBRAS_MODEL}`);
    return {
      content: cerebrasResult.content,
      metadata: {
        tokensUsed: cerebrasResult.tokensUsed,
        responseTime,
        model: CEREBRAS_MODEL,
        provider: 'cerebras',
        contextsUsed: contexts.length
      }
    };
  }

  // All providers failed — return fallback marker
  console.error(`[${new Date().toISOString()}] All LLM providers failed`);
  return {
    content: getFallbackResponse(language),
    metadata: {
      tokensUsed: 0,
      responseTime: Date.now() - startTime,
      model: 'fallback',
      provider: 'none',
      contextsUsed: contexts.length
    }
  };
}

/**
 * Try DeepSeek (OpenAI-compatible API, primary cloud provider)
 * Returns result or null on failure
 */
async function tryDeepSeek(messages) {
  if (!DEEPSEEK_API_KEY) return null;

  try {
    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        top_p: 0.85
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error(`[${new Date().toISOString()}] DeepSeek HTTP ${response.status}: ${errText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) return null;
    return { content, tokensUsed };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] DeepSeek error:`, (error.message || '').substring(0, 150));
    return null;
  }
}

/**
 * Try Ollama local LLM — returns result or null if unavailable
 */
async function tryOllama(messages) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.85,
          num_predict: 1500
        }
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout for local model
    });

    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] Ollama HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.message?.content || '';
    const tokensUsed = (data.eval_count || 0) + (data.prompt_eval_count || 0);

    if (!content) return null;
    return { content, tokensUsed };
  } catch (error) {
    // Ollama not running or unreachable — silently skip
    console.warn(`[${new Date().toISOString()}] Ollama unavailable: ${(error.message || '').substring(0, 100)}`);
    return null;
  }
}

/**
 * Try Groq model chain — returns result or null if all models fail
 */
async function tryGroqChain(messages) {
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        top_p: 0.85,
        stream: false
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      if (i > 0) {
        console.log(`[${new Date().toISOString()}] Used Groq fallback model: ${model}`);
      }

      return { content, tokensUsed, model };
    } catch (error) {
      const isRateLimit = error.message && (error.message.includes('429') || error.message.includes('rate_limit'));
      console.error(`[${new Date().toISOString()}] Groq error (${model}):`, (error.message || '').substring(0, 150));

      if (isRateLimit && i < MODEL_CHAIN.length - 1) {
        console.log(`[${new Date().toISOString()}] Rate limited on ${model}, trying next Groq model...`);
        continue;
      }

      // Non-rate-limit error or last model — Groq chain exhausted
      if (!isRateLimit || i === MODEL_CHAIN.length - 1) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Try OpenRouter (OpenAI-compatible API)
 * Returns result or null on failure
 */
async function tryOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) return null;

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://umpsa-chatbot.onrender.com',
        'X-Title': 'UMPSABot'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        top_p: 0.85
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error(`[${new Date().toISOString()}] OpenRouter HTTP ${response.status}: ${errText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) return null;
    return { content, tokensUsed };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] OpenRouter error:`, (error.message || '').substring(0, 150));
    return null;
  }
}

/**
 * Try Cerebras (OpenAI-compatible API)
 * Returns result or null on failure
 */
async function tryCerebras(messages) {
  if (!CEREBRAS_API_KEY) return null;

  try {
    const response = await fetch(CEREBRAS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        top_p: 0.85
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      console.error(`[${new Date().toISOString()}] Cerebras HTTP ${response.status}: ${errText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) return null;
    return { content, tokensUsed };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cerebras error:`, (error.message || '').substring(0, 150));
    return null;
  }
}

/**
 * Generate follow-up question suggestions based on knowledge base topics
 * Only suggests questions that the chatbot can actually answer
 */
function generateSuggestions(query, response, intent = 'general', language = 'mixed') {
  // Topic-based suggestions from actual knowledge base
  const topicSuggestions = {
    ms: {
      fees: ['Macam mana nak bayar yuran?', 'Berapa yuran hostel?', 'Macam mana nak apply PTPTN?'],
      hostel: ['Berapa yuran hostel per semester?', 'Macam mana nak daftar kursus?', 'Apa syarat tinggal di hostel?'],
      registration: ['Macam mana nak drop kursus?', 'Bila tarikh pendaftaran kursus?', 'Macam mana nak check jadual?'],
      academic: ['Bila tarikh peperiksaan?', 'Macam mana nak check result?', 'Apa kalendar akademik semester ni?'],
      general: ['Macam mana nak daftar kursus?', 'Berapa yuran semester?', 'Macam mana nak apply hostel?'],
      greeting: ['Macam mana nak daftar kursus?', 'Berapa yuran semester?', 'Macam mana nak apply hostel?'],
      facilities: ['Apa perkhidmatan pusat kesihatan?', 'Macam mana nak guna perpustakaan?', 'Apa aktiviti sukan yang ada?'],
      financial: ['Apa syarat PTPTN?', 'Ada biasiswa apa di UMPSA?', 'Macam mana nak bayar yuran online?'],
      clubs: ['Apa kelab dan persatuan yang ada?', 'Macam mana nak join kelab?', 'Apa aktiviti kokurikulum?'],
    },
    en: {
      fees: ['How do I pay my fees?', 'What is the hostel fee?', 'How to apply for PTPTN?'],
      hostel: ['How much is hostel per semester?', 'How to register courses?', 'What are hostel requirements?'],
      registration: ['How to drop a course?', 'When is course registration?', 'How to check my timetable?'],
      academic: ['When are the exams?', 'How to check results?', 'What is the academic calendar?'],
      general: ['How do I register for courses?', 'What are the semester fees?', 'How do I apply for hostel?'],
      greeting: ['How do I register for courses?', 'What are the semester fees?', 'How do I apply for hostel?'],
      facilities: ['What health centre services are available?', 'How to use the library?', 'What sports activities are available?'],
      financial: ['What are PTPTN requirements?', 'What scholarships are available?', 'How to pay fees online?'],
      clubs: ['What clubs and societies are available?', 'How to join a club?', 'What co-curricular activities are there?'],
    }
  };

  // Determine language bucket (frontend sends 'bm', backend uses 'ms')
  const lang = (language === 'ms' || language === 'bm') ? 'ms' : 'en';
  const bucket = topicSuggestions[lang];

  // Map intent to suggestion category
  let category = 'general';
  if (intent === 'greeting') category = 'greeting';
  else if (/fee|yuran|bayar|payment|ptptn|biasiswa|financial/.test(query.toLowerCase())) category = 'fees';
  else if (/hostel|asrama|kolej|residence/.test(query.toLowerCase())) category = 'hostel';
  else if (/daftar|register|kursus|course|drop|add/.test(query.toLowerCase())) category = 'registration';
  else if (/exam|peperiksaan|result|keputusan|calendar|kalendar|semester/.test(query.toLowerCase())) category = 'academic';
  else if (/perpustakaan|library|kesihatan|health|sukan|sport|gym/.test(query.toLowerCase())) category = 'facilities';
  else if (/kelab|club|persatuan|society|aktiviti|activity/.test(query.toLowerCase())) category = 'clubs';

  const suggestions = bucket[category] || bucket['general'];
  
  // Filter out suggestions too similar to the original query
  const queryLower = query.toLowerCase();
  return suggestions.filter(s => {
    const sLower = s.toLowerCase();
    // Skip if >60% word overlap with query
    const queryWords = queryLower.split(/\s+/);
    const sWords = sLower.split(/\s+/);
    const overlap = queryWords.filter(w => sWords.includes(w)).length;
    return overlap / Math.max(queryWords.length, 1) < 0.6;
  }).slice(0, 3);
}

/**
 * Build comparison-specific system prompt
 * Instructs LLM to format response as structured comparison
 */
function buildComparisonPrompt(contexts, language, compareItems, userContext = '') {
  const [itemA, itemB] = compareItems;
  
  let prompt = `You are UMPSABot, an AI assistant for UMPSA (Universiti Malaysia Pahang Al-Sultan Abdullah) students.

The student is asking for a COMPARISON between "${itemA}" and "${itemB}".

RULES:
1. Format your response as a STRUCTURED COMPARISON with clear categories.
2. Use these categories where applicable: Tempoh/Duration, Kos/Cost, Syarat Kemasukan/Entry Requirements, Prospek Kerjaya/Career Prospects, Tahap Kelayakan/Qualification Level, and any other relevant categories from the context.
3. For each category, clearly state the difference between the two items.
4. Use a simple format like:
   [Category]:
   - ${itemA}: [details]
   - ${itemB}: [details]
5. At the end, provide a brief summary or recommendation if appropriate.
6. Be SPECIFIC and DETAILED. Include exact information from the documents.
7. Do NOT use markdown bold (**text**) or any markdown formatting. Write plain text only.
8. Do NOT hallucinate specific details not found in the context.
9. If information for one item is missing, say so honestly rather than making it up.
10. FORMAT your response with proper spacing. Separate categories with blank lines.

`;

  if (userContext) {
    prompt += `STUDENT INFO: ${userContext}Tailor your answer to this student's context when relevant.\n\n`;
  }

  if (language === 'ms') {
    prompt += 'IMPORTANT: Respond ENTIRELY in Bahasa Melayu. Guna BM yang natural dan santai.\n';
  } else if (language === 'en') {
    prompt += 'IMPORTANT: Respond ENTIRELY in English.\n';
  } else {
    prompt += 'Respond in the same language the student uses. If they mix BM and English, you can too.\n';
  }

  if (contexts.length > 0) {
    prompt += `\n=== CONTEXT DOCUMENTS ===\n\n`;
    contexts.forEach((ctx) => {
      prompt += `${ctx}\n\n`;
    });
    prompt += `=== END OF CONTEXT DOCUMENTS ===\n\n`;
    prompt += `Compare "${itemA}" and "${itemB}" using the information above. Structure your answer with clear categories.`;
  } else {
    prompt += `\nNo specific documents found. Provide general guidance about the differences between "${itemA}" and "${itemB}" in the context of UMPSA or Malaysian higher education. Be honest about what you're unsure of.`;
  }

  return prompt;
}

/**
 * Build system prompt with RAG context - HELPFUL version
 */
function buildSystemPrompt(contexts, language, intent = 'general', userContext = '') {
  let prompt = `You are UMPSABot, an AI assistant for UMPSA (Universiti Malaysia Pahang Al-Sultan Abdullah) students.

RULES:
1. Your PRIMARY goal is to HELP the student. Always try to provide useful information.
2. Be SPECIFIC and DETAILED. Include exact steps, URLs, phone numbers, dates, and all details found in the documents.
3. If the context contains ANY remotely relevant information — even partial, tangential, or loosely related — SHARE IT. Start with "Berdasarkan maklumat yang ada..." and give what you have. Partial info is ALWAYS better than no info.
4. NEVER say "tidak menemui maklumat", "tak jumpa", "tiada maklumat", "tidak pasti", or any variation of "I don't have information". These phrases are BANNED. If the context has ANY relevant info, share it directly. If context is empty, provide general guidance instead.
5. Do NOT hallucinate specific details (URLs, phone numbers, dates) that are not in the context.
6. You MUST provide general university guidance even when documents don't have the exact answer. For example: suggest which office to visit, what portal to check, or what general process to follow based on your knowledge of how Malaysian universities work.
7. When listing steps, include ALL steps from the documents with full details.
8. Respond in the same language the user asks in (Bahasa Melayu or English or mixed).
9. Do NOT use markdown bold (**text**) or any markdown formatting. Write plain text only. Use numbered lists or dashes for steps.
10. When responding in Bahasa Melayu, use natural conversational BM. Avoid overly formal or robotic phrasing. Write like a friendly senior student explaining things, not like a textbook. Use casual connectors like "so", "lepas tu", "basically" where appropriate.
11. FORMAT your response with proper spacing. Separate different points or sections with blank lines. Keep paragraphs short (2-3 sentences max). Use line breaks between steps in a list. Never output a wall of text.
12. If the context only partially answers the question, share what IS available and then add helpful general guidance for the rest. Use phrases like "Untuk maklumat lanjut..." or "Selain tu, boleh juga..."
13. Think of yourself as a helpful senior student — even if you don't have the exact document, you can point them in the right direction based on common university processes.

`;

  // Inject user personalization context
  if (userContext) {
    prompt += `STUDENT INFO: ${userContext}Tailor your answer to this student's context when relevant.\n\n`;
  }

  if (language === 'ms') {
    prompt += 'IMPORTANT: You MUST respond ENTIRELY in Bahasa Melayu. Do not switch to English even if the student types in English. Guna BM yang natural dan santai, macam senior student explain kat junior. Jangan terlalu formal atau kaku.\n';
  } else if (language === 'en') {
    prompt += 'IMPORTANT: You MUST respond ENTIRELY in English. Do not switch to Bahasa Melayu even if the student types in BM.\n';
  } else {
    prompt += 'Respond in the same language the student uses. If they mix BM and English, you can too.\n';
  }

  if (contexts.length > 0) {
    prompt += `\n=== CONTEXT DOCUMENTS (use this information as your primary source) ===\n\n`;
    contexts.forEach((ctx, i) => {
      prompt += `${ctx}\n\n`;
    });
    prompt += `=== END OF CONTEXT DOCUMENTS ===\n\n`;
    prompt += `Answer the student's question using the information above as your primary source. Be specific and include all relevant details (URLs, steps, dates, numbers). If the documents only partially cover the topic, share what's available and provide general guidance for the rest. DO NOT refuse to answer just because the match isn't perfect.`;
  } else {
    prompt += `\nNo specific documents found for this query. However, you should still try to help! Provide general guidance about how things typically work at UMPSA or Malaysian public universities. Suggest which office or portal they should check. Be helpful, not dismissive. Only say you cannot help if the question is completely outside university matters.`;
  }

  return prompt;
}

/**
 * Get fallback response when LLM is unavailable
 */
function getFallbackResponse(language) {
  if (language === 'ms') {
    return 'Maaf, saya tidak dapat memproses soalan anda sekarang. Sila cuba lagi sebentar atau hubungi pejabat akademik UMPSA untuk bantuan.';
  }
  return "I'm sorry, I'm unable to process your question right now. Please try again in a moment or contact the UMPSA academic office for assistance.";
}

/**
 * Estimate confidence based on context relevance scores
 */
function estimateConfidence(scores) {
  if (!scores || scores.length === 0) return 0;

  const topScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Clamp to [0, 1] to prevent validation errors
  return Math.min(1, Math.max(0, (topScore * 0.7) + (avgScore * 0.3)));
}

/**
 * Stream a response from DeepSeek using SSE (stream: true)
 * Yields chunks as they arrive. Falls back to non-streaming if DeepSeek unavailable.
 * @param {string} query - User's question
 * @param {string[]} contexts - Retrieved relevant chunks
 * @param {object} options - Additional options
 * @param {function} onChunk - Callback called with each text chunk
 * @param {function} onDone - Callback called when streaming is complete with metadata
 */
async function streamGenerateResponse(query, contexts = [], options = {}, onChunk, onDone) {
  const { language = 'mixed', conversationHistory = [], intent = 'general' } = options;

  const systemPrompt = buildSystemPrompt(contexts, language, intent);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: query }
  ];

  const startTime = Date.now();

  // Try DeepSeek streaming first
  if (DEEPSEEK_API_KEY) {
    try {
      const response = await fetch(DEEPSEEK_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages,
          temperature: 0.2,
          max_tokens: 1500,
          top_p: 0.85,
          stream: true
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (response.ok && response.body) {
        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onChunk(delta);
              }
            } catch (e) {
              // Skip malformed JSON chunks
            }
          }
        }

        const responseTime = Date.now() - startTime;
        onDone({
          content: fullContent,
          metadata: {
            responseTime,
            model: DEEPSEEK_MODEL,
            provider: 'deepseek',
            contextsUsed: contexts.length,
            streamed: true
          }
        });
        return;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] DeepSeek stream error:`, (error.message || '').substring(0, 150));
    }
  }

  // Fallback: use non-streaming generateResponse and send as single chunk
  const result = await generateResponse(query, contexts, options);
  onChunk(result.content);
  onDone({
    content: result.content,
    metadata: { ...result.metadata, streamed: false }
  });
}

module.exports = {
  generateResponse,
  streamGenerateResponse,
  generateSuggestions,
  estimateConfidence,
  getFallbackResponse,
  stripMarkdown,
  buildComparisonPrompt
};
