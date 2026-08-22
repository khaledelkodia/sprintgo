# 11 — Architecture Decision Records (ADR)

> Append-only. New decisions get the next number; reversals get a *new* ADR that supersedes the old one (never edit history).
> Template at the bottom.

---

## ADR-001 — Monorepo (pnpm + Turborepo) with a shared contract package
**Status:** Accepted • 2026-07-29
**Context:** Frontend and backend must agree on schemas, enums, and status maps; duplicated definitions drift and violate the "never duplicate code" mandate.
**Decision:** One repo: `apps/web`, `apps/api`, `packages/shared` (Zod contract), `packages/config`. The contract package is dependency-free and imported by both apps.
**Consequences:** Atomic cross-stack changes in one PR; single CI; validation logic exists exactly once. Cost: contributors see the whole repo (acceptable — one team), and CI must stay fast (Turborepo caching).

## ADR-002 — Passwordless phone + 4-digit OTP for customers
**Status:** Accepted • 2026-07-29
**Context:** Target users include elderly, non-technical people. Passwords are the #1 drop-off and support burden; SMS OTP is universally understood in Egypt.
**Decision:** Customers authenticate only via phone + 4-digit OTP (5-min expiry, 5 attempts, hashed at rest, strict rate limits — [09 §2](09-security.md)). 90-day sliding sessions; login required only at checkout. Merchants add passwords; admins add 2FA.
**Consequences:** Zero-password UX; auto-registration collapses signup into login. Risks (SMS cost, SIM swap) accepted for a marketplace threat model; revisit code length if stored value/wallets appear. Alternatives rejected: email/password (hostile to target users), social login (weak coverage among elderly).

## ADR-003 — Cookie-based auth on a single origin (nginx fronting Nuxt + Nest)
**Status:** Accepted • 2026-07-29
**Context:** Tokens in localStorage are XSS-exfiltratable; cross-origin cookies invite CORS/CSRF complexity.
**Decision:** `httpOnly; Secure; SameSite=Lax` cookies; nginx serves web and proxies `/api` + `/socket.io` to Nest on one origin. Bearer support kept for future native apps.
**Consequences:** XSS cannot steal sessions; CSRF neutralized by SameSite + origin checks; sockets authenticate with the same cookie. Constraint: web and API share a domain (fine — we control deployment).

## ADR-004 — Verticals as data: `ServiceType` config + Strategy/Factory escape hatch
**Status:** Accepted • 2026-07-29
**Context:** Core requirement: add services with minimal code changes, for 10 years.
**Decision:** A vertical is a DB row with Zod-validated JSONB config driving generic backend pipeline + generic UI. Genuinely new flows implement `OrderFlowStrategy` (registered in a factory); genuinely new screens register lazy UI slots. Hard rule: no `slug ===` branching in shared code (CI-enforced). Details: [07-service-extensibility](07-service-extensibility.md).
**Consequences:** Pharmacy = an INSERT + optional one component. Booking services = one strategy class. Cost: config schema discipline; worth it — this *is* the product's moat.

## ADR-005 — MVP delivery is merchant self-delivery; platform couriers are Phase 2
**Status:** ~~Accepted~~ **Superseded by ADR-009** • 2026-07-29
**Context:** Local Egyptian shops already employ their own delivery staff; a courier marketplace (assignment, tracking, payouts) is a second product.
**Decision:** MVP: merchant taps "خرج للتوصيل". Schema (`DeliveryAssignment`) and status flow already accommodate couriers; the `OUT_FOR_DELIVERY → DELIVERED` leg simply gains a new actor later.
**Consequences:** Weeks saved; zero migration pain later. Risk: delivery quality varies by store — mitigated by ratings + admin oversight.

## ADR-006 — COD-first payments behind a `PaymentProvider` port
**Status:** Accepted • 2026-07-29
**Context:** COD dominates Egyptian e-commerce; gateways add integration, compliance, and refund ops.
**Decision:** Launch COD-only. `paymentMethod/paymentStatus` on orders from day one; `Payment` model + provider interface (Paymob first) pre-designed for Phase 2. Payment settles `PENDING → PAID` on delivery for COD.
**Consequences:** Faster launch, zero PCI surface; adding cards later touches checkout UI + one new module, not the order core. Gate: independent pentest before payments ship ([09 §7](09-security.md)).

## ADR-007 — Client-side cart, server-authoritative pricing with `PRICE_CHANGED` reconciliation
**Status:** Accepted • 2026-07-29
**Context:** Server-side carts add sessions, sync bugs, and latency to the sacred 30-second flow; but client-computed prices are a classic vulnerability.
**Decision:** Cart lives in Pinia (persisted locally). At `POST /orders` the server re-loads items, re-validates option rules, re-computes all totals, and compares with the display-only `clientTotal`; mismatch returns fresh totals for a friendly confirm sheet. Idempotency-Key makes retries safe.
**Consequences:** Zero cart infrastructure; tamper-proof money math; the only trade-off is a rare extra confirmation when prices changed mid-session — which is honest UX anyway.

## ADR-008 — Realtime is read-only hints; REST is the single write path
**Status:** Accepted • 2026-07-29
**Context:** Duplicating mutations across REST and sockets doubles the authorization surface and invites divergence on flaky networks.
**Decision:** Socket.io pushes minimal change notifications to rooms; clients refetch REST truth; polling fallback keeps behavior identical without sockets. Details: [06-realtime-events](06-realtime-events.md).
**Consequences:** One authz surface, trivially recoverable clients, effortless horizontal scaling (Redis adapter). Cost: an extra GET after events — negligible, and cacheable.

## ADR-009 — All delivery is platform-owned from day 1 (supersedes ADR-005)
**Status:** Accepted • 2026-07-29
**Context:** Owner decision: delivery fees are the platform's core revenue and quality lever — merchants must not run their own delivery ("التوصيل من عندي دايمًا علشان المكسب يكون ليا").
**Decision:** Courier role, `DeliveryAssignment` + `CourierProfile`, the courier task screen, and a **manual dispatch board** all ship in MVP. Couriers are onboarded by admins and log in via OTP. Merchant scope shrinks to accept/ready (+ pickup handover); the courier owns pickup → delivered. Assignment is a parallel track that never mutates order status; only the courier's physical pickup does.
**Consequences:** MVP grows ~2 weeks but the business model matches reality from day 1, and merchant UX gets even simpler. Manual dispatch is deliberate (the owner runs ops hands-on at launch); auto-offer to the nearest courier is the Phase 2 upgrade. GPS tracking deferred — honest status steps suffice at launch.

## ADR-010 — "مشوار" (Errand) as a first-class flow: `FlowType.ERRAND` + `ErrandDetail` satellite
**Status:** Accepted • 2026-07-29
**Context:** Owner wants Mrsool-style errands at launch: a customer asks a courier to fetch/deliver anything, and a store can request a courier for its own phone orders.
**Decision:** Errands reuse the `Order` aggregate (`storeId` becomes nullable) plus an `ErrandDetail` row (pickup text/zone, instructions, recipient snapshot, purchase budget, `codToCollect`, `feePaidBy`). `ErrandFlowStrategy` provides validation, per-zone fees from vertical config (fee fixed and shown at placement), and the shortened transition map `PLACED → OUT_FOR_DELIVERY → DELIVERED`. Merchant delivery requests are errand orders with `storeId` set (pickup = the store).
**Consequences:** One tracking screen, one dispatch board, one audit trail for every kind of delivery; the extensibility model (ADR-004) is proven in MVP by a genuinely different flow. Purchase-budget errands introduce courier cash-buying — capped by config (`maxPurchaseBudget`, default 2,000 EGP) and reconciled per ADR-011.

## ADR-011 — COD cash settlement: courier pays the merchant at pickup; platform fees remitted daily
**Status:** Accepted • 2026-07-29
**Context:** With platform couriers + COD, cash physically flows through couriers; MVP needs unambiguous rules without building a ledger system.
**Decision:** Catalog orders: the courier pays the store its `subtotal` in cash at pickup, collects `total` from the customer at drop-off, and remits the difference (= delivery fees) to the platform daily. Store delivery-requests: the courier collects `codToCollect` at drop-off and returns it to the store; the delivery fee is charged per `feePaidBy`. Customer purchase-errands: the courier buys within `purchaseBudget`, records `actualGoodsCost`, and collects goods cost + fee at drop-off. Daily per-courier summaries are **derived from order data** (`/courier/summary/today` + admin reports) — no ledger tables in MVP.
**Consequences:** Matches how Egyptian local delivery already operates, zero settlement infrastructure, and the admin sees per-courier cash exposure daily. Revisit triggers: courier count > ~15, cash disputes, or online payments (Phase 2) → introduce proper cash-ledger tables via a new ADR.

## ADR-012 — The customer surface is the phone app only; the web is staff-only
**Status:** Accepted • 2026-08-22
**Context:** Phase 4 added `apps/customer` (React + Capacitor APK) while `apps/web` (Nuxt) still carried a full parallel customer journey — home, store page, cart, checkout, errand, orders, tracking, addresses, account. Two codebases were shipping the same product, so every customer feature had to be written twice. In practice only one of them kept up: the نقل + trip-pin work (2026-08-21) landed in the app, and the web errand page had already fallen behind (it required a pre-saved address, with no map, no source shop, no vehicle). Owner decision: "شيل جزء العميل ويب لانه هيكون ابلكيشن فقط".
**Decision:** Delete the customer pages, layout, components and feature modules from `apps/web`; it keeps only the admin, merchant and courier boards plus the two logins and the notification centre. `/` becomes a staff landing that routes a signed-in staff member to their own board and tells customers ordering lives in the app. Customer-only UI primitives (store/product/order cards, cart bar, bottom nav, address card, order timeline, courier map) and the catalog/cart/orders/addresses/errands feature modules are removed — they live in `apps/customer` instead.
**Consequences:** One place to build a customer feature, and no more silent drift between two customer journeys. The API contract is untouched — the same endpoints now have exactly one customer client. Cost: no browser fallback for a customer who will not install the APK, and the web-only live courier map (`SgCourierMap` + Leaflet on the tracking screen) is gone until the app grows its own map. Revisit trigger: if a browser-based customer journey is needed again, host the built `apps/customer` bundle as a website rather than re-creating a second codebase — it is a plain Vite web app that Capacitor merely wraps.

## ADR-013 — The apps listen instead of asking: sockets replace polling
**Status:** Accepted • 2026-08-22
**Context:** The packaged apps could not open a socket at all — the gateway authenticated only from the `sg_at` cookie and ran with `cors: false`, while the apps hold a Bearer token and run from their own origin. So both apps polled: the courier asked for an offer every 2s for the whole shift (~14k requests per courier per day) and the customer's tracking screen asked twice every 3s. Owner: "مش عاوز اي polling ... علشان ميكونش ضغط علي السيرفر".
**Decision:** The gateway accepts a handshake token (`auth.token`, then `Authorization: Bearer`, then the cookie) and its CORS comes from the same policy as REST (`core/config/cors.ts`): the Capacitor origins always, plus anything in `CORS_ORIGINS`. REST gains `enableCors` from that same list, which is also what lets a packaged APK reach a hosted API at all. Both apps get a `realtime.ts` — one socket per app, joined order rooms restored after a reconnect — and every poll is replaced by an event plus a single REST read (ADR-008: the socket is the hint, REST is the truth). One read still happens on mount and on reconnect, so a missed event cannot leave a screen stale. The courier's GPS reading now serves twice: a REST heartbeat for nearest-courier ranking, and a `courier:ping` relayed to the order room so the customer's map moves without anyone polling. `order:assigned` also goes to the customer's own room, not just the order room. The staff dashboards keep a 60s (was 15s) refresh purely as a dropped-connection safety net.
**Consequences:** A courier on an 8-hour shift costs ~30 requests instead of ~14,000, and offers arrive instantly rather than up to 2s late. socket.io's own transport fallback (HTTP long-polling) covers networks that block WebSocket, so a hostile proxy degrades the transport rather than the feature. The cost is that realtime is now load-bearing: an outage that breaks sockets makes screens stale until the next mount or reconnect, where before polling would have papered over it — the reconnect refetch and the staff safety net are the mitigation. Revisit trigger: more than one API instance, which needs a Redis socket.io adapter before rooms work across processes.

---

## Template

```
## ADR-XXX — <title>
**Status:** Proposed | Accepted | Superseded by ADR-YYY • <date>
**Context:** <the forces at play — why a decision is needed>
**Decision:** <what we chose, concretely>
**Consequences:** <what becomes easier/harder; accepted risks; revisit triggers>
```
