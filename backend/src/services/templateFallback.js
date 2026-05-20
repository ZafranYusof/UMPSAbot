/**
 * Template Fallback Service
 * When ALL LLM providers fail, format RAG search results directly
 * Not as polished as LLM but gives real info from the knowledge base
 */

/**
 * Generate a template-based response from RAG search results
 * @param {Array} searchResults - Top search results from RAG pipeline
 * @param {string} language - Language code (ms, en, mixed)
 * @returns {object} Formatted response with content and sources
 */
function generateTemplateFallback(searchResults, language = 'mixed') {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Take top 3 results
  const topResults = searchResults.slice(0, 3);

  // Language-aware intro
  const intro = getIntro(language);

  // Format each result as a bullet point with source title
  const bullets = topResults.map(result => {
    const title = result.documentTitle || 'Document';
    const content = cleanChunkContent(result.chunk?.content || '');
    return `• **${title}**\n  ${content}`;
  });

  const responseContent = `${intro}\n\n${bullets.join('\n\n')}`;

  // Add a note that this is from documents directly
  const note = language === 'ms'
    ? '\n\n_Nota: Jawapan ini diambil terus dari dokumen. Untuk maklumat lanjut, sila hubungi pejabat berkaitan._'
    : '\n\n_Note: This answer is taken directly from our documents. For more details, please contact the relevant office._';

  return {
    content: responseContent + note,
    sources: topResults.map(r => ({
      documentId: r.documentId,
      title: r.documentTitle,
      chunk: (r.chunk?.content || '').substring(0, 200) + '...',
      score: r.score
    }))
  };
}

/**
 * Get language-aware intro text
 */
function getIntro(language) {
  if (language === 'ms') {
    return 'Berdasarkan dokumen kami:';
  }
  if (language === 'en') {
    return 'Based on our documents:';
  }
  // Mixed
  return 'Based on our documents / Berdasarkan dokumen kami:';
}

/**
 * Clean chunk content for display
 * Trim, remove excessive whitespace, limit length
 */
function cleanChunkContent(content) {
  let cleaned = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Limit to ~300 chars per chunk for readability
  if (cleaned.length > 300) {
    cleaned = cleaned.substring(0, 297) + '...';
  }

  return cleaned;
}

module.exports = {
  generateTemplateFallback
};
