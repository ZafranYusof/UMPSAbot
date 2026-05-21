/**
 * Embedding Service
 * Generates vector embeddings for text chunks using Jina AI API
 * Falls back to simple TF-IDF-like embeddings when API is unavailable
 */

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-embeddings-v2-base-en';
const JINA_DIMS = 768;
const JINA_BATCH_SIZE = 100; // Max texts per request
const LOCAL_DIMS = 384;

/**
 * Check if Jina AI is configured
 */
function isJinaEnabled() {
  return !!process.env.JINA_API_KEY;
}

/**
 * Get the current embedding dimension based on provider
 */
function getEmbeddingDimension() {
  return isJinaEnabled() ? JINA_DIMS : LOCAL_DIMS;
}

/**
 * Generate embedding using Jina AI API
 * @param {string} text - Text to embed
 * @returns {number[]} Embedding vector (768 dims)
 */
async function jinaEmbed(text) {
  const response = await fetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.JINA_API_KEY}`
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: [text],
      encoding_type: 'float'
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Jina API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Jina API returned unexpected response format');
  }

  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts using Jina AI API (batch)
 * @param {string[]} texts - Array of texts to embed
 * @returns {number[][]} Array of embedding vectors
 */
async function jinaBatchEmbed(texts) {
  const response = await fetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.JINA_API_KEY}`
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: texts,
      encoding_type: 'float'
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Jina API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    throw new Error('Jina API returned no embeddings');
  }

  // Sort by index to maintain order
  const sorted = data.data.sort((a, b) => a.index - b.index);
  return sorted.map(item => item.embedding);
}

/**
 * Generate embedding for a single text
 * Uses Jina AI if configured, falls back to local TF-IDF hash
 */
async function generateEmbedding(text) {
  if (isJinaEnabled()) {
    try {
      return await jinaEmbed(text);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Jina embedding failed, falling back to local:`, error.message);
      return localEmbedding(text);
    }
  }
  return localEmbedding(text);
}

/**
 * Generate embeddings for multiple texts (batch)
 * Uses Jina AI batch API if configured, falls back to local
 */
async function generateEmbeddings(texts) {
  if (isJinaEnabled()) {
    try {
      const allEmbeddings = [];
      // Process in batches of JINA_BATCH_SIZE
      for (let i = 0; i < texts.length; i += JINA_BATCH_SIZE) {
        const batch = texts.slice(i, i + JINA_BATCH_SIZE);
        const batchEmbeddings = await jinaBatchEmbed(batch);
        allEmbeddings.push(...batchEmbeddings);

        // Small delay between batches to respect rate limits
        if (i + JINA_BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      return allEmbeddings;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Jina batch embedding failed, falling back to local:`, error.message);
      // Fallback: generate locally one by one
      return texts.map(text => localEmbedding(text));
    }
  }

  // Local fallback
  return texts.map(text => localEmbedding(text));
}

/**
 * Local TF-IDF-like embedding generation (fallback)
 * Creates a fixed-size vector based on word frequencies and character n-grams
 * Dimension: 384 (matches common sentence-transformer output)
 */
function localEmbedding(text) {
  const DIMS = LOCAL_DIMS;
  const vector = new Array(DIMS).fill(0);
  
  if (!text || text.trim().length === 0) {
    return vector;
  }

  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Word-level hashing into vector dimensions
  for (const word of words) {
    const hash = simpleHash(word);
    const idx = Math.abs(hash) % DIMS;
    vector[idx] += 1;
    
    // Bigram features
    if (word.length > 2) {
      for (let i = 0; i < word.length - 1; i++) {
        const bigram = word.slice(i, i + 2);
        const bigramIdx = Math.abs(simpleHash(bigram)) % DIMS;
        vector[bigramIdx] += 0.5;
      }
    }
  }

  // Word pair features (captures some semantic relationships)
  for (let i = 0; i < words.length - 1; i++) {
    const pair = words[i] + '_' + words[i + 1];
    const pairIdx = Math.abs(simpleHash(pair)) % DIMS;
    vector[pairIdx] += 0.3;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < DIMS; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

/**
 * Simple string hash function (DJB2)
 */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Compute cosine similarity between two vectors
 * Handles dimension mismatch by comparing only up to the shorter vector's length
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  
  // If dimensions don't match, vectors are from different embedding providers — low similarity
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  localEmbedding,
  isJinaEnabled,
  getEmbeddingDimension,
  JINA_DIMS,
  LOCAL_DIMS
};
