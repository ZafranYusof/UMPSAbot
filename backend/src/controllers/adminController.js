/**
 * Admin Controller
 * Handles admin dashboard API endpoints
 */

const Message = require('../models/Message');
const Feedback = require('../models/Feedback');
const Document = require('../models/Document');

/**
 * Get dashboard stats
 * GET /api/admin/stats
 */
async function getStats(req, res, next) {
  try {
    // Total unique conversations
    const totalChats = await Message.distinct('conversationId').then(ids => ids.length);

    // Total messages
    const totalMessages = await Message.countDocuments();

    // Average confidence (assistant messages only)
    const confidenceAgg = await Message.aggregate([
      { $match: { role: 'assistant', confidence: { $ne: null } } },
      { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
    ]);
    const avgConfidence = confidenceAgg[0]?.avgConfidence || 0;

    // Top questions (most common user messages)
    const topQuestions = await Message.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: '$content', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { question: '$_id', count: 1, _id: 0 } }
    ]);

    // Feedback summary
    const feedbackSummary = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    const feedbackCounts = { up: 0, down: 0 };
    feedbackSummary.forEach(f => { feedbackCounts[f._id] = f.count; });

    // Messages per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messagesPerDay = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalChats,
      totalMessages,
      avgConfidence: Math.round(avgConfidence * 1000) / 1000,
      topQuestions,
      feedback: feedbackCounts,
      messagesPerDay
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all feedback
 * GET /api/admin/feedback
 */
async function getFeedback(req, res, next) {
  try {
    const { page = 1, limit = 50, rating } = req.query;

    const filter = {};
    if (rating) filter.rating = rating;

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all documents with chunk counts
 * GET /api/admin/documents
 */
async function getDocuments(req, res, next) {
  try {
    const documents = await Document.find()
      .select('title originalFilename fileType fileSize category language chunkCount isProcessed createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);

    res.json({
      documents,
      summary: {
        totalDocuments: documents.length,
        totalChunks,
        byCategory: documents.reduce((acc, d) => {
          acc[d.category] = (acc[d.category] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  getFeedback,
  getDocuments
};
