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
const { autoIngestDocs } = require('./services/ingest');
const { errorHandler, chatRateLimiter, generalRateLimiter } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors({
  origin: ['http://localhost:5176', 'http://localhost:5173', 'https://frontend-kappa-six-83.vercel.app', 'https://frontend-o1lsq1o5n-vexcczs-projects.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all routes
app.use(generalRateLimiter);

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Direct POST /api/chat endpoint (alias for /api/chat/send) with chat rate limit
const { sendMessage } = require('./controllers/chatController');
app.post('/api/chat', chatRateLimiter, sendMessage);

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
    
    // Auto-ingest docs from knowledge base
    // Force re-ingest if FORCE_REINGEST env var is set or first run after RAG update
    const forceReingest = process.env.FORCE_REINGEST === 'true';
    await autoIngestDocs(forceReingest);
    if (forceReingest) {
      console.log('✅ Force re-ingest complete. You can remove FORCE_REINGEST=true now.');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 UMPSABot API v2.0 running on http://localhost:${PORT}`);
      console.log(`📊 Admin dashboard: http://localhost:${PORT}/api/admin/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('⚠️  Starting server without database connection...');
    
    app.listen(PORT, () => {
      console.log(`🚀 UMPSABot API running on http://localhost:${PORT} (no DB)`);
    });
  }
}

start();
