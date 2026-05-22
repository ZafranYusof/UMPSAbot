/**
 * Malaya NLP Service Client
 * Calls the Python Flask microservice for stemming and text processing
 */

const MALAYA_URL = process.env.MALAYA_URL || 'http://localhost:5001';
const MALAYA_TIMEOUT = parseInt(process.env.MALAYA_TIMEOUT) || 3000;

let malayaAvailable = null; // null = unknown, true/false after first check

/**
 * Check if Malaya service is available
 */
async function checkMalayaHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${MALAYA_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    malayaAvailable = resp.ok;
    return malayaAvailable;
  } catch (err) {
    malayaAvailable = false;
    return false;
  }
}

/**
 * Process text through Malaya: expand shortforms + stem
 * Returns search_terms array for enhanced keyword matching
 * Falls back gracefully if service is down
 */
async function processWithMalaya(text) {
  // Skip if we know it's down
  if (malayaAvailable === false) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MALAYA_TIMEOUT);
    
    const resp = await fetch(`${MALAYA_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      malayaAvailable = false;
      return null;
    }

    const data = await resp.json();
    malayaAvailable = true;
    return data;
  } catch (err) {
    // Don't spam logs — just mark as unavailable temporarily
    if (malayaAvailable !== false) {
      console.warn(`[${new Date().toISOString()}] Malaya NLP service unavailable: ${err.message}`);
      malayaAvailable = false;
      // Retry after 60s
      setTimeout(() => { malayaAvailable = null; }, 60000);
    }
    return null;
  }
}

/**
 * Get stems for an array of words
 * Useful for expanding search terms with root words
 */
async function stemWords(text) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MALAYA_TIMEOUT);
    
    const resp = await fetch(`${MALAYA_URL}/stem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();
    return data.stems || [];
  } catch (err) {
    return null;
  }
}

// Check health on startup (non-blocking)
checkMalayaHealth().then(ok => {
  console.log(`[${new Date().toISOString()}] Malaya NLP service: ${ok ? 'AVAILABLE' : 'UNAVAILABLE'}`);
});

module.exports = { processWithMalaya, stemWords, checkMalayaHealth };
