const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware');
const { getStats, getFeedback, getDocuments } = require('../controllers/adminController');

// All admin routes require basic auth
router.use(adminAuth);

// Dashboard stats
router.get('/stats', getStats);

// Feedback list
router.get('/feedback', getFeedback);

// Documents list with chunk counts
router.get('/documents', getDocuments);

module.exports = router;
