/**
 * LLM Service
 * Handles communication with LLM providers for text generation
 * 3-layer resilience: Groq → OpenRouter → Cerebras → Template fallback
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const { language = 'mixed', conversationHistory = [], intent = 'general' } = options;

  const systemPrompt = buildSystemPrompt(contexts, language, intent);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6),
    { role: 'user', content: query }
  ];

  const startTime = Date.now();

  // Layer 1: Try Groq model chain
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

  // Layer 2: Try OpenRouter
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

  // Layer 3: Try Cerebras
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
 * Generate follow-up question suggestions
 */
async function generateSuggestions(query, response, intent = 'general', language = 'mixed') {
  try {
    const langInstruction = language === 'ms'
      ? 'Generate questions in Bahasa Melayu.'
      : language === 'en'
        ? 'Generate questions in English.'
        : 'Generate questions in the same language mix as the original query.';

    let completion;
    for (const model of MODEL_CHAIN) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that suggests follow-up questions for UMPSA students. Given a question and answer, suggest 2-3 natural follow-up questions the student might want to ask next. ${langInstruction}

Return ONLY the questions, one per line, no numbering, no bullets, no extra text.`
            },
            {
              role: 'user',
              content: `Original question: ${query}\n\nAnswer given: ${response.substring(0, 500)}\n\nTopic category: ${intent}\n\nSuggest 2-3 follow-up questions:`
            }
          ],
          temperature: 0.7,
          max_tokens: 256,
          stream: false
        });
        break;
      } catch (err) {
        if (err.message && err.message.includes('429') && model !== MODEL_CHAIN[MODEL_CHAIN.length - 1]) continue;
        throw err;
      }
    }
    if (!completion) return [];

    const suggestionsText = completion.choices[0]?.message?.content || '';
    const suggestions = suggestionsText
      .split('\n')
      .map(s => s.replace(/^[\d\.\-\*\)]+\s*/, '').trim())
      .filter(s => s.length > 5 && s.length < 200)
      .slice(0, 3);

    return suggestions;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Suggestions generation error:`, error.message);
    return [];
  }
}

/**
 * Build system prompt with RAG context - STRICT version
 */
function buildSystemPrompt(contexts, language, intent = 'general') {
  let prompt = `You are UMPSABot, an AI assistant for UMPSA (Universiti Malaysia Pahang Al-Sultan Abdullah) students.

STRICT RULES:
1. ONLY answer based on the provided context documents below.
2. Be SPECIFIC and DETAILED. Include exact steps, URLs, phone numbers, dates, and all details found in the documents.
3. If the context doesn't contain enough information to answer the question, say "Maaf, saya tidak menemui maklumat ini dalam dokumen saya" or "Sorry, I don't have this information in my documents."
4. Do NOT make up or hallucinate any information. Do NOT add details that are not in the context.
5. Do NOT use general knowledge about universities. ONLY use what is in the context below.
6. When listing steps, include ALL steps from the documents with full details.
7. Respond in the same language the user asks in (Bahasa Melayu or English or mixed).

`;

  if (language === 'ms') {
    prompt += 'Respond in Bahasa Melayu.\n';
  } else if (language === 'en') {
    prompt += 'Respond in English.\n';
  } else {
    prompt += 'Respond in the same language the student uses. If they mix BM and English, you can too.\n';
  }

  if (contexts.length > 0) {
    prompt += `\n=== CONTEXT DOCUMENTS (use ONLY this information) ===\n\n`;
    contexts.forEach((ctx, i) => {
      prompt += `${ctx}\n\n`;
    });
    prompt += `=== END OF CONTEXT DOCUMENTS ===\n\n`;
    prompt += `Answer the student's question using ONLY the information above. Be specific and include all relevant details (URLs, steps, dates, numbers).`;
  } else {
    prompt += `\nNo documents found for this query. Tell the student you don't have this information and suggest they contact the relevant UMPSA office.`;
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

  return (topScore * 0.7) + (avgScore * 0.3);
}

module.exports = {
  generateResponse,
  generateSuggestions,
  estimateConfidence,
  getFallbackResponse
};
