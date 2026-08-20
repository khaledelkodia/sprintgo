# 09 — Security

> Status: Draft v0.1 • Last updated: 2026-07-29
> Related: [05-auth-and-rbac](05-auth-and-rbac.md) • [04-api-contract](04-api-contract.md)
> Standing rule: security controls live in **shared layers** (guards, pipes, interceptors, filters) — feature code cannot forget them.

## 1. OWASP Top 10 mapping

| Risk | Control in SprintGo |
|------|--------------------|
| A01 Broken Access Control | Three-layer enforcement ([05 §4](05-auth-and-rbac.md)): JWT guard → roles guard → **ownership scoped inside every query** (`where: { ownerId: user.id }`). IDOR tests are part of the e2e suite (user A requests user B's order → 404) |
| A02 Cryptographic Failures | TLS everywhere (HSTS); passwords argon2id; OTP & refresh tokens stored as sha256 hashes; JWT secret ≥ 256-bit from env; no sensitive data in URLs or logs (pino redact paths: `phone`, `authorization`, `cookie`) |
| A03 Injection | Prisma parameterized queries only — raw SQL requires review + comment; Zod validates shape/type/bounds of every input; file names never user-controlled (server-generated keys) |
| A04 Insecure Design | This SAD: server-authoritative pricing, immutable snapshots, closed transition map, idempotent order creation |
| A05 Security Misconfiguration | helmet (CSP `default-src 'self'`, no inline script), single-origin deployment, boot-time env validation (fail fast), `/api/docs` disabled in prod, containers run non-root |
| A06 Vulnerable Components | Renovate weekly + `pnpm audit` in CI (fail on high); lockfile committed; minimal dependency policy (justify each new dep in PR) |
| A07 Auth Failures | OTP rate limits below; refresh rotation + family reuse detection; sessions revocable; admin 2FA; generic auth errors (no user enumeration — "لو الرقم صح هيوصلك كود") |
| A08 Integrity Failures | CI is the only path to prod; images pinned by digest; payment webhooks (P2) HMAC-verified + idempotent |
| A09 Logging Failures | Structured pino JSON with `requestId` + `userId`; `AuditLog` table for sensitive actions (§3); alerts on OTP-failure spikes and 5xx rates |
| A10 SSRF | No user-supplied URLs are fetched server-side (uploads are multipart, not URL-pull); outbound calls restricted to configured providers |

## 2. Rate limits (Redis-backed, `@nestjs/throttler` + custom guards)

| Surface | Limit | On breach |
|---------|-------|-----------|
| `POST /auth/otp/request` | 3 / phone / 10 min · 10 / IP / hour · 30 / phone / day | 429 + `Retry-After`; UI shows countdown |
| `POST /auth/otp/verify` | 5 attempts / OTP, then invalidated | New code required; 5 consecutive dead OTPs → phone cooldown 1 h |
| `POST /auth/login` (staff) | 5 / account / 15 min | Lockout + audit event |
| `POST /orders` | 5 / user / min · 30 / user / day | Blocks abuse; legit users never hit it |
| `POST /errands` · `/merchant/delivery-requests` | 5 / user / min · 20 / user / day | Same abuse posture as orders |
| Public catalog | 120 / IP / min | CDN/cache absorbs first |
| Global default | 60 / IP / min | Backstop |

4-digit OTP math (ADR-002): 5 guesses / 10,000 codes = 0.05 % per code, ~0.15 %/day ceiling with request limits — acceptable for a marketplace account, revisit if wallet balances ever exist.

## 3. Audit log — mandatory events

`auth.otp_request`, `auth.login`, `auth.login_failed`, `auth.token_reuse_detected`, `user.blocked`, `store.approved/suspended`, `order.cancelled` (any actor), `order.status_changed` (also in `OrderStatusEvent`), `product.price_changed` (old→new in `meta`), `admin.*` (every admin mutation), `config.service_type_changed`, `order.assigned` / `order.reassigned`, `courier.availability_changed`, `errand.goods_cost_entered`.

Written via a NestJS interceptor + explicit service calls; append-only (no update/delete API); queryable at `/admin/audit-logs`.

## 4. PII & data protection

| Data | Class | Handling |
|------|-------|----------|
| Phone | Identifier | Plaintext (operationally required), unique-indexed; masked in logs (`+2010****789`) & admin lists |
| Name, addresses, landmark | Personal | Shown only to the parties of an order + admins; excluded from analytics exports |
| Location (lat/lng) | Sensitive | Optional; never collected in background; courier pings (P2) TTL in Redis only |
| Order history | Financial | Permanent (legal/accounting); tied to tombstoned user on deletion |
| Recipient snapshot (errands) | Personal | Name/phone of non-user recipients: visible to the assigned courier only during the active assignment + admins; masked in lists after completion |
| OTP / tokens | Secret | Hash-only at rest; raw values only in transit + httpOnly cookies |

Deletion request: block account → anonymization job (name → null, phone → `del_<hash>` tombstone, addresses hard-deleted) while order rows survive with the tombstone id. Documented publicly in the privacy policy.

Backups: nightly encrypted `pg_dump` + WAL archiving (PITR ≤ 5 min RPO), stored in a separate account/region; restore drill quarterly.

## 5. Web platform hardening

- Cookies: `httpOnly; Secure; SameSite=Lax` (+ refresh cookie path-scoped to `/api/v1/auth`).
- CSRF: SameSite=Lax + Origin header check on mutations + no state-changing GET. (Token dance unnecessary at this posture; revisit if cross-site embedding ever needed.)
- XSS: Vue auto-escaping; `v-html` is lint-banned; CSP as backstop; user content (notes, reviews) rendered as text, length-capped, stripped of control chars.
- Uploads: magic-byte sniff, ≤ 5 MB, re-encoded via sharp (destroys polyglot payloads + EXIF GPS), served from storage origin with `Content-Disposition` safe defaults — never executed, never same-origin-scripted.
- Headers: HSTS (preload after stability), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, minimal `Permissions-Policy`.

## 6. Secrets & environments

- Secrets only via env (dev: `.env` git-ignored + `.env.example` committed; prod: host secret store). Boot-time Zod validation refuses missing/malformed secrets.
- Least privilege: DB app user has no DDL in prod (migrations run via a separate role); Redis password-protected, not exposed publicly.
- Key rotation runbook: JWT secret supports dual-key verification window during rotation.

## 7. Future improvements

- Redis `jti` denylist for instant access-token revocation.
- Device/session management screen ("الأجهزة المسجلة").
- Fraud heuristics for COD abuse (repeat no-show customers) — flag, never auto-block.
- Courier cash-ledger tables when daily derived summaries stop being enough (ADR-011 revisit trigger).
- Independent penetration test before Phase 2 payments go live (mandatory gate).
