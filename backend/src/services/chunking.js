/**
 * Chunking Service
 * Splits documents into overlapping chunks for embedding and retrieval
 * Uses word-based chunking (200-300 words per chunk, 50 word overlap)
 */

const CHUNK_SIZE_WORDS = parseInt(process.env.CHUNK_SIZE_WORDS) || 250;
const CHUNK_OVERLAP_WORDS = parseInt(process.env.CHUNK_OVERLAP_WORDS) || 50;

/**
 * Split text into overlapping chunks based on word count
 * @param {string} text - The full document text
 * @param {object} options - Chunking options
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, options = {}) {
  const maxWords = options.chunkSizeWords || CHUNK_SIZE_WORDS;
  const overlapWords = options.overlapWords || CHUNK_OVERLAP_WORDS;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text - remove noise
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(GUIDELINES|User)\s*$/gm, '') // Remove repeated headers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split into paragraphs
  const paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim().length > 0);

  const chunks = [];
  let currentChunkWords = [];
  let currentChunkText = [];

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/);

    // If adding this paragraph exceeds max words, finalize current chunk
    if (currentChunkWords.length + paragraphWords.length > maxWords && currentChunkWords.length > 0) {
      chunks.push(currentChunkText.join('\n\n').trim());

      // Keep overlap words from end of current chunk
      const overlapText = currentChunkWords.slice(-overlapWords).join(' ');
      currentChunkWords = overlapText.split(/\s+/);
      currentChunkText = [overlapText];
    }

    currentChunkWords.push(...paragraphWords);
    currentChunkText.push(paragraph.trim());
  }

  // Don't forget the last chunk
  if (currentChunkText.length > 0) {
    const finalText = currentChunkText.join('\n\n').trim();
    if (finalText.length > 0) {
      chunks.push(finalText);
    }
  }

  // If any chunk is still too large (>400 words), split by sentences
  const finalChunks = [];
  for (const chunk of chunks) {
    const wordCount = chunk.split(/\s+/).length;
    if (wordCount > maxWords * 1.5) {
      const sentenceChunks = splitBySentences(chunk, maxWords, overlapWords);
      finalChunks.push(...sentenceChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks.filter(c => c.trim().length > 20);
}

/**
 * Split text by sentences when paragraphs are too large
 */
function splitBySentences(text, maxWords, overlapWords) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks = [];
  let currentWords = [];
  let currentSentences = [];

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/);

    if (currentWords.length + sentenceWords.length > maxWords && currentWords.length > 0) {
      chunks.push(currentSentences.join(' ').trim());

      // Overlap: keep last few words
      const overlapText = currentWords.slice(-overlapWords).join(' ');
      currentWords = overlapText.split(/\s+/);
      currentSentences = [overlapText];
    }

    currentWords.push(...sentenceWords);
    currentSentences.push(sentence.trim());
  }

  if (currentSentences.length > 0) {
    const finalText = currentSentences.join(' ').trim();
    if (finalText.length > 0) {
      chunks.push(finalText);
    }
  }

  return chunks;
}

/**
 * Extract text from different file types
 */
async function extractText(buffer, fileType) {
  switch (fileType) {
    case 'pdf':
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      return pdfData.text;

    case 'txt':
    case 'md':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

module.exports = {
  chunkText,
  extractText,
  splitBySentences
};
