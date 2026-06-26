# PrepGenius — REST API Reference

Base URL (dev): `http://localhost:8000`
All application routes are prefixed with **`/api/v1`**.

**Auth schemes**
- **Bearer JWT** — `Authorization: Bearer <access_token>` for user/admin routes.
- **API key** — `X-API-Key: <key>` for `/public/*` routes (external access).
- **Public** — no auth (signup, login, refresh, OAuth, plan catalog).

Errors use standard HTTP codes: `400` validation, `401` unauthenticated,
`403` forbidden (RBAC), `404` not found, `409` conflict (e.g. duplicate email),
`429` quota exceeded.

Interactive OpenAPI docs are served at `http://localhost:8000/docs`.

---

## 1. Auth — `/api/v1/auth`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/auth/signup` | public | `{email, password, name}` | `201 {id, email}` + sends verify email |
| POST | `/auth/login` | public | **form**: `username`, `password` | `{access_token, refresh_token, token_type}` |
| POST | `/auth/refresh` | public | `{refresh_token}` | `{access_token, refresh_token}` |
| GET  | `/auth/google/login` | public | — | `302` redirect to Google consent |
| GET  | `/auth/google/callback` | public | `?code=` | `{access_token, refresh_token}` |
| POST | `/auth/verify-email` | public | `{token}` | `{ok: true}` |
| POST | `/auth/forgot-password` | public | `{email}` | `{ok: true}` (sends reset email) |
| POST | `/auth/reset-password` | public | `{token, new_password}` | `{ok: true}` |

> `/auth/login` follows the OAuth2 password form convention (`username` = email),
> so it accepts `application/x-www-form-urlencoded`, not JSON.

---

## 2. Users — `/api/v1/users`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET   | `/users/me` | Bearer | — | user profile |
| PATCH | `/users/me` | Bearer | `{name?, target_exams?}` | updated profile |
| POST  | `/users/me/change-password` | Bearer | `{current_password, new_password}` | `{ok: true}` |
| GET   | `/users/me/usage` | Bearer | — | `{plan, date, mcq, chat, mocktest, limits}` |

---

## 3. MCQ — `/api/v1/mcq`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/mcq/generate` | Bearer (metered) | `{test_type, subject_id, topic_id?, difficulty, count}` | `{mcqs: [...]}` (RAG + Qwen) |
| GET  | `/mcq` | Bearer | query: `test_type?, subject_id?, topic_id?, difficulty?, q?, limit?, skip?` | `{items, total}` |
| POST | `/mcq/explain` | Bearer | `{question, options, correct_index}` or `{mcq_id}` | `{explanation}` |

`POST /mcq/generate` consumes the `mcq` daily quota for Free users; returns `429`
when the limit is hit.

---

## 4. Tests — `/api/v1/tests`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/tests` | Bearer (metered) | `{kind, test_type, subject_id?, topic_id?, count, duration_minutes}` | created test |
| GET  | `/tests` | Bearer | query filters | `{items, total}` |
| GET  | `/tests/{id}` | Bearer | — | test detail |
| POST | `/tests/{id}/start` | Bearer (metered) | — | `{attempt_id, mcqs (no answers), duration}` |
| POST | `/tests/attempts/{aid}/submit` | Bearer | `{answers: [{mcq_id, selected_index}]}` | `{score, correct, total}` |
| GET  | `/tests/attempts/{aid}/result` | Bearer | — | `{score, correct, total, per_topic}` |
| GET  | `/tests/attempts/{aid}/review` | Bearer | — | per-question review with correct answers + explanations |

Starting a test consumes the `mocktest` quota for Free users. Grading is
server-side; the start payload never exposes correct answers.

---

## 5. Chat — `/api/v1/chat`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET    | `/chat/conversations` | Bearer | — | list of conversations |
| POST   | `/chat/conversations` | Bearer | `{title?, rag_enabled?}` | created conversation |
| GET    | `/chat/conversations/{id}` | Bearer | — | conversation with messages |
| PATCH  | `/chat/conversations/{id}` | Bearer | `{title?, rag_enabled?}` | updated |
| DELETE | `/chat/conversations/{id}` | Bearer | — | `{ok: true}` |
| POST   | `/chat/message` | Bearer (metered) | `{conversation_id, content}` | **SSE stream** of tokens |

`/chat/message` returns `text/event-stream`; consumes the `chat` quota per
message for Free users.

---

## 6. Documents — `/api/v1/documents`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST   | `/documents/upload` | Bearer | multipart: `file`, `test_type?`, `subject_id?`, `topic_id?`, `kind?` | `{id, status: "pending"}` (queues ingest) |
| GET    | `/documents` | Bearer | filters | `{items, total}` |
| GET    | `/documents/{id}` | Bearer | — | document + `status`, `chunk_count` |
| DELETE | `/documents/{id}` | Bearer | — | `{ok: true}` (removes file + Qdrant chunks) |

---

## 7. Analytics — `/api/v1/analytics`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET  | `/analytics/overview` | Bearer | — | attempts, avg score, accuracy trend |
| GET  | `/analytics/weak-areas` | Bearer | — | LLM-derived `[{topic, accuracy, advice}]` |
| POST | `/analytics/study-plan` | Bearer | `{test_type, horizon_days}` | generated plan (persisted) |
| GET  | `/analytics/recommendations` | Bearer | — | prioritized topic recommendations |
| GET  | `/analytics/study-plans` | Bearer | — | list of saved plans |

---

## 8. Subscriptions — `/api/v1/subscriptions`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET  | `/subscriptions/plans` | public | — | `[{plan, price_pkr, features}]` (Free/Pro/Premium) |
| GET  | `/subscriptions/me` | Bearer | — | current subscription |
| POST | `/subscriptions/cancel` | Bearer | — | `{status: "canceled"}` |

---

## 9. Payments — `/api/v1/payments`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/payments/subscribe` | Bearer | `{plan, provider}` | `{redirect_url, txn_ref}` (hosted checkout) |
| POST | `/payments/callback/jazzcash` | provider | provider form/payload | `200` (verifies secure hash, activates plan) |
| POST | `/payments/callback/easypaisa` | provider | provider form/payload | `200` (verifies secure hash, activates plan) |
| GET  | `/payments/history` | Bearer | — | `{items}` |

`/payments/subscribe` returns a redirect to the JazzCash/Easypaisa hosted page
with a signed (secure-hash) request. Callbacks are verified server-side before
the subscription is activated.

---

## 10. API Keys — `/api/v1/api-keys`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST   | `/api-keys` | Bearer | `{name, scopes: ["mcq"\|"chat"], expires_at?}` | `{id, key}` — **plaintext shown once** |
| GET    | `/api-keys` | Bearer | — | `[{id, name, prefix, scopes, last_used_at, revoked}]` |
| DELETE | `/api-keys/{id}` | Bearer | — | `{ok: true}` (revokes) |
| GET    | `/api-keys/{id}/usage` | Bearer | — | metered usage for the key |

Keys are stored only as a sha256 hash; the full key is never retrievable after
creation.

---

## 11. Admin — `/api/v1/admin` (role: admin)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET    | `/admin/users` | query filters | paginated users |
| PATCH  | `/admin/users/{id}` | `{role?, is_active?}` | updated user |
| DELETE | `/admin/users/{id}` | — | `{ok: true}` |
| GET    | `/admin/subjects` | — | subjects |
| POST   | `/admin/subjects` | `{name, slug, test_types, ...}` | created subject |
| PATCH  | `/admin/subjects/{id}` | partial | updated |
| DELETE | `/admin/subjects/{id}` | — | `{ok: true}` |
| GET    | `/admin/topics` | `?subject_id=` | topics |
| POST   | `/admin/topics` | `{subject_id, name, slug, ...}` | created topic |
| DELETE | `/admin/topics/{id}` | — | `{ok: true}` |
| GET    | `/admin/syllabus` | filters | syllabus entries |
| GET    | `/admin/logs` | `?level=&limit=` | system logs |
| GET    | `/admin/analytics/overview` | — | platform-wide metrics |
| GET    | `/admin/analytics/revenue` | — | revenue stats (PKR) |
| GET    | `/admin/api-keys` | — | all API keys (oversight) |

All `/admin/*` routes require an `admin`-role JWT; non-admins receive `403`.

---

## 12. Public API — `/api/v1/public` (header: `X-API-Key`)

| Method | Path | Scope | Body | Response |
|--------|------|-------|------|----------|
| POST | `/public/mcqs` | `mcq` | `{test_type, subject_id?, topic_id?, difficulty?, count}` | `{mcqs: [...]}` |
| POST | `/public/ask` | `chat` | `{question, test_type?, subject_id?, topic_id?}` | `{answer, sources}` (RAG) |
| POST | `/public/explain` | `mcq` | `{question, options, correct_index}` | `{explanation}` |

Each call is authenticated by the `X-API-Key` header, checked against the key's
scopes and expiry, and metered. Invalid/expired/out-of-scope keys return `401`/`403`.

---

## 13. Examples

### Signup
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"ahsan@oraclaim.com","password":"S3cret!pass","name":"Ahsan"}'
```

### Login (form-encoded) and capture token
```bash
ACCESS=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=ahsan@oraclaim.com&password=S3cret!pass" | jq -r .access_token)
```

### Authenticated MCQ generation
```bash
curl -X POST http://localhost:8000/api/v1/mcq/generate \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"test_type":"CSS","subject_id":"66700000000000000000a001","difficulty":"medium","count":5}'
```

### Streaming chat (SSE)
```bash
# Create a conversation, then stream a message. -N disables curl buffering.
curl -N -X POST http://localhost:8000/api/v1/chat/message \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"66750000000000000000a500","content":"Explain the Indus Waters Treaty."}'

# Response is text/event-stream:
# data: The
# data:  Indus
# data:  Waters
# data:  Treaty (1960)...
# data: [DONE]
```

### Public API with X-API-Key
```bash
curl -X POST http://localhost:8000/api/v1/public/mcqs \
  -H "X-API-Key: pg_live_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{"test_type":"PPSC","subject_id":"66700000000000000000a001","difficulty":"easy","count":3}'
```

### Public ask (RAG)
```bash
curl -X POST http://localhost:8000/api/v1/public/ask \
  -H "X-API-Key: pg_live_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{"question":"When was the Lahore Resolution passed?","test_type":"CSS"}'
```
