const express = require('express');
const router = express.Router();
const multer = require('multer');
const { adminAuth } = require('../middleware');
const { getStats, getFeedback, getDocuments, clearCacheHandler } = require('../controllers/adminController');
const { uploadDocument, deleteDocument } = require('../controllers/documentController');

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

module.exports = router;
