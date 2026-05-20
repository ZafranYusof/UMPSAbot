/**
 * Document Controller
 * Handles document upload, ingestion, and management
 */

const { ingestDocument } = require('../services/rag');
const Document = require('../models/Document');
const path = require('path');

/**
 * Upload and ingest a document
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, category, language } = req.body;
    const file = req.file;

    // Determine file type
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowedTypes = ['pdf', 'txt', 'md'];
    
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({ 
        error: `Unsupported file type: .${ext}. Allowed: ${allowedTypes.join(', ')}` 
      });
    }

    // Ingest document through RAG pipeline
    const result = await ingestDocument(file.buffer, {
      title: title || file.originalname,
      filename: file.originalname,
      fileType: ext,
      fileSize: file.size,
      category: category || 'general',
      language: language || 'mixed'
    });

    res.status(201).json({
      success: true,
      document: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all documents
 */
async function listDocuments(req, res, next) {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (category) filter.category = category;

    const documents = await Document.find(filter)
      .select('-chunks -content')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
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
 * Get a single document
 */
async function getDocument(req, res, next) {
  try {
    const { id } = req.params;
    const document = await Document.findById(id).select('-chunks.embedding').lean();
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a document
 */
async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const document = await Document.findByIdAndDelete(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
}

/**
 * Get document stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await Document.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalChunks: { $sum: '$chunkCount' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const totalDocs = await Document.countDocuments();
    const totalChunks = await Document.aggregate([
      { $group: { _id: null, total: { $sum: '$chunkCount' } } }
    ]);

    res.json({
      totalDocuments: totalDocs,
      totalChunks: totalChunks[0]?.total || 0,
      byCategory: stats
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  getStats
};
