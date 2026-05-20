# UMPSABot 🤖

AI-powered university assistant chatbot for UMPSA students. Built for **FinTech Forward 2026** (Track 2: AI For Good — Chatbots That Actually Help).

## Features

- 💬 Intelligent chat interface (mobile-first, dark theme)
- 📚 RAG (Retrieval Augmented Generation) pipeline for accurate answers
- 📄 Document ingestion (PDF/text → chunk → embed → store)
- 🔍 Semantic search over UMPSA knowledge base
- 🌐 Bilingual support (Bahasa Melayu + English)
- 📎 Source citation in responses
- ⚠️ Confidence-based fallback messages
- 🛡️ Admin panel for knowledge base management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| AI/LLM | Groq API (fast inference) |
| RAG | Vector embeddings + cosine similarity |
| Embeddings | sentence-transformers via Groq |

## Project Structure

```
umpsa-chatbot/
├── frontend/          (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── index.js
│   ├── package.json
│   └── .env.example
├── docs/              (sample UMPSA docs for testing)
├── README.md
└── .gitignore
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Groq API key (free tier: https://console.groq.com)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

Backend runs on **http://localhost:5005**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5176**

## Environment Variables

Copy `backend/.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5005) |
| `MONGODB_URI` | MongoDB connection string |
| `GROQ_API_KEY` | Groq API key for LLM inference |
| `EMBEDDING_MODEL` | Model for embeddings (default: sentence-transformers) |
| `LLM_MODEL` | Groq model name (default: llama-3.3-70b-versatile) |
| `CHUNK_SIZE` | Document chunk size (default: 500) |
| `CHUNK_OVERLAP` | Chunk overlap (default: 50) |

## Usage

1. Start backend and frontend
2. Upload UMPSA documents via Admin panel
3. Start chatting! The bot will answer based on uploaded knowledge

## Team

Built with ❤️ for FinTech Forward 2026 Hackathon

## License

MIT
