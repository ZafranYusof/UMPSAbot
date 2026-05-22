/**
 * Chunking Service
 * Splits documents into overlapping chunks for embedding and retrieval
 * 
 * Strategy: Section-aware chunking
 * 1. Split by markdown headers (##, ###) and logical section breaks
 * 2. Keep chunks 500-1000 chars (respecting section boundaries)
 * 3. Fall back to paragraph/sentence splitting for oversized sections
 * 4. Overlap between chunks for context continuity
 */

const CHUNK_SIZE_CHARS = parseInt(process.env.CHUNK_SIZE_CHARS) || 1000;
const CHUNK_MIN_CHARS = parseInt(process.env.CHUNK_MIN_CHARS) || 400;
const CHUNK_MAX_CHARS = parseInt(process.env.CHUNK_MAX_CHARS) || 1500;
const CHUNK_OVERLAP_CHARS = parseInt(process.env.CHUNK_OVERLAP_CHARS) || 150;

/**
 * Split text into chunks using section-aware strategy
 * Priority: markdown headers > double newlines > sentence boundaries
 * @param {string} text - The full document text
 * @param {object} options - Chunking options
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, options = {}) {
  const maxChars = options.maxChars || CHUNK_MAX_CHARS;
  const minChars = options.minChars || CHUNK_MIN_CHARS;
  const targetChars = options.targetChars || CHUNK_SIZE_CHARS;
  const overlapChars = options.overlapChars || CHUNK_OVERLAP_CHARS;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^(GUIDELINES|User)\s*$/gm, '')
    .trim();

  // Step 1: Split into sections by markdown headers
  const sections = splitBySections(cleanedText);

  // Step 2: Process each section into appropriately-sized chunks
  const chunks = [];
  for (const section of sections) {
    const sectionChunks = processSection(section, { maxChars, minChars, targetChars, overlapChars });
    chunks.push(...sectionChunks);
  }

  // Filter out tiny chunks
  return chunks.filter(c => c.trim().length >= 30);
}

/**
 * Split text into logical sections based on markdown headers
 * Each section includes its header for context
 */
function splitBySections(text) {
  // Match markdown headers: #, ##, ###, ####
  const headerRegex = /^(#{1,4})\s+(.+)$/gm;
  const sections = [];
  let lastIndex = 0;
  let lastHeader = '';
  let match;

  const matches = [];
  while ((match = headerRegex.exec(text)) !== null) {
    matches.push({ index: match.index, header: match[0], level: match[1].length });
  }

  if (matches.length === 0) {
    // No headers found - split by double newlines (paragraph breaks)
    return splitByParagraphGroups(text);
  }

  // Content before first header
  if (matches[0].index > 0) {
    const preContent = text.substring(0, matches[0].index).trim();
    if (preContent.length > 0) {
      sections.push(preContent);
    }
  }

  // Process each header section
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const sectionText = text.substring(start, end).trim();

    if (sectionText.length > 0) {
      sections.push(sectionText);
    }
  }

  return sections;
}

/**
 * Split text into paragraph groups when no headers exist
 */
function splitByParagraphGroups(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length <= 1) {
    return [text.trim()];
  }

  return paragraphs.map(p => p.trim());
}

/**
 * Process a single section into chunks respecting size limits
 * If section fits within maxChars, keep it whole
 * Otherwise, split by paragraphs then sentences
 */
function processSection(section, { maxChars, minChars, targetChars, overlapChars }) {
  // If section is within target size, return as-is
  if (section.length <= maxChars) {
    return [section];
  }

  // Section too large - split by paragraphs first
  const paragraphs = section.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Extract header if present (keep it as prefix for context)
  let headerPrefix = '';
  const firstLine = paragraphs[0] || '';
  if (/^#{1,4}\s+/.test(firstLine)) {
    headerPrefix = firstLine + '\n\n';
    paragraphs.shift();
  }

  const chunks = [];
  let currentChunk = headerPrefix;

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    
    // If single paragraph exceeds max, split by sentences
    if (trimmedPara.length > maxChars) {
      // Flush current chunk first
      if (currentChunk.trim().length >= minChars) {
        chunks.push(currentChunk.trim());
      }
      
      // Split large paragraph by sentences
      const sentenceChunks = splitBySentences(trimmedPara, targetChars, overlapChars, headerPrefix);
      chunks.push(...sentenceChunks);
      currentChunk = headerPrefix;
      continue;
    }

    // Check if adding this paragraph exceeds target
    if (currentChunk.length + trimmedPara.length + 2 > targetChars && currentChunk.trim().length >= minChars) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap from end of previous
      const overlap = getOverlapText(currentChunk, overlapChars);
      currentChunk = headerPrefix + (overlap ? overlap + '\n\n' : '') + trimmedPara;
    } else {
      currentChunk += (currentChunk.length > 0 && !currentChunk.endsWith('\n\n') ? '\n\n' : '') + trimmedPara;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length >= minChars) {
    chunks.push(currentChunk.trim());
  } else if (currentChunk.trim().length > 0 && chunks.length > 0) {
    // Merge tiny remainder with previous chunk
    chunks[chunks.length - 1] += '\n\n' + currentChunk.trim();
  } else if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split text by sentences when paragraphs are too large
 */
function splitBySentences(text, targetChars, overlapChars, headerPrefix = '') {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks = [];
  let currentChunk = headerPrefix;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (currentChunk.length + trimmedSentence.length + 1 > targetChars && currentChunk.trim().length > 50) {
      chunks.push(currentChunk.trim());
      
      // Overlap: keep last portion
      const overlap = getOverlapText(currentChunk, overlapChars);
      currentChunk = headerPrefix + (overlap ? overlap + ' ' : '') + trimmedSentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Get overlap text from end of a chunk
 */
function getOverlapText(text, overlapChars) {
  if (!text || text.length <= overlapChars) return '';
  return '...' + text.slice(-overlapChars).trim();
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
  splitBySentences,
  splitBySections
};
