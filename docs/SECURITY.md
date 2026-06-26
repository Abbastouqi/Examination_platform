# PrepGenius — Security

This document describes the security controls **as implemented** in PrepGenius,
plus **recommended** hardening for production. Items are marked
**[implemented]** or **[recommended]**.

---

## 1. Authentication & Passwords

- **Password hashing — bcrypt** **[implemented]**. Passwords are hashed with
  bcrypt (per-password salt, adaptive cost) and only the hash is stored in
  `users.password_hash`. Plaintext passwords are never logged or persisted.
- **Email verification** **[implemented]**. Signup sets `is_verified=false` and
  emails a signed, time-limited verification token via SMTP; sensitive flows can
  require a verified account.
- **Password reset** **[implemented]**. `/auth/forgot-password` issues a signed,
  short-lived reset token (emailed); `/auth/reset-password` consumes it. The same
  generic response is returned whether or not the email exists, to avoid account
  enumeration.
- **Google OAuth** **[implemented]**. Authorization-code flow; the callback links
  or creates the user. Validate the `state` parameter to prevent CSRF on the
  OAuth callback **[recommended]**.

---

## 2. JWT & Token Handling

- **HS256 signed tokens** **[implemented]** using `SECRET_KEY`. Access tokens are
  short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 30); refresh tokens are
  long-lived (`REFRESH_TOKEN_EXPIRE_DAYS`, default 14) and carry `type=refresh`
  so an access token cannot be used at `/auth/refresh` and vice-versa.
- **Refresh rotation** **[recommended]**. Issue a new refresh token on each
  refresh and invalidate the prior one (store a token id / `jti` denylist in
  Redis), so a stolen refresh token has a limited window.
- **Logout / revocation** **[recommended]**. Maintain a short-lived `jti`
  denylist in Redis for forced logout / compromised tokens.
- **Transport** **[recommended]**. Always serve tokens over HTTPS; if the SPA
  stores tokens, prefer in-memory + httpOnly refresh cookie over `localStorage`
  to reduce XSS exposure.
- **Rotate `SECRET_KEY`** **[recommended]** on suspected compromise (invalidates
  all tokens) and keep it strictly in secrets, never in code.

---

## 3. Authorization (RBAC)

- **Two roles** `user` / `admin` **[implemented]**, embedded in the JWT `role`
  claim and enforced by a `require_admin` dependency on `/api/v1/admin/*`
  (`403` for non-admins).
- **Ownership checks** **[implemented]**. User-scoped resources (attempts, chats,
  documents, API keys) are filtered by `user_id` so one user cannot read or
  mutate another's data. Verify ownership on every `{id}` route
  **[recommended as a standing review item]**.

---

## 4. API Keys

- **sha256-hashed at rest** **[implemented]**. The plaintext key is shown **once**
  at creation; only its sha256 hash is stored (`api_keys.key_hash`, unique). A
  short `prefix` is stored for display.
- **Scopes & expiry** **[implemented]**. Keys carry scopes (`mcq`/`chat`) and an
  optional `expires_at`; `/public/*` checks scope + expiry + `revoked` and meters
  usage per key.
- **Revocation** **[implemented]** via `DELETE /api-keys/{id}`.
- **Recommended**: rate-limit per key and alert on anomalous usage spikes.

---

## 5. Input Validation

- **Pydantic v2 schemas** **[implemented]** validate and coerce every request
  body, enforcing types, required fields, enums (e.g. `difficulty`,
  `test_type`), and bounds (e.g. MCQ `count`). Unknown/invalid input is rejected
  with `400` before reaching business logic.
- **Output schemas** **[implemented]** ensure responses never leak internal
  fields (e.g. `password_hash`, `key_hash`).

---

## 6. MongoDB Injection Safety

- **Parameterized queries via Motor** **[implemented]**. Queries are built from
  typed Python values, not string-concatenated; user input is never interpolated
  into query operators. Combined with Pydantic validation this neutralizes NoSQL
  injection.
- **[recommended]** Never pass raw client JSON straight into a query as operator
  keys; whitelist allowed filter fields (the API already exposes only fixed
  query params).

---

## 7. CORS & Headers

- **CORS allow-list** **[implemented]** via `BACKEND_CORS_ORIGINS` (no wildcard in
  production). Restrict methods/headers to what the frontend needs.
- **[recommended]** Add security headers at the proxy: HSTS, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`/CSP `frame-ancestors`, and a Content-Security-Policy
  for the frontend.

---

## 8. Payment Security

- **Secure-hash verification** **[implemented]**. JazzCash and Easypaisa requests
  are signed with the integrity salt / hash key, and **callbacks are verified by
  recomputing the secure hash** before any subscription is activated — so a
  forged callback cannot grant a paid plan.
- **Hosted checkout** **[implemented]**. Card/wallet entry happens on the
  provider's hosted page; PrepGenius never handles raw card data (reduces PCI
  scope).
- **[recommended]** Treat callbacks as idempotent (dedupe by `txn_ref`), verify
  the amount/plan match the initiated payment, and restrict callback endpoints to
  provider IP ranges where possible.

---

## 9. File-Upload Validation

- **[implemented]** Uploads are limited to `MAX_UPLOAD_MB`, restricted to
  PDF/DOCX/TXT by extension/MIME, and stored under `UPLOAD_DIR` with a generated
  (non-user-controlled) filename to prevent path traversal.
- **[recommended]** Scan uploads for malware, parse in the sandboxed worker
  (already offloaded to Celery), and store uploads on isolated object storage
  rather than the API host.

---

## 10. Rate Limiting

- **Per-user/per-key metering** **[implemented]** — free-plan daily quotas via the
  `usage` collection and per-API-key usage metering provide a baseline.
- **[recommended]** Add request-rate limiting with **slowapi backed by Redis**
  (per-IP and per-user) for auth endpoints (brute-force protection), MCQ/chat
  generation, and `/public/*`. Also enforce per-IP limits at the reverse proxy.

---

## 11. Secrets Management

- **Env-based config** **[implemented]**. All secrets (`SECRET_KEY`, SMTP, OAuth,
  payment salts, Qdrant key) come from `.env`, which is git-ignored; the repo
  ships only `.env.example` with placeholders.
- **[recommended]** In production use a secrets manager (Docker/K8s secrets,
  Vault, cloud secret store) and rotate credentials periodically.

---

## 12. Logging & Audit

- **System logs** **[implemented]** in `system_logs` (auth, ingestion, admin
  actions) for auditability and admin visibility.
- **[recommended]** Never log secrets/tokens/PII; centralize logs, and alert on
  repeated `401`/`403`, payment-verification failures, and quota abuse.

---

## 13. Production Hardening Checklist

- [ ] `SECRET_KEY` is a 64-char random value, unique per environment, stored in a secrets manager.
- [ ] HTTPS everywhere; HSTS enabled at the proxy.
- [ ] `BACKEND_CORS_ORIGINS` set to exact production origins (no `*`).
- [ ] Security headers (CSP, nosniff, frame-ancestors) added at the proxy.
- [ ] Refresh-token rotation + Redis `jti` denylist for logout/revocation.
- [ ] Rate limiting (slowapi + Redis) on auth, generation, and `/public/*`.
- [ ] MongoDB auth enabled; replica set; least-privilege app user; backups tested.
- [ ] Qdrant `QDRANT_API_KEY` set; storage persisted; snapshots scheduled.
- [ ] Redis password/ACL set; not exposed publicly.
- [ ] Payment callbacks verify secure hash + amount + idempotency by `txn_ref`.
- [ ] Upload size/type enforced; malware scanning; isolated storage.
- [ ] `ADMIN_PASSWORD` changed from the example; admin accounts MFA where possible.
- [ ] Dependencies pinned and scanned (e.g. `pip-audit`); base images patched.
- [ ] No secrets/PII in logs; centralized logging + alerting on auth/payment anomalies.
- [ ] `ENVIRONMENT=production` (disable verbose errors / interactive docs if not needed publicly).
