# UMPSABot 🤖

AI-powered chatbot for UMPSA students. Answers questions about fees, registration, hostel, academic calendar, and more — using official UMPSA documents.

Built for **FinTech Forward 2026** (PETAKOM UMPSA).

## Live Demo

- **Web:** [https://frontend-kappa-six-83.vercel.app](https://frontend-kappa-six-83.vercel.app)
- **API:** [https://umpsa-chatbot-api.onrender.com](https://umpsa-chatbot-api.onrender.com)
- **Mobile:** Android APK available in Releases

## What It Does

Students ask questions in BM, English, or Manglish. The chatbot searches through 96 official UMPSA documents and generates answers with source citations.

Not a generic ChatGPT wrapper — trained specifically on UMPSA data.

### Key Features

- **RAG Pipeline** — Retrieval-Augmented Generation for accurate, sourced answers
- **96 Knowledge Base Documents** — fees, registration, hostel, academic calendar, clubs, facilities
- **Jina AI Embeddings** — semantic search (768-dim vectors) with keyword boosting
- **5-Layer LLM Failover** — DeepSeek → Groq → OpenRouter → Cerebras → Template fallback
- **Timetable Planner** — input course codes, get non-clashing combinations
- **Streaming Responses** — SSE-based real-time response streaming
- **Conversation Memory** — remembers last 5 messages for follow-up questions
- **Multi-language** — BM, English, Manglish with auto-detection
- **Smart Caching** — popular answers cached with TTL refresh
- **Feedback System** — thumbs up/down to track answer quality
- **Source Citations** — every answer shows which document it came from
- **WhatsApp Integration** — chat via WhatsApp (Twilio)
- **Mobile App** — Flutter Android app with full chat functionality
- **Admin Panel** — document upload, stats, popular questions tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas |
| LLM | DeepSeek (primary) + 4 fallback providers |
| Embeddings | Jina AI (jina-embeddings-v2-base-en, 768d) |
| Mobile | Flutter 3.29 |
| Deploy | Vercel (frontend) + Render (backend) |

## AI Tools & Techniques

| Tool | Purpose |
|------|----------|
| DeepSeek V3 | Primary LLM for generating responses from retrieved documents |
| Groq (Llama 3.3 70B) | Fallback LLM provider (fast inference) |
| OpenRouter | Secondary fallback LLM routing |
| Cerebras | Tertiary fallback LLM provider |
| Jina AI Embeddings | Semantic vector embeddings (768-dim) for document search |
| RAG Pipeline | Custom retrieval-augmented generation with hybrid search |
| TF-IDF + BM25 | Keyword boosting and synonym expansion alongside semantic search |
| Cosine Similarity | Vector similarity scoring for document chunk retrieval |
| Intent Classification | Keyword-based intent detection (timetable, fees, hostel, etc.) |
| Language Detection | Auto-detect BM/EN/Manglish from user input |

## Project Structure

```
umpsa-chatbot/
├── frontend/          React + Vite web app
├── backend/
│   ├── src/
│   │   ├── controllers/   Chat, feedback, reingest
│   │   ├── services/      RAG, LLM, embedding, cache, chunking, ingest
│   │   ├── models/        MongoDB schemas
│   │   ├── routes/        API routes
│   │   ├── middleware/    Rate limiting, auth, error handling
│   │   └── jobs/          Auto-scrape cron
│   └── docs/              96 UMPSA knowledge base files (.txt)
├── mobile/            Flutter Android app
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- DeepSeek API key (free: https://platform.deepseek.com)
- Jina AI API key (free 1M tokens/month: https://jina.ai)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in API keys
npm run dev
```

Runs on `http://localhost:5005`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

APK build:
```bash
cd mobile/android
./gradlew assembleRelease
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key (primary LLM) |
| `JINA_API_KEY` | Yes | Jina AI embeddings key |
| `GROQ_API_KEY` | No | Groq fallback |
| `OPENROUTER_API_KEY` | No | OpenRouter fallback |
| `CEREBRAS_API_KEY` | No | Cerebras fallback |
| `PORT` | No | Server port (default: 5005) |
| `FORCE_REINGEST` | No | Set `true` to re-embed all docs on startup |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/send` | Send message, get AI response |
| POST | `/api/chat/stream` | Stream response via SSE |
| POST | `/api/chat/feedback` | Submit thumbs up/down |
| GET | `/api/chat/conversations` | List conversations |
| POST | `/api/timetable/plan` | Plan non-clashing timetable |
| GET | `/api/timetable/courses` | List available courses |
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/popular-questions` | Top 20 queries |
| GET | `/api/admin/reingest` | Re-embed all documents |
| POST/GET | `/api/user/preferences` | Student personalization |

## How RAG Works

1. Student asks a question
2. Query embedded using Jina AI (768-dim vector)
3. Cosine similarity search across all document chunks
4. Keyword boosting + BM/EN synonym expansion
5. Top 8 relevant chunks sent to DeepSeek LLM
6. LLM generates answer based only on retrieved documents
7. Response includes source citations

## Performance

- **Accuracy:** 80%+ on test queries
- **Response time:** < 3 seconds
- **Knowledge base:** 96 documents, 400+ chunks
- **Uptime:** 5-layer failover ensures near-zero downtime
- **Cost:** $0 (all free tiers)

## Built By

**Zafran** (CB23109) — Faculty of Computing, UMPSA

Solo project for FinTech Forward 2026 Hackathon.

## License

MIT
