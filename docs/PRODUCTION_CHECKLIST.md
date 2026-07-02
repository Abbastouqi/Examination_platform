# Production Launch Checklist — PrepGenius

A pragmatic, ordered checklist to take PrepGenius from local dev to a live domain.
Items marked **[done]** are already implemented in the codebase; **[action]** items
require your input/credentials before launch.

---

## 1. Secrets & configuration
- **[action]** Generate a strong `SECRET_KEY`: `python -c "import secrets;print(secrets.token_urlsafe(64))"`.
- **[action]** Set a strong `ADMIN_PASSWORD` and a real `ADMIN_EMAIL`. (The backend logs a **critical** warning at startup if defaults are used in production — see `main.py`.)
- **[action]** **Rotate any secret ever shared in chat/screenshots**: Google OAuth client secret, Gmail App Password.
- **[done]** All secrets are read from env (`.env`), which is git-ignored. `.env.example` holds placeholders only.
- **[action]** Set `ENVIRONMENT=production` (enables HSTS header + the secret guard).

## 2. Domain, CORS & OAuth
- **[action]** Set `BACKEND_CORS_ORIGINS=https://your-domain.pk` (comma-separated; no trailing slash).
- **[action]** Set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` to the real domain(s).
- **[action]** Google Cloud Console → add production **Authorized redirect URI** `https://api.your-domain.pk/api/v1/auth/google/callback` and JS origin `https://your-domain.pk`; move the OAuth consent screen out of "Testing" (or keep test users) → set `GOOGLE_REDIRECT_URI` accordingly.

## 3. TLS / reverse proxy
- **[done]** `deploy/nginx.conf` terminates TLS and proxies frontend + API, with SSE-friendly buffering off for `/chat` and `/css/ask` streaming.
- **[action]** Provision certs (Let's Encrypt/Certbot) into `deploy/certs/` (`fullchain.pem`, `privkey.pem`).
- **[done]** Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS in prod) are set by FastAPI middleware.

## 4. Build & run (production)
- **[done]** `docker-compose.prod.yml` runs Gunicorn (4 Uvicorn workers), a built Next.js (`next build && next start`), 4 Celery workers, and Nginx.
- **[action]** Launch: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
- **[action]** Seed once: `docker compose exec backend python -m app.scripts.seed` and `... app.scripts.seed_questions`.
- **[done]** Frontend `next build` verified to succeed; error/404/loading boundaries prevent blank screens.

## 5. AI model
- **[action]** Point `QWEN_BASE_URL` / `QWEN_MODEL` at a reliable, adequately-fast model endpoint. The current university endpoints are shared and occasionally slow/offline; for a public launch use a dedicated/hosted model (or a queue + realistic timeouts). `QWEN_TIMEOUT` is tunable.
- **[done]** Streaming responses (SSE) for chat + CSS guide minimise perceived latency; long structured tasks (essay/précis/MCQ) show progress indicators.
- **[note]** Consider a fallback model and a circuit breaker so an LLM outage degrades gracefully rather than erroring.

## 6. Email & payments
- **[action]** Configure SMTP (Gmail App Password or a transactional provider like SES/Resend) for verification/reset emails.
- **[action]** Complete JazzCash/Easypaisa merchant onboarding; the **manual proof-upload + admin approval** flow works today and needs no gateway. Verify the gateway hashing against your merchant spec before enabling automated checkout.

## 7. Data, backups & monitoring
- **[action]** Managed MongoDB (Atlas) or a backed-up self-hosted replica set; enable daily snapshots.
- **[action]** Persist Qdrant + uploads volumes; back them up.
- **[done]** Operational events are written to the `system_logs` collection (admin → Logs). **[action]** Add external monitoring/uptime (e.g. UptimeRobot on `/health`) and error tracking (e.g. Sentry).
- **[done]** `/health` endpoint for load-balancer checks.

## 8. Security (implemented)
- **[done]** Rate limiting (Redis) on login/signup/forgot-password, guest trial, and the public API.
- **[done]** Bcrypt password hashing; JWT access+refresh; RBAC (admin/user); API keys stored hashed (shown once).
- **[done]** Pydantic validation on all inputs; upload type/size limits; server-side test grading (answers never sent mid-attempt).
- **[review]** JWTs are stored in `localStorage` (simple, works). For higher security consider httpOnly-cookie sessions — a larger change; acceptable for launch, plan as a follow-up.

## 9. Scalability notes
- Stateless API → scale horizontally behind Nginx/LB (bump Gunicorn workers / replicas).
- MongoDB, Qdrant, Redis are external services → scale independently; add indexes (already created on hot paths).
- Celery workers absorb heavy ingestion/embedding jobs off the request path.
- Move the embedding model + LLM to dedicated GPU hosts under real load.

## 10. Pre-launch smoke test
- Sign up → verify email → login → Google login.
- Generate MCQs, take a mock test, submit, review, check history & analytics.
- CSS essay + précis evaluation; CSS guide streaming; chat streaming (+ Stop/Copy/Regenerate).
- Guest `/trial` → signup gate. Admin: users, payments approval, documents upload, logs, revenue.
- Toggle dark mode; test on mobile viewport; run Lighthouse on `/`.
