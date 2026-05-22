/**
 * Notifications Controller
 * Handles upcoming deadlines/events from knowledge base
 */

const Document = require('../models/Document');

/**
 * Get upcoming deadlines/events
 * GET /api/notifications/upcoming
 * Parses academic calendar data for dates within next 7 days
 */
async function getUpcoming(req, res, next) {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Search documents for date-related content (academic calendar, deadlines)
    const documents = await Document.find({
      isProcessed: true,
      $or: [
        { category: 'academic' },
        { title: { $regex: /calendar|jadual|tarikh|deadline|event/i } }
      ]
    }).lean();

    const events = [];

    for (const doc of documents) {
      if (!doc.chunks) continue;

      for (const chunk of doc.chunks) {
        const extracted = extractDatesFromText(chunk.content, now, nextWeek);
        events.push(...extracted.map(e => ({
          ...e,
          source: doc.title
        })));
      }
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      events,
      period: {
        from: now.toISOString().split('T')[0],
        to: nextWeek.toISOString().split('T')[0]
      },
      count: events.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Extract dates and events from text content
 * Looks for common date patterns and associated event descriptions
 */
function extractDatesFromText(text, fromDate, toDate) {
  const events = [];
  
  // Common date patterns
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // YYYY-MM-DD
    /(\d{4})-(\d{2})-(\d{2})/g,
    // "1 January 2025" or "1 Januari 2025"
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Mac|April|Mei|Jun|Julai|Ogos|September|Oktober|November|Disember)\s+(\d{4})/gi
  ];

  const monthMap = {
    'january': 0, 'februari': 1, 'february': 1, 'mac': 2, 'march': 2,
    'april': 3, 'mei': 4, 'may': 4, 'jun': 5, 'june': 5,
    'julai': 6, 'july': 6, 'ogos': 7, 'august': 7,
    'september': 8, 'oktober': 9, 'october': 9,
    'november': 10, 'disember': 11, 'december': 11, 'januari': 0
  };

  const lines = text.split('\n');

  for (const line of lines) {
    // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
    let match;
    const pattern1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
    while ((match = pattern1.exec(line)) !== null) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const year = parseInt(match[3]);
      const date = new Date(year, month, day);

      if (date >= fromDate && date <= toDate) {
        const title = extractEventTitle(line, match[0]);
        if (title) {
          events.push({
            title,
            date: date.toISOString().split('T')[0],
            type: classifyEventType(title)
          });
        }
      }
    }

    // Pattern 2: YYYY-MM-DD
    const pattern2 = /(\d{4})-(\d{2})-(\d{2})/g;
    while ((match = pattern2.exec(line)) !== null) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      const date = new Date(year, month, day);

      if (date >= fromDate && date <= toDate) {
        const title = extractEventTitle(line, match[0]);
        if (title) {
          events.push({
            title,
            date: date.toISOString().split('T')[0],
            type: classifyEventType(title)
          });
        }
      }
    }

    // Pattern 3: "1 January 2025" style
    const pattern3 = /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Mac|April|Mei|Jun|Julai|Ogos|September|Oktober|November|Disember)\s+(\d{4})/gi;
    while ((match = pattern3.exec(line)) !== null) {
      const day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const month = monthMap[monthName];

      if (month !== undefined) {
        const date = new Date(year, month, day);
        if (date >= fromDate && date <= toDate) {
          const title = extractEventTitle(line, match[0]);
          if (title) {
            events.push({
              title,
              date: date.toISOString().split('T')[0],
              type: classifyEventType(title)
            });
          }
        }
      }
    }
  }

  return events;
}

/**
 * Extract event title from a line containing a date
 */
function extractEventTitle(line, dateStr) {
  // Remove the date from the line and clean up
  let title = line.replace(dateStr, '').trim();
  // Remove common separators
  title = title.replace(/^[\-\:\|\/\,\s]+/, '').replace(/[\-\:\|\/\,\s]+$/, '').trim();
  
  if (title.length < 3) return null;
  if (title.length > 200) title = title.substring(0, 200);
  
  return title;
}

/**
 * Classify event type based on keywords
 */
function classifyEventType(title) {
  const lower = title.toLowerCase();
  
  if (/exam|peperiksaan|ujian|test|quiz|kuiz/.test(lower)) return 'exam';
  if (/register|daftar|pendaftaran|enrol/.test(lower)) return 'registration';
  if (/deadline|tarikh akhir|due|hantar|submit/.test(lower)) return 'deadline';
  if (/holiday|cuti|rehat|break/.test(lower)) return 'holiday';
  if (/orientation|minggu|mds|destini/.test(lower)) return 'orientation';
  if (/fee|yuran|bayar|payment/.test(lower)) return 'payment';
  
  return 'event';
}

module.exports = {
  getUpcoming
};
