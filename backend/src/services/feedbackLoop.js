/**
 * Feedback Loop Service
 * Tracks failed/low-confidence queries for knowledge base expansion
 */

const FailedQuery = require('../models/FailedQuery');

const LOW_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Flag a query as low confidence (non-blocking)
 * Called automatically by RAG when confidence < 0.3
 * @param {string} query - The user's question
 * @param {string} language - Detected language
 * @param {number} confidence - Confidence score from RAG
 */
async function flagLowConfidence(query, language, confidence) {
  try {
    if (confidence >= LOW_CONFIDENCE_THRESHOLD) return;

    await FailedQuery.create({
      query,
      language,
      confidence,
      source: 'low_confidence',
      resolved: false
    });

    console.log(`[${new Date().toISOString()}] FeedbackLoop: flagged low-confidence query (${confidence.toFixed(3)}): "${query.substring(0, 50)}..."`);
  } catch (err) {
    // Non-blocking - don't let this break the main flow
    console.error(`[${new Date().toISOString()}] FeedbackLoop: failed to flag query:`, err.message);
  }
}

/**
 * Flag a query from negative user feedback (thumbs down)
 * @param {string} query - The user's question
 * @param {string} language - Detected language
 * @param {number} confidence - Confidence score (if available)
 */
async function flagThumbsDown(query, language, confidence = 0) {
  try {
    await FailedQuery.create({
      query,
      language,
      confidence,
      source: 'thumbs_down',
      resolved: false
    });

    console.log(`[${new Date().toISOString()}] FeedbackLoop: flagged thumbs-down query: "${query.substring(0, 50)}..."`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] FeedbackLoop: failed to flag thumbs-down:`, err.message);
  }
}

/**
 * Get unresolved failed queries sorted by frequency
 * @param {object} options - Query options
 * @returns {Array} Failed queries grouped by frequency
 */
async function getUnresolvedQueries({ limit = 50, skip = 0 } = {}) {
  const results = await FailedQuery.aggregate([
    { $match: { resolved: false } },
    {
      $group: {
        _id: '$query',
        query: { $first: '$query' },
        language: { $first: '$language' },
        avgConfidence: { $avg: '$confidence' },
        count: { $sum: 1 },
        lastSeen: { $max: '$timestamp' },
        sources: { $addToSet: '$source' }
      }
    },
    { $sort: { count: -1, lastSeen: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  const total = await FailedQuery.countDocuments({ resolved: false });

  return { results, total };
}

/**
 * Mark a failed query as resolved
 * @param {string} query - The query text to resolve
 */
async function resolveQuery(query) {
  await FailedQuery.updateMany(
    { query, resolved: false },
    { $set: { resolved: true } }
  );
}

module.exports = {
  flagLowConfidence,
  flagThumbsDown,
  getUnresolvedQueries,
  resolveQuery,
  LOW_CONFIDENCE_THRESHOLD
};
