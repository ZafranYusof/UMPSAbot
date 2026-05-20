/**
 * Intent Classification Service
 * Classifies user intent before RAG processing
 */

// Course code pattern: 3 uppercase letters + 4 digits
const COURSE_CODE_REGEX = /[A-Z]{3}\d{4}/g;

// Keyword patterns for each intent category
const INTENT_PATTERNS = {
  greeting: {
    keywords: ['hi', 'hello', 'hey', 'assalamualaikum', 'salam', 'hai', 'helo', 'good morning', 'good afternoon', 'good evening', 'selamat pagi', 'selamat petang', 'selamat malam', 'apa khabar', 'how are you'],
    priority: 10
  },
  timetable: {
    keywords: ['plan timetable', 'jadual', 'timetable', 'schedule', 'clash', 'plan course', 'plan kursus', 'susun jadual'],
    priority: 15
  },
  academic: {
    keywords: ['course', 'kursus', 'subject', 'subjek', 'credit', 'kredit', 'gpa', 'cgpa', 'exam', 'peperiksaan', 'lecture', 'kuliah', 'tutorial', 'assignment', 'tugasan', 'semester', 'syllabus', 'silibus', 'faculty', 'fakulti', 'program', 'degree', 'diploma', 'master', 'phd', 'thesis', 'fyp', 'final year project', 'academic', 'akademik', 'class', 'kelas', 'lecturer', 'pensyarah', 'dean', 'dekan'],
    priority: 5
  },
  hostel: {
    keywords: ['hostel', 'asrama', 'kolej kediaman', 'residential', 'room', 'bilik', 'roommate', 'dorm', 'accommodation', 'penginapan', 'check-in', 'check-out', 'hostel fee', 'laundry', 'wifi hostel', 'curfew', 'warden'],
    priority: 5
  },
  fees: {
    keywords: ['fee', 'yuran', 'payment', 'bayaran', 'tuition', 'scholarship', 'biasiswa', 'ptptn', 'loan', 'pinjaman', 'financial', 'kewangan', 'invoice', 'bil', 'refund', 'waiver', 'discount', 'bantuan', 'aid', 'sponsor'],
    priority: 5
  },
  registration: {
    keywords: ['register', 'daftar', 'registration', 'pendaftaran', 'enrol', 'enrollment', 'add drop', 'tambah gugur', 'intake', 'kemasukan', 'application', 'permohonan', 'admission', 'matric card', 'kad matrik', 'orientation', 'minggu destini siswa', 'mds'],
    priority: 5
  },
  facilities: {
    keywords: ['library', 'perpustakaan', 'lab', 'makmal', 'gym', 'stadium', 'cafeteria', 'cafe', 'kantin', 'parking', 'bus', 'shuttle', 'clinic', 'klinik', 'mosque', 'masjid', 'surau', 'atm', 'bank', 'bookshop', 'kedai buku', 'sport', 'sukan', 'pool', 'kolam'],
    priority: 4
  },
  general: {
    keywords: [],
    priority: 0
  }
};

// Greeting responses that don't need RAG
const GREETING_RESPONSES = {
  ms: 'Waalaikumussalam! Saya UMPSABot, pembantu AI untuk pelajar UMPSA. Bagaimana saya boleh membantu anda hari ini?',
  en: "Hello! I'm UMPSABot, an AI assistant for UMPSA students. How can I help you today?",
  mixed: "Hi! Saya UMPSABot, AI assistant untuk pelajar UMPSA. Apa yang boleh saya bantu?"
};

/**
 * Classify user intent based on keyword matching
 * @param {string} message - User message
 * @returns {object} { intent, confidence, needsRAG }
 */
function classifyIntent(message) {
  const lowerMessage = message.toLowerCase().trim();
  const words = lowerMessage.split(/\s+/);
  
  // Check for multiple course codes → timetable intent
  const courseCodes = message.match(COURSE_CODE_REGEX) || [];
  if (courseCodes.length >= 2) {
    return { intent: 'timetable', confidence: 0.95, needsRAG: false, courseCodes };
  }

  const scores = {};

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'general') continue;
    
    let matchCount = 0;
    for (const keyword of config.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword - check as phrase
        if (lowerMessage.includes(keyword)) matchCount += 2;
      } else {
        // Single word keyword
        if (words.includes(keyword)) matchCount += 1;
      }
    }
    
    if (matchCount > 0) {
      scores[intent] = matchCount + (config.priority * 0.1);
    }
  }

  // Determine top intent
  const entries = Object.entries(scores);
  
  if (entries.length === 0) {
    return { intent: 'general', confidence: 0.5, needsRAG: true };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = entries[0];

  // Greeting check - only if message is short and primarily a greeting
  if (topIntent === 'greeting' && words.length <= 5) {
    return { intent: 'greeting', confidence: 0.95, needsRAG: false };
  }

  // If greeting matched but message is longer, it probably has a real question
  if (topIntent === 'greeting' && words.length > 5) {
    // Check if there's a secondary intent
    if (entries.length > 1) {
      return { intent: entries[1][0], confidence: 0.7, needsRAG: true };
    }
    return { intent: 'general', confidence: 0.5, needsRAG: true };
  }

  // Timetable intent from keywords (single course code or keyword match)
  if (topIntent === 'timetable') {
    return { intent: 'timetable', confidence: Math.min(0.95, 0.5 + (topScore * 0.1)), needsRAG: false, courseCodes };
  }

  const confidence = Math.min(0.95, 0.5 + (topScore * 0.1));
  return { intent: topIntent, confidence, needsRAG: true };
}

/**
 * Get greeting response without RAG
 * @param {string} language - Response language
 * @returns {string} Greeting response
 */
function getGreetingResponse(language) {
  return GREETING_RESPONSES[language] || GREETING_RESPONSES.mixed;
}

module.exports = {
  classifyIntent,
  getGreetingResponse,
  INTENT_PATTERNS,
  COURSE_CODE_REGEX
};
