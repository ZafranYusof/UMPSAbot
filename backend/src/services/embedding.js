/**
 * Embedding Service
 * Generates vector embeddings for text chunks
 * Priority: Ollama Cloud → HuggingFace → Jina AI → Local TF-IDF fallback
 */

// Ollama Cloud (FREE, uses existing OPENAI_BASE_URL)
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const OLLAMA_DIMS = 768;

// HuggingFace Inference API (FREE, unlimited)
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction';
const HF_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const HF_DIMS = 384;

// Jina AI (paid/limited)
const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-embeddings-v2-base-en';
const JINA_DIMS = 768;
const JINA_BATCH_SIZE = 100;

const LOCAL_DIMS = 384;

/**
 * Check which embedding provider is available
 */
function getProvider() {
  if (isOllamaEnabled()) return 'ollama';
  if (isHuggingFaceEnabled()) return 'huggingface';
  if (isJinaEnabled()) return 'jina';
  return 'local';
}

function isOllamaEnabled() {
  return !!(process.env.OPENAI_BASE_URL || process.env.OLLAMA_EMBED_URL);
}

function isJinaEnabled() {
  return !!process.env.JINA_API_KEY;
}

function isHuggingFaceEnabled() {
  return !!(process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY);
}

/**
 * Get the current embedding dimension based on provider
 */
function getEmbeddingDimension() {
  const provider = getProvider();
  if (provider === 'ollama') return OLLAMA_DIMS;
  if (provider === 'huggingface') return HF_DIMS;
  if (provider === 'jina') return JINA_DIMS;
  return LOCAL_DIMS;
}

/**
 * Get Ollama embedding URL
 */
function getOllamaUrl() {
  if (process.env.OLLAMA_EMBED_URL) return process.env.OLLAMA_EMBED_URL;
  // Use same base as LLM but switch to embeddings endpoint
  const base = (process.env.OPENAI_BASE_URL || '').replace(/\/v1\/?$/, '').replace(/\/api\/?$/, '');
  return `${base}/api/embeddings`;
}

/**
 * Generate embedding using Ollama Cloud
 */
async function ollamaEmbed(text) {
  const url = getOllamaUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPENAI_API_KEY ? { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } : {})
    },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      prompt: text
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Ollama embedding error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  if (data.embedding) return data.embedding;
  if (data.embeddings && data.embeddings[0]) return data.embeddings[0];
  throw new Error('Ollama returned unexpected embedding format');
}

/**
 * Batch embed using Ollama (one at a time, Ollama doesn't support batch natively)
 */
async function ollamaBatchEmbed(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await ollamaEmbed(text);
    embeddings.push(embedding);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 50));
  }
  return embeddings;
}

/**
 * Generate embedding using HuggingFace Inference API (FREE)
 * Model: paraphrase-multilingual-MiniLM-L12-v2 (384d, supports BM+EN)
 */
async function hfEmbed(text) {
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  const response = await fetch(`${HF_API_URL}/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`HuggingFace API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  // HF returns array of arrays for feature-extraction
  if (Array.isArray(data) && Array.isArray(data[0])) {
    // Mean pooling if multiple token embeddings returned
    if (Array.isArray(data[0][0])) {
      const tokens = data[0];
      const dims = tokens[0].length;
      const pooled = new Array(dims).fill(0);
      for (const token of tokens) {
        for (let i = 0; i < dims; i++) pooled[i] += token[i];
      }
      for (let i = 0; i < dims; i++) pooled[i] /= tokens.length;
      return pooled;
    }
    return data[0];
  }
  if (Array.isArray(data)) return data;
  throw new Error('HuggingFace API returned unexpected format');
}

/**
 * Batch embed using HuggingFace (supports array input)
 */
async function hfBatchEmbed(texts) {
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  const response = await fetch(`${HF_API_URL}/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`HuggingFace batch API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  // HF returns array of embeddings for batch input
  if (Array.isArray(data) && data.length === texts.length) {
    return data.map(item => {
      if (Array.isArray(item) && Array.isArray(item[0])) {
        // Mean pooling
        const dims = item[0].length;
        const pooled = new Array(dims).fill(0);
        for (const token of item) {
          for (let i = 0; i < dims; i++) pooled[i] += token[i];
        }
        for (let i = 0; i < dims; i++) pooled[i] /= item.length;
        return pooled;
      }
      return item;
    });
  }
  throw new Error('HuggingFace batch API returned unexpected format');
}

/**
 * Generate embedding using Jina AI API
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
 * Priority: Ollama → HuggingFace → Jina AI → Local TF-IDF
 */
async function generateEmbedding(text) {
  if (isOllamaEnabled()) {
    try {
      return await ollamaEmbed(text);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Ollama embedding failed:`, error.message);
      // Fall through to next provider
    }
  }
  if (isHuggingFaceEnabled()) {
    try {
      return await hfEmbed(text);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] HuggingFace embedding failed:`, error.message);
    }
  }
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
 * Priority: Ollama → HuggingFace → Jina AI → Local
 */
async function generateEmbeddings(texts) {
  if (isOllamaEnabled()) {
    try {
      return await ollamaBatchEmbed(texts);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Ollama batch failed:`, error.message);
    }
  }
  if (isHuggingFaceEnabled()) {
    try {
      const allEmbeddings = [];
      for (let i = 0; i < texts.length; i += 32) {
        const batch = texts.slice(i, i + 32);
        const batchEmbeddings = await hfBatchEmbed(batch);
        allEmbeddings.push(...batchEmbeddings);
        if (i + 32 < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return allEmbeddings;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] HuggingFace batch failed:`, error.message);
    }
  }
  if (isJinaEnabled()) {
    try {
      const allEmbeddings = [];
      for (let i = 0; i < texts.length; i += JINA_BATCH_SIZE) {
        const batch = texts.slice(i, i + JINA_BATCH_SIZE);
        const batchEmbeddings = await jinaBatchEmbed(batch);
        allEmbeddings.push(...batchEmbeddings);
        if (i + JINA_BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      return allEmbeddings;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Jina batch embedding failed, falling back to local:`, error.message);
      return texts.map(text => localEmbedding(text));
    }
  }
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
  isHuggingFaceEnabled,
  isOllamaEnabled,
  getProvider,
  getEmbeddingDimension,
  OLLAMA_DIMS,
  JINA_DIMS,
  HF_DIMS,
  LOCAL_DIMS
};
