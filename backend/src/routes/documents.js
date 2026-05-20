const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadDocument, listDocuments, getDocument, deleteDocument, getStats } = require('../controllers/documentController');

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/markdown'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and MD files are allowed'));
    }
  }
});

// Upload and ingest a document
router.post('/upload', upload.single('file'), uploadDocument);

// List all documents
router.get('/', listDocuments);

// Get document stats
router.get('/stats', getStats);

// Get a single document
router.get('/:id', getDocument);

// Delete a document
router.delete('/:id', deleteDocument);

module.exports = router;
