/**
 * Re-ingestion Controller
 * Re-embeds all existing documents with the current embedding provider (Jina AI)
 */

const Document = require('../models/Document');
const { generateEmbeddings, isJinaEnabled, getEmbeddingDimension } = require('../services/embedding');

/**
 * GET /api/admin/reingest
 * Re-embeds all processed documents with the current embedding provider
 */
async function reingestDocuments(req, res) {
  if (!isJinaEnabled()) {
    return res.status(400).json({
      error: 'JINA_API_KEY not configured. Set it in .env to use Jina AI embeddings.',
      currentProvider: 'local-tfidf'
    });
  }

  const expectedDims = getEmbeddingDimension();
  const forceAll = req.query.force === 'true';

  try {
    const documents = await Document.find({ isProcessed: true });
    console.log(`[${new Date().toISOString()}] Re-ingestion started: ${documents.length} documents (force=${forceAll})`);

    let totalChunks = 0;
    let processedDocs = 0;
    let errors = [];

    for (const doc of documents) {
      if (!doc.chunks || doc.chunks.length === 0) continue;

      try {
        // Check if already embedded with correct dimensions (skip unless forced)
        const firstChunk = doc.chunks[0];
        if (!forceAll && firstChunk.embedding && firstChunk.embedding.length === expectedDims) {
          processedDocs++;
          totalChunks += doc.chunks.length;
          continue;
        }

        // Extract all chunk texts
        const chunkTexts = doc.chunks.map(c => c.content);

        // Batch embed all chunks
        const embeddings = await generateEmbeddings(chunkTexts);

        // Update each chunk's embedding
        for (let i = 0; i < doc.chunks.length; i++) {
          doc.chunks[i].embedding = embeddings[i];
        }

        await doc.save();
        processedDocs++;
        totalChunks += doc.chunks.length;
        console.log(`[${new Date().toISOString()}] Re-embedded "${doc.title}" (${doc.chunks.length} chunks)`);

        // Small delay between documents to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (docErr) {
        console.error(`[${new Date().toISOString()}] Failed to re-embed "${doc.title}":`, docErr.message);
        errors.push({ title: doc.title, error: docErr.message });
      }
    }

    console.log(`[${new Date().toISOString()}] Re-ingestion complete: ${processedDocs}/${documents.length} docs, ${totalChunks} chunks`);

    res.json({
      success: true,
      provider: 'jina-ai',
      model: 'jina-embeddings-v2-base-en',
      dimensions: expectedDims,
      documentsProcessed: processedDocs,
      totalDocuments: documents.length,
      totalChunks,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Re-ingestion failed:`, error.message);
    res.status(500).json({ error: 'Re-ingestion failed', details: error.message });
  }
}

/**
 * GET /api/admin/ingest-new
 * Ingest new docs from filesystem (?force=true drops all and re-ingests)
 * Runs async - returns immediately, processes in background
 */
async function ingestNewDocs(req, res) {
  try {
    const { autoIngestDocs } = require('../services/ingest');
    const force = req.query.force === 'true';
    const sync = req.query.sync === 'true';
    if (sync) {
      // Synchronous mode - wait and return result (for debugging)
      try {
        await autoIngestDocs(force);
        const count = await Document.countDocuments({ isProcessed: true });
        return res.json({ success: true, totalDocuments: count, forced: force });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message, stack: err.stack });
      }
    }
    // Async mode - return immediately
    res.json({ success: true, message: 'Ingest started in background', forced: force });
    autoIngestDocs(force).then(() => {
      console.log('[ingest-new] Background ingest completed');
    }).catch(err => {
      console.error('[ingest-new] Background ingest failed:', err.message);
    });
  } catch (error) {
    res.status(500).json({ error: 'Ingest failed', details: error.message });
  }
}

/**
 * GET /api/admin/debug-docs
 * Show what docs files are visible on the filesystem
 */
async function debugDocs(req, res) {
  const path = require('path');
  const fs = require('fs');
  const DOCS_DIR = path.resolve(__dirname, '../../../docs');
  const DOCS_DIR2 = path.resolve(__dirname, '../../docs');
  const results = { docsDir: DOCS_DIR, docsDir2: DOCS_DIR2 };
  try {
    if (fs.existsSync(DOCS_DIR)) {
      results.files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.txt'));
      results.count = results.files.length;
    } else {
      results.exists = false;
    }
    if (fs.existsSync(DOCS_DIR2)) {
      results.files2 = fs.readdirSync(DOCS_DIR2).filter(f => f.endsWith('.txt'));
      results.count2 = results.files2.length;
    }
  } catch (e) {
    results.error = e.message;
  }
  res.json(results);
}

/**
 * GET /api/admin/reingest-batch
 * Re-embed docs in small batches. ?skip=N&limit=M to control range.
 */
async function reingestBatch(req, res) {
  if (!isJinaEnabled()) {
    return res.status(400).json({ error: 'JINA_API_KEY not configured' });
  }

  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const expectedDims = getEmbeddingDimension();

  try {
    const documents = await Document.find({ isProcessed: true }).skip(skip).limit(limit);
    let processed = 0;
    let errors = [];

    for (const doc of documents) {
      if (!doc.chunks || doc.chunks.length === 0) continue;
      try {
        const chunkTexts = doc.chunks.map(c => c.content);
        const embeddings = await generateEmbeddings(chunkTexts);
        for (let i = 0; i < doc.chunks.length; i++) {
          doc.chunks[i].embedding = embeddings[i];
        }
        await doc.save();
        processed++;
      } catch (err) {
        errors.push({ title: doc.title, error: err.message });
      }
      // Delay between docs
      await new Promise(r => setTimeout(r, 300));
    }

    const total = await Document.countDocuments({ isProcessed: true });
    res.json({ success: true, processed, errors, skip, limit, totalDocs: total, nextSkip: skip + limit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { reingestDocuments, ingestNewDocs, debugDocs, reingestBatch };
