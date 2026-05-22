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
 * Ingest new docs from filesystem (force=true drops all and re-ingests)
 */
async function ingestNewDocs(req, res) {
  try {
    const { autoIngestDocs } = require('../services/ingest');
    const force = req.query.force === 'true';
    await autoIngestDocs(force);
    const count = await Document.countDocuments({ isProcessed: true });
    res.json({ success: true, totalDocuments: count, forced: force });
  } catch (error) {
    res.status(500).json({ error: 'Ingest failed', details: error.message });
  }
}

module.exports = { reingestDocuments, ingestNewDocs };
