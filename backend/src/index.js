const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const whatsappRoutes = require('./routes/whatsapp');
const timetableRoutes = require('./routes/timetable');
const userRoutes = require('./routes/user');
const { autoIngestDocs } = require('./services/ingest');
const { initAutoScrape } = require('./jobs/autoScrape');
const { errorHandler, chatRateLimiter, generalRateLimiter } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 5005;

// Ultra-early debug (before ANY middleware)
app.post('/api/debug/raw0', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => res.json({ rawBody: body, headers: req.headers['content-type'] }));
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5176', 'http://localhost:5173', 'https://frontend-kappa-six-83.vercel.app', 'https://frontend-o1lsq1o5n-vexcczs-projects.vercel.app', 'capacitor://localhost', 'http://localhost'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug: echo body BEFORE rate limiter
app.post('/api/debug/echo-raw', (req, res) => {
  res.json({ body: req.body, ip: req.ip, hasMessage: !!req.body?.message });
});

// Apply general rate limiter to all routes AFTER debug-raw
app.use(generalRateLimiter);

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/user', userRoutes);

// Direct POST /api/chat endpoint (alias for /api/chat/send) with chat rate limit
const { sendMessage } = require('./controllers/chatController');
app.post('/api/chat', chatRateLimiter, sendMessage);

// Debug endpoint (check env vars on Render)
app.get('/api/debug', (req, res) => {
  res.json({
    hasDeepSeek: !!process.env.DEEPSEEK_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    hasCerebras: !!process.env.CEREBRAS_API_KEY,
    hasMongo: !!process.env.MONGODB_URI,
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});

// Debug chat test
app.get('/api/debug/chat', async (req, res) => {
  try {
    const { queryRAG } = require('./services/rag');
    const result = await queryRAG('apa itu umpsa', { language: 'ms' });
    res.json({ ok: true, content: result.content?.substring(0, 100), provider: result.metadata?.provider });
  } catch (e) {
    res.json({ ok: false, error: e.message, stack: e.stack?.substring(0, 300) });
  }
});

// Debug: echo body to test JSON parsing
app.post('/api/debug/echo', (req, res) => {
  res.json({ body: req.body, hasMessage: !!req.body?.message });
});

// Debug: test sendMessage directly without rate limiter
app.post('/api/debug/send', async (req, res) => {
  try {
    const { queryRAG } = require('./services/rag');
    const { v4: uuidv4 } = require('uuid');
    const message = req.body.message;
    const convId = req.body.conversationId || uuidv4();
    if (!message) return res.json({ debugError: 'no message in body', body: req.body });
    const result = await queryRAG(message, { language: 'en' });
    res.json({ ok: true, convId, content: result.content?.substring(0, 150), provider: result.metadata?.provider, sources: result.sources?.length || 0 });
  } catch (e) {
    res.status(500).json({ debugCatch: e.message, name: e.name, stack: e.stack?.substring(0, 800) });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'UMPSABot API',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Start listening FIRST so Render detects the port immediately
    app.listen(PORT, () => {
      console.log(`🚀 UMPSABot API v2.0 running on http://localhost:${PORT}`);
      console.log(`📊 Admin dashboard: http://localhost:${PORT}/api/admin/stats`);
    });

    // Auto-ingest docs AFTER server is up (non-blocking)
    const forceReingest = process.env.FORCE_REINGEST === 'true';
    autoIngestDocs(forceReingest).then(() => {
      if (forceReingest) {
        console.log('✅ Force re-ingest complete. You can remove FORCE_REINGEST=true now.');
      }
      console.log('✅ Auto-ingest complete');
    }).catch(err => console.error('⚠️ Ingest error:', err.message));

    // Initialize weekly auto-scrape cron job
    initAutoScrape();
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('⚠️  Starting server without database connection...');
    
    app.listen(PORT, () => {
      console.log(`🚀 UMPSABot API running on http://localhost:${PORT} (no DB)`);
    });
  }
}

start();
