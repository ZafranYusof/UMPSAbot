/**
 * LLM Service
 * Handles communication with Groq API for text generation
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

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

  try {
    const completion = await groq.chat.completions.create({
      model: LLM_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 1500,
      top_p: 0.85,
      stream: false
    });

    const responseTime = Date.now() - startTime;
    const response = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      content: response,
      metadata: {
        tokensUsed,
        responseTime,
        model: LLM_MODEL,
        contextsUsed: contexts.length
      }
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] LLM generation error:`, error.message);

    return {
      content: getFallbackResponse(language),
      metadata: {
        tokensUsed: 0,
        responseTime: Date.now() - startTime,
        model: 'fallback',
        error: error.message
      }
    };
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

    const completion = await groq.chat.completions.create({
      model: LLM_MODEL,
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
