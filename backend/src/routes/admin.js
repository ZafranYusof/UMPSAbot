const express = require('express');
const router = express.Router();
const multer = require('multer');
const { adminAuth } = require('../middleware');
const { getStats, getFeedback, getDocuments, clearCacheHandler } = require('../controllers/adminController');
const { uploadDocument, deleteDocument } = require('../controllers/documentController');
const { reingestDocuments, ingestNewDocs, debugDocs } = require('../controllers/reingestController');
const QueryLog = require('../models/QueryLog');

// Configure multer for admin uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(pdf|txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and MD files are allowed'));
    }
  }
});

// All admin routes require basic auth
router.use(adminAuth);

// Dashboard stats
router.get('/stats', getStats);

// Feedback list
router.get('/feedback', getFeedback);

// Documents list with chunk counts
router.get('/documents', getDocuments);

// Upload document (admin-protected)
router.post('/upload-doc', upload.single('file'), uploadDocument);

// Delete document (admin-protected)
router.delete('/documents/:id', deleteDocument);

// Cache management
router.post('/cache/clear', clearCacheHandler);

// Re-ingest all documents with current embedding provider (Jina AI)
router.get('/reingest', reingestDocuments);

// Ingest new docs from filesystem (?force=true to drop all and re-ingest)
router.get('/ingest-new', ingestNewDocs);

// Debug: show docs filesystem path and files
router.get('/debug-docs', debugDocs);

// Popular questions - aggregates top 20 queries
router.get('/popular-questions', async (req, res, next) => {
  try {
    const { days = 30, limit = 20 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const popular = await QueryLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$normalizedQuery',
          query: { $first: '$query' },
          count: { $sum: 1 },
          intent: { $first: '$intent' },
          language: { $first: '$language' },
          avgResponseTime: { $avg: '$responseTime' },
          lastAsked: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const totalQueries = await QueryLog.countDocuments({ timestamp: { $gte: since } });

    res.json({
      period: `${days} days`,
      totalQueries,
      popularQuestions: popular.map(p => ({
        query: p.query,
        count: p.count,
        intent: p.intent,
        language: p.language,
        avgResponseTime: Math.round(p.avgResponseTime),
        lastAsked: p.lastAsked
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
