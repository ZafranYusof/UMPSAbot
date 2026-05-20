/**
 * Feedback Controller
 * Handles user feedback on chatbot responses
 */

const Feedback = require('../models/Feedback');
const Message = require('../models/Message');

/**
 * Submit feedback for a message
 * POST /api/chat/feedback
 */
async function submitFeedback(req, res, next) {
  try {
    const { messageId, rating, comment } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    if (!rating || !['up', 'down'].includes(rating)) {
      return res.status(400).json({ error: "rating must be 'up' or 'down'" });
    }

    // Get the message for context
    let messageData = {};
    try {
      const msg = await Message.findById(messageId).lean();
      if (msg) {
        messageData = {
          conversationId: msg.conversationId,
          assistantResponse: msg.content
        };

        // Find the user message before this assistant message
        const userMsg = await Message.findOne({
          conversationId: msg.conversationId,
          role: 'user',
          createdAt: { $lt: msg.createdAt }
        }).sort({ createdAt: -1 }).lean();

        if (userMsg) {
          messageData.userQuery = userMsg.content;
        }
      }
    } catch (dbError) {
      console.warn(`[${new Date().toISOString()}] Could not fetch message for feedback context:`, dbError.message);
    }

    const feedback = new Feedback({
      messageId,
      rating,
      comment: comment || null,
      ...messageData
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      feedback: {
        id: feedback._id,
        messageId: feedback.messageId,
        rating: feedback.rating,
        comment: feedback.comment
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all feedback (admin)
 * GET /api/admin/feedback
 */
async function listFeedback(req, res, next) {
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

module.exports = {
  submitFeedback,
  listFeedback
};
