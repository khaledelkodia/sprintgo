# 04 — API Contract (REST v1)

> Status: Draft v0.1 • Last updated: 2026-07-29
> All request/response body schemas live as Zod in `@sprintgo/shared` — that package **is** the machine-readable contract; this doc is the human-readable index. OpenAPI is generated from the NestJS decorators + Zod schemas and published at `/api/docs` (non-prod only).

## 1. Principles

| Principle | Rule |
|-----------|------|
| Base path | `/api/v1/...` — breaking changes ⇒ `/v2` (old version supported ≥ 6 months) |
| Resources | Plural kebab-case nouns: `/service-types`, `/orders/:id/cancel` (verbs only for state transitions) |
| JSON | `camelCase` keys. Money always integer piasters. Dates ISO-8601 UTC |
| Auth | `httpOnly` cookies for browsers (`sg_at` access / `sg_rt` refresh); `Authorization: Bearer` supported for future native apps |
| Language | `Accept-Language: ar` (default) — localizes `error.message` and system strings |
| Writes | REST only. Sockets never mutate ([06-realtime-events](06-realtime-events.md)) |
| Validation | Every body parsed by the shared Zod schema with `.strict()` — unknown keys are rejected (kills mass assignment) |

## 2. Response envelope

```jsonc
// success
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 57, "hasNext": true } } // meta on lists only

// failure — ALWAYS this shape, produced by the global exception filter
{ "success": false,
  "error": {
    "code": "PRICE_CHANGED",              // stable machine code from @sprintgo/shared
    "message": "اتغيرت أسعار بعض الأصناف، راجع طلبك",   // localized, safe to show the user as-is
    "details": [ { "path": "items.0", "issue": "..." } ]  // optional (validation issues, diffs)
  }
}
```

The UI never invents error text: `error.message` is written to be user-displayable — one more mechanism keeping copy consistent and elderly-friendly.

### Error codes (canonical set — extend in `@sprintgo/shared`, never inline)

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Zod parse failed (details included) |
| `AUTH_REQUIRED` | 401 | Missing/expired access token |
| `AUTH_INVALID_OTP` | 401 | Wrong code (attempts remaining in details) |
| `AUTH_OTP_EXPIRED` | 401 | Code expired — request a new one |
| `FORBIDDEN` | 403 | Role/ownership check failed |
| `NOT_FOUND` | 404 | Resource absent or soft-deleted |
| `IDEMPOTENCY_CONFLICT` | 409 | Same `Idempotency-Key`, different payload |
| `ORDER_INVALID_TRANSITION` | 409 | Move not allowed from current status |
| `STORE_CLOSED` | 422 | Store closed / not accepting orders |
| `PRODUCT_UNAVAILABLE` | 422 | An item became unavailable (details list them) |
| `MIN_ORDER_NOT_MET` | 422 | Subtotal below store minimum |
| `PRICE_CHANGED` | 409 | Server-computed totals differ from client display (fresh totals in details) |
| `RATE_LIMITED` | 429 | Throttled (`Retry-After` header) |
| `INTERNAL` | 500 | Unexpected — logged with `requestId`, generic message shown |

## 3. Cross-cutting mechanics

- **Pagination:** `?page=1&limit=20` (max 50) → `meta`. Merchant/admin boards may add filters (`?status=PLACED`).
- **Idempotency:** `POST /orders` requires an `Idempotency-Key` header (client UUID). Retried submits (flaky mobile networks, double-taps) return the original result — critical for the "big button" UX where users may tap twice.
- **Request ID:** every response carries `X-Request-Id`; logged end-to-end.
- **Rate limits:** see table in [09-security](09-security.md); `429` + `Retry-After`.

## 4. Endpoints

### 4.1 Auth (`/api/v1/auth`) — flows detailed in [05-auth-and-rbac](05-auth-and-rbac.md)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/otp/request` | public | `{ phone }` → sends OTP. Auto-registers phone on first login |
| POST | `/auth/otp/verify` | public | `{ phone, code }` → sets cookies, returns `{ user, isNewUser }` |
| POST | `/auth/login` | public | Merchant/admin: `{ phone, password }` (+ OTP step for admins) |
| POST | `/auth/refresh` | refresh cookie | Rotates the pair; reuse detection revokes the family |
| POST | `/auth/logout` | authed | Revokes current refresh token, clears cookies |
| GET | `/me` | authed | Profile + roles |
| PATCH | `/me` | authed | `{ name?, language? }` |

### 4.2 Public catalog (cacheable, SSR-friendly)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/service-types` | Active verticals for the home screen |
| GET | `/zones?city=` | Zone picker data |
| GET | `/stores?serviceType=&zoneId=&q=&page=` | Store cards: computed `isOpenNow`, `deliveryFee` + `etaMins` for the zone, rating, `minOrderTotal` |
| GET | `/stores/:slug` | Full store: categories → products → option groups (one request = one screen) |

### 4.3 Customer (`role: CUSTOMER`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/addresses` · PATCH/DELETE `/addresses/:id` | CRUD + `isDefault` handling |
| POST | `/orders` | Place catalog order (below) |
| POST | `/errands` | Place errand — مشوار (below) |
| GET | `/orders?page=` | Own orders, newest first |
| GET | `/orders/:id` | Detail + `statusEvents` timeline |
| POST | `/orders/:id/cancel` | Allowed only while `PLACED` |
| POST | `/orders/:id/review` | `{ rating, comment? }` once, after `DELIVERED` |

**Place order — the platform's most important request:**

```jsonc
// POST /api/v1/orders          headers: Idempotency-Key: <uuid>
{
  "storeId": "s_...",
  "fulfillmentType": "DELIVERY",
  "addressId": "a_...",                    // omitted for PICKUP
  "paymentMethod": "COD",
  "customerNotes": "من غير بصل",
  "items": [
    { "productId": "p_...", "quantity": 2,
      "optionIds": ["opt_large", "opt_extra_cheese"], "notes": null }
  ],
  "clientTotal": 18500                     // what the UI displayed — for drift detection ONLY
}
```

Server pipeline (each step ends in a typed error from §2): load & validate store open/accepting → validate items available + option rules (`minSelect`/`maxSelect`) → **re-price everything from the DB** → compare with `clientTotal` (mismatch ⇒ `PRICE_CHANGED` + fresh totals; UI shows a friendly "الأسعار اتحدثت" sheet) → snapshot items + address → create order + `OrderStatusEvent` in one transaction → emit socket event + notification. The client **never** sends prices — `clientTotal` is a checksum, not an input.

**Place errand (مشوار):**

```jsonc
// POST /api/v1/errands        headers: Idempotency-Key: <uuid>
{
  "instructions": "عايز علبة بانادول اكسترا من أي صيدلية قريبة",
  "pickupText": "صيدلية العزبي — شارع ٩",          // optional free text
  "pickupZoneId": "z_maadi",
  "dropoff": { "addressId": "a_..." },              // or manual: { zoneId, street, building, recipientName, recipientPhone }
  "purchaseBudget": 15000                           // optional, piasters — courier buys on behalf (capped by vertical config)
}
```

The fee comes from the errand vertical's config (per-zone, [07 §2](07-service-extensibility.md)) and is **shown before confirming and fixed at placement**. The courier later enters `actualGoodsCost` at purchase; `codToCollect` = actual goods + (fee if `RECIPIENT` pays). Same envelope, same `GET /orders/:id` tracking screen as any order (response includes `errandDetail` + active assignment).

### 4.4 Merchant (`/api/v1/merchant`, `role: MERCHANT` + store ownership guard)

| Method | Path | Description |
|--------|------|-------------|
| GET / PATCH | `/merchant/store` | Own store; PATCH whitelists: description, logo, prepTimeMins, `isAcceptingOrders`, contactPhone |
| PUT | `/merchant/store/working-hours` | Replace full weekly schedule |
| PUT | `/merchant/store/zones` | Served zones + fees |
| GET/POST/PATCH/DELETE | `/merchant/categories(/:id)` | Menu sections |
| GET/POST/PATCH/DELETE | `/merchant/products(/:id)` | Products; `PATCH { isAvailable }` is the one-tap sold-out toggle |
| PUT | `/merchant/products/:id/option-groups` | Replace product's option config |
| GET | `/merchant/orders?status=&page=` | Board data |
| POST | `/merchant/orders/:id/accept` | → PREPARING; body `{ estimatedReadyMins? }` |
| POST | `/merchant/orders/:id/reject` | → CANCELLED; `{ reason }` required |
| POST | `/merchant/orders/:id/ready` | → READY |
| POST | `/merchant/orders/:id/handover` | Pickup orders only: READY → COMPLETED when the customer collects |
| POST | `/merchant/delivery-requests` | "اطلب مندوب": creates an ERRAND order from the store — `{ recipientName, recipientPhone, dropoff, codToCollect, feePaidBy }` |
| GET | `/merchant/stats/today` | `{ ordersCount, revenue, avgPrepMins }` |

Transitions are separate verbs (not `PATCH {status}`) so each maps to exactly one big button in the UI and one guard on the server.

### 4.5 Courier (`/api/v1/courier`, `role: COURIER`)

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/courier/availability` | `{ isAvailable }` — the متاح/مشغول toggle |
| GET | `/courier/tasks?status=` | Assigned orders: pickup point, drop-off, **cash to collect** |
| POST | `/courier/tasks/:orderId/pickup` | → OUT_FOR_DELIVERY (guard: own active assignment) |
| POST | `/courier/tasks/:orderId/goods-cost` | Purchase errands: `{ actualGoodsCost }` before drop-off |
| POST | `/courier/tasks/:orderId/delivered` | → DELIVERED; `{ cashCollected }` for reconciliation (ADR-011) |
| GET | `/courier/summary/today` | Deliveries count + cash held + fees to remit |

### 4.6 Admin (`/api/v1/admin`, `role: ADMIN|SUPER_ADMIN`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users?role=&q=&page=` · PATCH `/admin/users/:id/status` | Block/unblock |
| GET | `/admin/stores?status=` · POST `/admin/stores/:id/approve` · `/suspend` | Store lifecycle |
| POST | `/admin/stores` | Create store + owner account (assisted onboarding — admins onboard non-technical merchants) |
| CRUD | `/admin/service-types(/:id)` | Verticals + their `config` |
| CRUD | `/admin/zones(/:id)` | Coverage areas |
| GET | `/admin/orders?storeId=&status=&from=&to=` | Oversight; POST `/admin/orders/:id/cancel` |
| GET | `/admin/dispatch/queue` | Active orders needing a courier (errands PLACED / catalog PREPARING+READY without active assignment) |
| GET | `/admin/couriers?available=` | Couriers + availability + current load |
| POST | `/admin/couriers` | Create courier account (OTP login, no password) |
| POST | `/admin/orders/:id/assign` | `{ courierId }` → creates assignment + notifies courier |
| POST | `/admin/orders/:id/reassign` | `{ courierId, reason }` — cancels active assignment, creates a new one |
| GET | `/admin/audit-logs?entityType=&entityId=&actorId=` | Audit viewer |

### 4.7 Uploads

| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads/images` | Multipart; scope-checked (merchant → own store assets). Server re-encodes via sharp (WebP variants, EXIF stripped), returns `{ url }`. Max 5 MB, images only (magic-byte sniffed) |

## 5. Versioning & deprecation policy

- Additive changes (new optional fields/endpoints) do **not** bump the version.
- Breaking changes ship as `/v2` alongside `/v1`; deprecation header `Sunset` + 6-month window.
- `@sprintgo/shared` versions follow the API: schema changes land in the same PR as the endpoint change — impossible to forget, because the API code imports the schema it validates with.

## 6. Future improvements

- Payment webhooks (`POST /webhooks/paymob`, HMAC-verified, idempotent) — Phase 2.
- Cursor pagination for infinite feeds if store counts grow beyond page/limit comfort.
- ETag/If-None-Match on `/stores/:slug` for near-free catalog refreshes.
