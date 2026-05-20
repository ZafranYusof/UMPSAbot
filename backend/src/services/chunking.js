/**
 * Chunking Service
 * Splits documents into overlapping chunks for embedding and retrieval
 */

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 500;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 50;

/**
 * Split text into overlapping chunks
 * @param {string} text - The full document text
 * @param {object} options - Chunking options
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || CHUNK_SIZE;
  const overlap = options.overlap || CHUNK_OVERLAP;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split by paragraphs first for more natural chunks
  const paragraphs = cleanedText.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current and start new
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Keep overlap from end of current chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If any chunk is still too large, split by sentences
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length > chunkSize * 1.5) {
      const sentenceChunks = splitBySentences(chunk, chunkSize, overlap);
      finalChunks.push(...sentenceChunks);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

/**
 * Split text by sentences when paragraphs are too large
 */
function splitBySentences(text, chunkSize, overlap) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Overlap: keep last sentence
      const lastSentences = currentChunk.match(/[^.!?]+[.!?]+/g) || [];
      currentChunk = lastSentences.slice(-1).join('') + ' ' + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
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
