/**
 * Cache Service
 * Handles response caching with exact match and semantic similarity lookup
 * Smart caching: hit counter, TTL refresh on access, popularity-based TTL
 */

const CachedResponse = require('../models/CachedResponse');
const { generateEmbedding, cosineSimilarity } = require('./embedding');

const SIMILARITY_THRESHOLD = parseFloat(process.env.CACHE_SIMILARITY_THRESHOLD) || 0.92;

// TTL tiers based on hit count
const BASE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const POPULAR_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours (3 days)
const VERY_POPULAR_TTL_MS = 168 * 60 * 60 * 1000; // 7 days
const POPULAR_THRESHOLD = 5; // hits to be considered popular
const VERY_POPULAR_THRESHOLD = 20; // hits to be considered very popular

/**
 * Calculate TTL based on hit count
 */
function getTTLForHitCount(hitCount) {
  if (hitCount >= VERY_POPULAR_THRESHOLD) return VERY_POPULAR_TTL_MS;
  if (hitCount >= POPULAR_THRESHOLD) return POPULAR_TTL_MS;
  return BASE_TTL_MS;
}

/**
 * Normalize a query string for exact-match lookup
 * Lowercase, trim, collapse spaces, strip punctuation for better matching
 */
function normalizeQuery(query) {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/[?!.,;:"'()\[\]{}]/g, '') // strip common punctuation
    .replace(/\s+/g, ' ')           // re-collapse after punctuation removal
    .trim();
}

/**
 * Look up cache — first exact match, then semantic similarity
 * On hit: increment counter, refresh TTL based on popularity
 * @param {string} query - Raw user query
 * @param {string} language - Language code
 * @returns {object|null} Cached response or null
 */
async function getCachedResponse(query, language) {
  const normalized = normalizeQuery(query);

  // 1. Exact match
  const exact = await CachedResponse.findOne({ queryNormalized: normalized, language });
  if (exact) {
    exact.hitCount += 1;
    exact.lastAccessedAt = new Date();
    // Refresh TTL based on new hit count
    exact.expiresAt = new Date(Date.now() + getTTLForHitCount(exact.hitCount));
    await exact.save();
    return exact.response;
  }

  // 2. Semantic similarity match
  const queryEmbedding = await generateEmbedding(query);
  const candidates = await CachedResponse.find({ language }).lean();

  for (const candidate of candidates) {
    if (!candidate.queryEmbedding || candidate.queryEmbedding.length === 0) continue;
    const similarity = cosineSimilarity(queryEmbedding, candidate.queryEmbedding);
    if (similarity >= SIMILARITY_THRESHOLD) {
      // Update hit count and refresh TTL on the matched document
      const newHitCount = (candidate.hitCount || 0) + 1;
      await CachedResponse.updateOne(
        { _id: candidate._id },
        {
          $inc: { hitCount: 1 },
          $set: {
            lastAccessedAt: new Date(),
            expiresAt: new Date(Date.now() + getTTLForHitCount(newHitCount))
          }
        }
      );
      return candidate.response;
    }
  }

  return null;
}

/**
 * Save a response to cache
 * @param {string} query - Raw user query
 * @param {Array} queryEmbedding - Pre-computed embedding for the query
 * @param {object} response - The response object to cache
 * @param {string} language - Language code
 */
async function cacheResponse(query, queryEmbedding, response, language) {
  const normalized = normalizeQuery(query);

  try {
    await CachedResponse.findOneAndUpdate(
      { queryNormalized: normalized, language },
      {
        query,
        queryNormalized: normalized,
        queryEmbedding,
        response: {
          content: response.content,
          sources: response.sources,
          suggestions: response.suggestions,
          confidence: response.confidence,
          intent: response.intent
        },
        language,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + BASE_TTL_MS)
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Non-critical — log and continue
    console.error(`[${new Date().toISOString()}] Cache write failed:`, error.message);
  }
}

/**
 * Get cache statistics for admin dashboard
 */
async function getCacheStats() {
  const totalCachedResponses = await CachedResponse.countDocuments();

  const totalHits = await CachedResponse.aggregate([
    { $group: { _id: null, total: { $sum: '$hitCount' } } }
  ]);

  const topCachedQueries = await CachedResponse.find()
    .sort({ hitCount: -1 })
    .limit(10)
    .select('query hitCount lastAccessedAt language expiresAt')
    .lean();

  const popularCount = await CachedResponse.countDocuments({ hitCount: { $gte: POPULAR_THRESHOLD } });

  return {
    totalCachedResponses,
    totalHits: totalHits[0]?.total || 0,
    popularCount,
    topCachedQueries
  };
}

/**
 * Clear all cached responses
 */
async function clearCache() {
  const result = await CachedResponse.deleteMany({});
  return { deleted: result.deletedCount };
}

module.exports = {
  getCachedResponse,
  cacheResponse,
  getCacheStats,
  clearCache,
  normalizeQuery
};
