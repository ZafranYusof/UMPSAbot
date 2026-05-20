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
 * @param {string[]} contexts - Retrieved relevant chunks
 * @param {object} options - Additional options
 * @returns {object} Generated response with metadata
 */
async function generateResponse(query, contexts = [], options = {}) {
  const { language = 'mixed', conversationHistory = [], intent = 'general' } = options;

  const systemPrompt = buildSystemPrompt(contexts, language, intent);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: query }
  ];

  const startTime = Date.now();

  try {
    const completion = await groq.chat.completions.create({
      model: LLM_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      top_p: 0.9,
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
    
    // Fallback response
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
 * @param {string} query - Original user query
 * @param {string} response - Generated response
 * @param {string} intent - Classified intent
 * @param {string} language - Language preference
 * @returns {string[]} Array of suggested follow-up questions
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
 * Build system prompt with RAG context
 */
function buildSystemPrompt(contexts, language, intent = 'general') {
  let prompt = `You are UMPSABot, a helpful AI assistant for students at Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA). 

Your role:
- Answer questions about UMPSA academics, facilities, policies, and student life
- Be accurate and cite your sources when possible
- If you're not sure about something, say so honestly
- Be friendly and supportive to students

`;

  // Intent-specific instructions
  if (intent === 'academic') {
    prompt += `The student is asking about academic matters. Focus on course info, grades, schedules, and academic policies.\n`;
  } else if (intent === 'hostel') {
    prompt += `The student is asking about hostel/accommodation. Focus on room allocation, rules, facilities, and fees.\n`;
  } else if (intent === 'fees') {
    prompt += `The student is asking about fees/financial matters. Be precise with amounts and deadlines if available.\n`;
  } else if (intent === 'registration') {
    prompt += `The student is asking about registration/enrollment. Focus on procedures, deadlines, and requirements.\n`;
  } else if (intent === 'facilities') {
    prompt += `The student is asking about campus facilities. Provide location, hours, and usage info if available.\n`;
  }

  prompt += `\nLanguage instructions:\n`;

  if (language === 'ms') {
    prompt += '- Respond in Bahasa Melayu\n';
  } else if (language === 'en') {
    prompt += '- Respond in English\n';
  } else {
    prompt += '- Respond in the same language the student uses. If they mix BM and English, you can too.\n';
  }

  if (contexts.length > 0) {
    prompt += `\nRelevant information from UMPSA knowledge base:\n`;
    prompt += `---\n`;
    contexts.forEach((ctx, i) => {
      prompt += `[Source ${i + 1}]: ${ctx}\n\n`;
    });
    prompt += `---\n`;
    prompt += `\nUse the above information to answer the student's question. If the answer is in the sources, cite it as [Source N]. If the question cannot be answered from the sources, say so and provide general guidance.`;
  } else {
    prompt += `\nNo specific documents found in the knowledge base for this query. Answer based on your general knowledge about Malaysian universities, but clearly state that this is general information and may not be specific to UMPSA.`;
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
  
  // Weighted combination of top score and average
  return (topScore * 0.7) + (avgScore * 0.3);
}

module.exports = {
  generateResponse,
  generateSuggestions,
  estimateConfidence,
  getFallbackResponse
};
