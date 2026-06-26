# PrepGenius — AI-Powered Exam Preparation Platform

An AI-powered preparation ecosystem for Pakistani competitive examinations
(**FPSC, NTS, PPSC, FGEI EST, Lecturer, PMS, CSS** and more), built around a
locally-hosted **Qwen** LLM and a full **RAG** pipeline.

## Features

- **Auth** — email/password, Google OAuth, email verification, password reset, RBAC (admin/user)
- **AI** — MCQ generation, explanations, study plans, mock tests, weak-area analysis, topic recommendations
- **RAG** — PDF/document ingestion → chunking → embeddings (bge-m3) → Qdrant → context-grounded Qwen answers
- **Mock Tests** — full-length, subject-wise, topic-wise; timed; results + mistake review
- **Chatbot** — GPT-style chat, persisted history, multi-turn conversations
- **Admin** — user management, content uploads, subjects/topics, analytics, revenue, API keys, system logs
- **Subscriptions** — Free vs Paid plans with usage quotas; JazzCash + Easypaisa payments
- **API Platform** — issue API keys, metered access to AI endpoints, usage stats

## Tech Stack

| Layer        | Technology                                            |
|--------------|-------------------------------------------------------|
| Frontend     | Next.js 14 (App Router, TypeScript, Tailwind)         |
| Backend      | FastAPI (Python 3.11), async, Pydantic v2             |
| Database     | MongoDB (Motor async driver)                          |
| Vector DB    | Qdrant                                                 |
| Cache/Queue  | Redis (rate limits, quotas, Celery broker)            |
| Embeddings   | sentence-transformers (`BAAI/bge-m3`, multilingual)   |
| LLM          | Qwen (your university server, OpenAI-compatible API)  |
| Workers      | Celery (PDF ingestion, embeddings, async jobs)        |
| Payments     | JazzCash, Easypaisa                                   |

## Quick Start (Development)

```bash
cp .env.example .env          # fill in secrets + QWEN_BASE_URL
docker compose up -d --build   # mongo, qdrant, redis, backend, worker, frontend
# Backend:  http://localhost:8000/docs
# Frontend: http://localhost:3000
docker compose exec backend python -m app.scripts.seed   # seed subjects/topics/admin
```

Default admin (change in `.env`): `admin@prepgenius.pk` / `ChangeMe123!`

## Repository Layout

```
.
├── backend/            FastAPI service (API, RAG, AI, workers)
├── frontend/           Next.js application
├── docs/               Architecture, DB, RAG, deployment, security
├── docker-compose.yml  Local dev orchestration
└── docker-compose.prod.yml
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment.
