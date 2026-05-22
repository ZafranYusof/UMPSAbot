/**
 * Auto-Scrape Job
 * Weekly cron job to scrape key UMPSA pages and re-ingest if content changed
 * Runs every Sunday at 3:00 AM (Asia/Kuala_Lumpur)
 */

const cron = require('node-cron');
const crypto = require('crypto');
const { ingestDocument } = require('../services/rag');
const Document = require('../models/Document');
const ScrapedPage = require('../models/ScrapedPage');

// Key UMPSA URLs to scrape weekly
const SCRAPE_URLS = [
  { url: 'https://umpsa.edu.my/en/about', title: 'UMPSA About', category: 'general' },
  { url: 'https://umpsa.edu.my/en/vice-chancellors-note', title: 'Vice Chancellor Note', category: 'general' },
  { url: 'https://umpsa.edu.my/en/corporate-information', title: 'Corporate Information', category: 'administrative' },
  { url: 'https://umpsa.edu.my/en/academic-calendar', title: 'Academic Calendar', category: 'academic' },
  { url: 'https://umpsa.edu.my/en/ranking', title: 'UMPSA Rankings', category: 'general' },
  { url: 'https://umpsa.edu.my/en/research', title: 'Research', category: 'academic' },
  { url: 'https://umpsa.edu.my/en/student-disability', title: 'Disability Services', category: 'facilities' },
  { url: 'https://admission.umpsa.edu.my/', title: 'Admission Portal', category: 'academic' },
  { url: 'https://admission.umpsa.edu.my/ug-programme', title: 'Undergraduate Programmes', category: 'academic' },
  { url: 'https://bendahari.umpsa.edu.my/', title: 'Bursary Department', category: 'administrative' },
  { url: 'https://library.umpsa.edu.my/', title: 'Library', category: 'facilities' },
  { url: 'https://jhepa.umpsa.edu.my/', title: 'Student Affairs (JHEPA)', category: 'administrative' },
  { url: 'https://ips.umpsa.edu.my/', title: 'Postgraduate Studies', category: 'academic' },
  { url: 'https://sukan.umpsa.edu.my/', title: 'Sports Centre', category: 'facilities' },
  { url: 'https://fk.umpsa.edu.my/', title: 'Faculty of Computing', category: 'academic' },
  { url: 'https://ftkee.umpsa.edu.my/', title: 'Faculty of Electrical Engineering', category: 'academic' },
  { url: 'https://ftkkp.umpsa.edu.my/', title: 'Faculty of Chemical Engineering', category: 'academic' },
  { url: 'https://ftkma.umpsa.edu.my/', title: 'Faculty of Mechanical Engineering', category: 'academic' },
  { url: 'https://fist.umpsa.edu.my/', title: 'Faculty of Industrial Sciences', category: 'academic' },
  { url: 'https://fim.umpsa.edu.my/', title: 'Faculty of Industrial Management', category: 'academic' },
];

/**
 * Generate MD5 hash of content for change detection
 */
function hashContent(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Fetch page content with timeout and basic HTML-to-text extraction
 */
async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UMPSABot/2.0 (Educational Chatbot; +https://umpsa.edu.my)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[AutoScrape] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();

    // Basic HTML to text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
      .replace(/<\/?(p|div|br|li|tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (text.length < 100) {
      console.warn(`[AutoScrape] Too little content from ${url} (${text.length} chars)`);
      return null;
    }

    return text;
  } catch (err) {
    console.error(`[AutoScrape] Fetch error for ${url}:`, err.message);
    return null;
  }
}

/**
 * Run the scrape job - fetch pages, compare hashes in DB, re-ingest if changed
 */
async function runScrapeJob() {
  const startTime = Date.now();
  console.log(`[AutoScrape] Starting scrape at ${new Date().toISOString()}`);

  const results = {
    total: SCRAPE_URLS.length,
    scraped: 0,
    changed: 0,
    ingested: 0,
    errors: 0,
    skipped: 0
  };

  for (const { url, title, category } of SCRAPE_URLS) {
    try {
      const content = await fetchPageContent(url);
      const filename = `autoscrape-${url.replace(/[^a-z0-9]/gi, '-')}.txt`;

      // Ensure ScrapedPage record exists
      let page = await ScrapedPage.findOne({ url });
      if (!page) {
        page = new ScrapedPage({ url, title, category, filename, status: 'pending' });
      }

      if (!content) {
        page.status = 'error';
        page.errorMessage = 'Failed to fetch or content too short';
        page.lastScraped = new Date();
        await page.save();
        results.errors++;
        continue;
      }

      results.scraped++;
      const contentHash = hashContent(content);

      // Check if content has changed
      if (page.contentHash === contentHash) {
        page.status = 'unchanged';
        page.lastScraped = new Date();
        page.errorMessage = null;
        await page.save();
        results.skipped++;
        continue;
      }

      // Content changed - re-ingest
      console.log(`[AutoScrape] Content changed for: ${title} (${url})`);
      results.changed++;

      // Delete old document if exists
      try {
        await Document.deleteMany({
          title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
      } catch (delErr) {
        // Non-critical, continue
      }

      // Ingest new content
      const buffer = Buffer.from(content, 'utf-8');
      await ingestDocument(buffer, {
        title,
        filename,
        fileType: 'txt',
        fileSize: buffer.length,
        category,
        language: 'mixed'
      });

      results.ingested++;

      // Update DB record
      page.contentHash = contentHash;
      page.lastScraped = new Date();
      page.filename = filename;
      page.status = 'success';
      page.errorMessage = null;
      await page.save();

      // Small delay between requests to be polite
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`[AutoScrape] Error processing ${url}:`, err.message);
      results.errors++;

      // Try to update status in DB
      try {
        await ScrapedPage.findOneAndUpdate(
          { url },
          { status: 'error', errorMessage: err.message, lastScraped: new Date() },
          { upsert: true }
        );
      } catch (_) {}
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[AutoScrape] Complete in ${duration}s:`, JSON.stringify(results));

  return results;
}

/**
 * Initialize the cron job
 * Schedule: Every Sunday at 3:00 AM (Asia/Kuala_Lumpur timezone)
 * Only runs in production environment
 */
function initAutoScrape() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('📅 Auto-scrape cron job skipped (not production)');
    return null;
  }

  try {
    const job = cron.schedule('0 3 * * 0', async () => {
      try {
        await runScrapeJob();
      } catch (err) {
        console.error(`[AutoScrape] Job failed:`, err.message);
      }
    }, {
      timezone: 'Asia/Kuala_Lumpur',
      scheduled: true
    });

    console.log('📅 Auto-scrape cron job scheduled: Every Sunday at 3:00 AM MYT');
    return job;
  } catch (err) {
    console.error(`[AutoScrape] Failed to initialize cron:`, err.message);
    return null;
  }
}

module.exports = {
  initAutoScrape,
  runScrapeJob,
  SCRAPE_URLS
};
