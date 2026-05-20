/**
 * Auto-Ingest Service
 * Loads and ingests all .txt files from the docs/ folder on server startup
 * Skips files that are already ingested (checks by originalFilename)
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
 * Skips files already in the database
 */
async function autoIngestDocs() {
  console.log('📚 Starting auto-ingest of knowledge base documents...');

  if (!fs.existsSync(DOCS_DIR)) {
    console.warn('⚠️  Docs directory not found:', DOCS_DIR);
    return;
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.txt'));
  console.log(`📄 Found ${files.length} .txt files in docs/`);

  let ingested = 0;
  let skipped = 0;

  for (const filename of files) {
    try {
      // Check if already ingested
      const existing = await Document.findOne({ originalFilename: filename });
      if (existing) {
        skipped++;
        continue;
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

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i]);
        chunksWithEmbeddings.push({
          content: chunks[i],
          embedding,
          index: i
        });
      }

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
