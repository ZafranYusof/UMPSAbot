# UMPSABot

Answers questions about fees, registration, hostel, academic calendar, and more using official UMPSA documents.

## Live Demo
- **API (Primary):** [http://103.40.204.158](http://103.40.204.158) (IPServerOne VPS, Malaysia)
- **API (Backup):** [https://umpsa-chatbot-api.onrender.com](https://umpsa-chatbot-api.onrender.com)
- **Mobile:** Android APK available in [Releases](https://github.com/ZafranYusof/umpsa-chatbot/releases)

## What It Does

Students ask questions in BM, English, or Manglish. The chatbot searches through 148 official UMPSA documents and generates answers with source citations.

Not a generic ChatGPT wrapper, trained specifically on UMPSA data.

### Key Features

- **RAG Pipeline** — Retrieval-Augmented Generation for accurate, sourced answers
- **148 Knowledge Base Documents** — fees, registration, hostel, academic calendar, clubs, facilities, admission, counselling, library, career services
- **Web Scraping** — automated scraping of 20 UMPSA official pages (weekly cron, change detection)
- **Ollama Cloud Embeddings** — semantic search (nomic-embed-text, 768-dim vectors) with keyword boosting
- **75-Entry BM/EN Synonym Map** — cross-language matching (Malaya NLP-generated)
- **35+ Manglish Shortform Normalization** — brapa→berapa, nk→nak, mcm→macam, yg→yang
- **5-Layer LLM Failover** — Ollama Cloud → DeepSeek → Groq → OpenRouter → Template fallback
- **Timetable Planner** — input course codes, get non-clashing combinations
- **Streaming Responses** — SSE-based real-time response streaming
- **Persistent Conversation Memory** — MongoDB-backed, 30-day TTL
- **Follow-up Detection** — pronouns, conjunctions, short queries auto-link context
- **Multi-language** — BM, English, Manglish with auto-detection
- **Full i18n** — All UI strings localized (English/Bahasa Melayu)
- **Smart Caching** — popular answers cached with TTL refresh
- **Feedback Loop** — auto-flags low confidence queries for admin review
- **Source Citations** — every answer shows which document it came from
- **Comparison Intent** — "beza X vs Y" formatted as structured comparison
- **WhatsApp Integration** — chat via WhatsApp (Twilio)
- **Mobile App** — Flutter Android app with SAMs-inspired premium dark theme
- **Offline Cache** — LRU 50 entries, fuzzy Jaccard matching for mobile
- **Onboarding Flow** — 4-step personalization (faculty, year, language)
- **Admin Panel** — document upload, stats, popular questions, failed queries tracking
- **Batched Re-embedding** — admin endpoint for incremental re-embedding without downtime

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas |
| LLM | Ollama Cloud (gpt-oss:120b) + 4 fallback providers |
| Embeddings | Ollama Cloud (nomic-embed-text, 768d) |
| Mobile | Flutter 3.29 (Google Fonts, Provider) |
| Deploy | IPServerOne VPS (primary) + Vercel (frontend) + Render (backup) |

## AI Tools Used

| Tool | Purpose |
|------|----------|
| Ollama Cloud (gpt-oss:120b) | Primary LLM for generating responses from retrieved documents |
| DeepSeek V3 | Secondary LLM fallback |
| Groq (Llama 3.3 70B) | Tertiary LLM provider (fast inference) |
| OpenRouter | Quaternary fallback LLM routing |
| Ollama Cloud (nomic-embed-text) | Semantic vector embeddings (768-dim) for document search |
| HuggingFace (MiniLM-L12-v2) | Fallback embedding provider (384-dim) |

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
- Ollama Cloud API key (https://ollama.com)

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
| `OPENAI_BASE_URL` | Yes | Ollama Cloud base URL |
| `OPENAI_API_KEY` | Yes | Ollama Cloud API key |
| `OLLAMA_EMBED_MODEL` | Yes | Embedding model (nomic-embed-text) |
| `OLLAMA_ENABLED` | No | Enable Ollama LLM (default: false) |
| `GROQ_API_KEY` | No | Groq fallback |
| `OPENROUTER_API_KEY` | No | OpenRouter fallback |
| `CEREBRAS_API_KEY` | No | Cerebras fallback |
| `PORT` | No | Server port (default: 5005) |

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
| GET | `/api/admin/reingest-batch` | Re-embed in batches (?skip=N&limit=M) |
| GET | `/api/admin/ingest-new` | Ingest new docs from filesystem |
| GET | `/api/admin/debug-docs` | Check docs filesystem path |
| POST/GET | `/api/user/preferences` | Student personalization |

## How RAG Works

1. Student asks a question
2. Manglish shortform normalization (35+ slang terms)
3. Query embedded using Ollama Cloud (nomic-embed-text, 768-dim vector)
4. Cosine similarity search across all document chunks
5. Keyword boosting + 75-entry BM/EN synonym expansion
6. Top 8 relevant chunks sent to Ollama Cloud LLM (gpt-oss:120b)
7. LLM generates answer based only on retrieved documents
8. Post-processing: strips markdown, validates no rejection phrases
9. Response includes source citations

## Performance

- **Accuracy:** 100% (60/60 across BM, English, and Manglish queries)
- **Response time:** < 3 seconds (streaming)
- **Knowledge base:** 148 documents, 500+ chunks
- **Synonym coverage:** 75 BM/EN cross-language pairs
- **Uptime:** Always-on VPS + 5-layer failover ensures near-zero downtime
- **Caching:** Popular answers cached, < 500ms repeat queries
- **Cost:** $0 API costs (Ollama Cloud free tier)

### Accuracy Test Results

| Test Type | Score | Details |
|-----------|-------|---------|
| Pure BM | 20/20 (100%) | Standard BM questions |
| English | 20/20 (100%) | Full English queries |
| Manglish | 20/20 (100%) | Casual mixed slang |
| **Overall** | **60/60 (100%)** | All test types combined |

## License

MIT
