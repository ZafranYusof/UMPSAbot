const express = require('express');
const router = express.Router();
const multer = require('multer');
const { adminAuth } = require('../middleware');
const { getStats, getFeedback, getDocuments, clearCacheHandler } = require('../controllers/adminController');
const { uploadDocument, deleteDocument } = require('../controllers/documentController');
const { reingestDocuments, ingestNewDocs, debugDocs, reingestBatch } = require('../controllers/reingestController');
const QueryLog = require('../models/QueryLog');
const { getUnresolvedQueries, resolveQuery } = require('../services/feedbackLoop');
const ScrapedPage = require('../models/ScrapedPage');
const { runScrapeJob, SCRAPE_URLS } = require('../jobs/autoScrape');

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

// Re-embed docs in batches (?skip=N&limit=M)
router.get('/reingest-batch', reingestBatch);

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

// Failed/low-confidence queries for knowledge base expansion
router.get('/failed-queries', async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const { results, total } = await getUnresolvedQueries({
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      total,
      count: results.length,
      queries: results.map(r => ({
        query: r.query,
        language: r.language,
        avgConfidence: Math.round(r.avgConfidence * 1000) / 1000,
        count: r.count,
        lastSeen: r.lastSeen,
        sources: r.sources
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Resolve a failed query (mark as addressed)
router.post('/failed-queries/resolve', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    await resolveQuery(query);
    res.json({ success: true, message: 'Query marked as resolved' });
  } catch (error) {
    next(error);
  }
});

// Auto-scrape: get status of all tracked pages
router.get('/scrape-status', async (req, res, next) => {
  try {
    const pages = await ScrapedPage.find().sort({ lastScraped: -1 }).lean();

    // Include URLs that haven't been scraped yet
    const trackedUrls = pages.map(p => p.url);
    const untracked = SCRAPE_URLS
      .filter(s => !trackedUrls.includes(s.url))
      .map(s => ({
        url: s.url,
        title: s.title,
        category: s.category,
        lastScraped: null,
        contentHash: null,
        status: 'pending',
        filename: null
      }));

    res.json({
      totalTracked: SCRAPE_URLS.length,
      scraped: pages.length,
      pages: [...pages, ...untracked]
    });
  } catch (error) {
    next(error);
  }
});

// Auto-scrape: manually trigger a scrape cycle
router.post('/scrape-now', async (req, res, next) => {
  try {
    // Run async so we don't block the response for too long
    res.json({ message: 'Scrape job started', startedAt: new Date().toISOString() });
    // Fire and forget
    runScrapeJob().catch(err => {
      console.error('[Admin] Manual scrape failed:', err.message);
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
