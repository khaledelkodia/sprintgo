# SprintGo — Roadmap & Scope

> Status: Draft v0.1 • Last updated: 2026-07-29
> Related: [01-system-overview](architecture/01-system-overview.md), [07-service-extensibility](architecture/07-service-extensibility.md)

Guiding rule: **ship the smallest thing an elderly customer can order from and an elderly merchant can fulfill — perfectly — then widen.**

---

## Phase 0 — Foundation (Weeks 1–2)

Goal: a running skeleton where every later feature has an obvious home.

- Monorepo scaffold (pnpm + Turborepo): `apps/web`, `apps/api`, `packages/shared`, `packages/config`
- CI: lint, typecheck, test, build on every PR
- `packages/shared`: Zod contract package (schemas, enums, error codes, i18n status labels)
- Design system core in `apps/web`: tokens + `SgButton`, `SgInput`, `SgSheet`, `SgSkeleton`, `SgToast`, `SgPhoneInput`, `SgOtpInput`
- NestJS core: config, Prisma module, logging (pino), global exception filter, response envelope interceptor, throttler
- Auth: phone + OTP (mock SMS provider in dev), refresh rotation, cookies
- Seed script: demo zones, service types, stores, products

**Exit criteria:** a user can log in with OTP on a deployed dev environment; CI green.

## Phase 1 — MVP (Weeks 3–10)

Goal: real orders end-to-end in the launch verticals (Restaurants, Supermarket, Pharmacy, Fruits & Vegetables + Errand), COD, **platform-courier delivery** (ADR-009).

Customer:
- Browse verticals → stores by zone (open/closed, min order, fee, ETA)
- Store page: categories, products, option groups, quantity stepper
- Pharmacy: prescription photo at checkout (config-driven attachment step, doc 07)
- Errand (مشوار): instructions + pickup + drop-off + optional purchase budget, fee shown before confirming
- Local cart (Pinia, persisted) → checkout: default address + COD preselected → place order (server-priced)
- Live order status screen (Socket.io + polling fallback), reorder-in-one-tap
- Addresses CRUD with landmark field; rating after delivery

Merchant:
- Orders board: 3 columns (جديد / جاري التجهيز / جاهز) with one-tap transitions + repeating new-order sound
- "اطلب مندوب": delivery requests for the store's own phone orders (recipient + cash to collect)
- Product & category management (availability toggle is one tap)
- Working hours, "قفل المحل مؤقتًا" toggle; today stats

Courier (platform-employed):
- Availability toggle (متاح / مشغول); assignment alert with sound
- Task screen: pickup → drop-off → **cash to collect (huge)**; buttons "استلمت الطلب" / "تم التوصيل"
- Daily summary: deliveries + cash/fees to remit (ADR-011)

Admin / Dispatcher:
- Dispatch board: unassigned-orders queue → assign/reassign couriers; courier availability list
- Approve/suspend stores, manage users, zones, service types
- Orders oversight + audit log viewer

**Exit criteria:** the Playwright "order in ≤30s" e2e passes; an errand and a store delivery-request complete end-to-end; 20 pilot stores + 5 couriers onboarded.

## Phase 2 — Growth (Weeks 11–16)

- Online payments: Paymob (cards + Vodafone Cash) behind the existing `PaymentProvider` abstraction; refunds
- Coupons & promotions (`Coupon`, `CouponRedemption` models are pre-designed)
- Dispatch upgrades: auto-offer to nearest available courier, live GPS on tracking, recipient SMS tracking link
- Push notifications (web push + FCM), notification center
- Merchant analytics; admin dashboards; courier performance & cash reports

## Phase 3 — Ecosystem (Week 15+)

- Booking-flow verticals (home services: plumber, cleaning) via `FlowType.BOOKING` strategy
- English locale, dark theme
- Search upgrade (Meilisearch), loyalty program
- Native wrappers (Capacitor) if app-store presence is needed

---

## Explicitly OUT of MVP scope

| Item | Why deferred |
|------|--------------|
| Online payment | COD dominates the target market; gateway adds PCI/ops load. Abstraction ready. |
| Live GPS courier tracking | MVP shows honest status steps; GPS pings + map are Phase 2 polish. |
| Auto-dispatch | Manual dispatch board first — the owner runs ops hands-on; automation follows real patterns. |
| Multi-store cart | Orders are single-store (like Talabat/Uber Eats). Massive simplification. |
| Server-side cart | Client cart + server-authoritative pricing at submit is simpler and safe ([ADR-007](architecture/11-decisions-adr.md)). |
| Chat between parties | Phone call button instead — elderly users prefer calls. |
| Dark theme, EN locale | Launch focus: one perfect Arabic light theme. |

## Success metrics (NFR targets)

| Metric | Target |
|--------|--------|
| Order flow duration (returning user) | ≤ 30 s, ≤ 12 taps |
| LCP on mid-range Android / 4G | ≤ 2.5 s |
| API p95 latency | ≤ 300 ms |
| Merchant order acknowledgement | ≤ 60 s (sound loop until ack) |
| Order → courier assigned (dispatch SLA) | ≤ 5 min |
| Uptime (MVP) | ≥ 99.5 % |
| Accessibility | WCAG 2.1 AA on all customer flows |
