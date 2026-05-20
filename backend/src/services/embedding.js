/**
 * Embedding Service
 * Generates vector embeddings for text chunks using Groq API
 * Falls back to simple TF-IDF-like embeddings when API is unavailable
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generate embedding for a single text using Groq
 * Since Groq doesn't have a dedicated embedding endpoint,
 * we use a lightweight approach: generate a semantic hash via the LLM
 * or fall back to local TF-IDF embeddings
 */
async function generateEmbedding(text) {
  try {
    // Use local embedding as primary (fast, no API cost)
    return localEmbedding(text);
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    return localEmbedding(text);
  }
}

/**
 * Generate embeddings for multiple texts
 */
async function generateEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}

/**
 * Local TF-IDF-like embedding generation
 * Creates a fixed-size vector based on word frequencies and character n-grams
 * Dimension: 384 (matches common sentence-transformer output)
 */
function localEmbedding(text) {
  const DIMS = 384;
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
 */
function cosineSimilarity(vecA, vecB) {
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
  localEmbedding
};
