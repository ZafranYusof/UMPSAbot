/**
 * Auto-Ingest Service
 * Loads and ingests all .txt files from the docs/ folder on server startup
 * Supports force re-ingest to refresh chunks with new settings
 */

const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const { chunkText } = require('./chunking');
const { generateEmbedding } = require('./embedding');

const DOCS_DIR = path.resolve(__dirname, '../../../docs');

/**
 * Categorize a document based on its filename
 */
function categorizeFile(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('academic') || lower.includes('calendar') || lower.includes('course') || lower.includes('exam') || lower.includes('timetable')) {
    return 'academic';
  }
  if (lower.includes('hostel') || lower.includes('facilities')) {
    return 'facilities';
  }
  if (lower.includes('faq')) {
    return 'faq';
  }
  if (lower.includes('admission') || lower.includes('registration')) {
    return 'administrative';
  }
  return 'general';
}

/**
 * Ingest all .txt files from docs/ folder
 * @param {boolean} force - If true, delete existing documents and re-ingest all
 */
async function autoIngestDocs(force = false) {
  console.log('📚 Starting auto-ingest of knowledge base documents...');

  if (!fs.existsSync(DOCS_DIR)) {
    console.warn('⚠️  Docs directory not found:', DOCS_DIR);
    return;
  }

  // Force re-ingest: drop all existing documents
  if (force) {
    console.log('🔄 Force re-ingest: deleting all existing documents...');
    await Document.deleteMany({});
    console.log('✅ All existing documents deleted.');
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.txt'));
  console.log(`📄 Found ${files.length} .txt files in docs/`);

  let ingested = 0;
  let skipped = 0;

  for (const filename of files) {
    try {
      // Check if already ingested (skip if not forcing)
      if (!force) {
        const existing = await Document.findOne({ originalFilename: filename });
        if (existing) {
          skipped++;
          continue;
        }
      }

      const filePath = path.join(DOCS_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content.trim()) {
        console.warn(`⚠️  Skipping empty file: ${filename}`);
        skipped++;
        continue;
      }

      // Chunk the text
      const chunks = chunkText(content);

      // Generate embeddings for each chunk (batch with retry)
      const chunksWithEmbeddings = [];
      const { generateEmbeddings } = require('./embedding');
      try {
        const embeddings = await generateEmbeddings(chunks);
        for (let i = 0; i < chunks.length; i++) {
          chunksWithEmbeddings.push({
            content: chunks[i],
            embedding: embeddings[i],
            index: i
          });
        }
      } catch (batchErr) {
        console.warn(`  ⚠️  Batch embedding failed for ${filename}: ${batchErr.message}`);
        // Retry one-by-one with delay
        for (let i = 0; i < chunks.length; i++) {
          let embedding;
          try {
            await new Promise(r => setTimeout(r, 1000)); // 1s delay
            embedding = await generateEmbedding(chunks[i]);
          } catch (embErr) {
            console.warn(`  ⚠️  Embedding failed for chunk ${i} of ${filename}, skipping file`);
            break;
          }
          chunksWithEmbeddings.push({
            content: chunks[i],
            embedding,
            index: i
          });
        }
      }

      if (chunksWithEmbeddings.length === 0) {
        console.warn(`  ⚠️  No embeddings generated for ${filename}, skipping`);
        skipped++;
        continue;
      }

      // Add delay between files to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));

      // Create title from filename
      const title = filename
        .replace('.txt', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      // Store in MongoDB
      const document = new Document({
        title,
        originalFilename: filename,
        content,
        chunks: chunksWithEmbeddings,
        fileType: 'txt',
        fileSize: Buffer.byteLength(content, 'utf-8'),
        category: categorizeFile(filename),
        language: 'mixed',
        isProcessed: true,
        chunkCount: chunks.length
      });

      await document.save();
      ingested++;
      console.log(`  ✅ Ingested: ${filename} (${chunks.length} chunks)`);
    } catch (error) {
      console.error(`  ❌ Failed to ingest ${filename}:`, error.message);
    }
  }

  console.log(`📚 Auto-ingest complete: ${ingested} new, ${skipped} skipped`);
}

module.exports = { autoIngestDocs };
