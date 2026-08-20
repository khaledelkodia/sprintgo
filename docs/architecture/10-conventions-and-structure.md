# 10 — Conventions & Project Structure

> Status: Draft v0.1 • Last updated: 2026-07-29
> These conventions are enforced by tooling wherever possible (ESLint, Prettier, commitlint, CI greps) — humans review intent, machines review style.

## 1. Naming — one table to rule them all

| Thing | Convention | Example |
|-------|-----------|---------|
| DB tables / columns | `snake_case` plural / `snake_case` (via `@@map`/`@map`) | `order_items`, `unit_price` |
| Prisma models / fields | `PascalCase` / `camelCase` | `OrderItem.unitPrice` |
| API paths | plural kebab-case; transition verbs as sub-resources | `/service-types`, `/orders/:id/cancel` |
| JSON keys | `camelCase` | `deliveryFee` |
| Vue components | `PascalCase.vue`; design system prefixed `Sg` | `SgButton.vue`, `StoreCard.vue`* |
| Composables | `use` + domain | `useCart.ts`, `useOrderTracking.ts` |
| Pinia stores | `use` + noun + `Store` | `useCartStore` |
| NestJS files | kebab-case + role suffix | `orders.service.ts`, `otp.guard.ts` |
| Zod schemas | noun + `Schema` | `placeOrderSchema` |
| Constants/env | `UPPER_SNAKE`; env prefixed | `DATABASE_URL`, `NUXT_PUBLIC_API_BASE` |
| i18n keys | `feature.screen.element` | `checkout.confirm.cta` |
| Booleans | `is/has/can/should` prefix | `isAcceptingOrders` |
| Events (socket) | `entity:action` | `order:status` |
| Branches | `type/short-slug` | `feat/order-tracking`, `fix/otp-expiry` |
| Commits | Conventional Commits | `feat(orders): add reorder endpoint` |

\* Feature components carry no prefix; only design-system primitives get `Sg`.

## 2. Frontend structure (`apps/web`) — feature-first

```
apps/web/
├── app/
│   ├── assets/css/main.css          # @theme tokens (doc 08) — the only global CSS
│   ├── components/ui/               # Design system ONLY (Sg*). No feature knowledge
│   ├── composables/                 # Cross-feature: useApi, useAuth, useRealtime, useMoney
│   ├── features/                    # ⭐ Everything else lives in a feature
│   │   ├── auth/        {components/, composables/, stores/}
│   │   ├── catalog/     {components/, composables/, vertical-slots.ts}
│   │   ├── cart/        {components/, stores/cart.store.ts}
│   │   ├── orders/      {components/, composables/useOrderTracking.ts}
│   │   ├── addresses/
│   │   ├── errands/     {components/, composables/}
│   │   ├── merchant/    {board/, products/, delivery-requests/, settings/}
│   │   ├── courier/     {tasks/, summary/}
│   │   └── admin/       {stores/, users/, verticals/, dispatch/}
│   ├── layouts/                     # customer.vue, merchant.vue, courier.vue, admin.vue, bare.vue
│   ├── middleware/                  # auth.ts, role.ts (route-group guards)
│   ├── pages/
│   │   ├── (customer)/              # /, /s/[slug], /cart, /orders/[id], /addresses, /errand
│   │   ├── merchant/                # /merchant, /merchant/products, ...
│   │   ├── courier/                 # /courier (tasks), /courier/summary
│   │   └── admin/                   # includes /admin/dispatch
│   └── plugins/                     # api client (ofetch + envelope unwrap), socket
├── i18n/ar.json
├── nuxt.config.ts                   # routeRules: public catalog SSR+SWR cache, authed areas CSR
└── tests/  {components/, e2e/order-in-30s.spec.ts}
```

Feature rules: features may import `components/ui` and `composables/`, **never each other's internals** (cross-feature needs go through a composable's public API). Pages are thin — compose feature components, zero business logic. Files > 200 lines trigger a split discussion in review.

## 3. Backend structure (`apps/api`) — module = bounded context

```
apps/api/src/
├── main.ts                          # bootstrap: helmet, cookies, envelope interceptor, filter
├── app.module.ts
├── core/                            # Infrastructure (no business logic)
│   ├── config/        # zod-validated env
│   ├── prisma/        # PrismaService + transaction helper
│   ├── logger/        # pino + requestId middleware
│   ├── cache/         # Redis service
│   └── realtime/      # socket gateway + room auth (doc 06)
├── common/                          # Cross-cutting request machinery
│   ├── guards/        # jwt-auth, roles, throttler configs
│   ├── decorators/    # @Roles(), @CurrentUser(), @Idempotent()
│   ├── filters/       # global exception → error envelope (doc 04 §2)
│   ├── interceptors/  # response envelope, audit
│   └── pipes/         # zod-validation.pipe.ts
└── modules/
    ├── auth/          {auth.controller.ts, auth.service.ts, otp.service.ts, tokens.service.ts}
    ├── users/
    ├── catalog/       {catalog.controller.ts (public), merchant-catalog.controller.ts, *.repository.ts}
    ├── geo/           {zones, addresses}
    ├── orders/        {orders.controller.ts, merchant-orders.controller.ts, orders.service.ts,
    │                   pricing.service.ts, transitions.service.ts, strategies/ (doc 07), orders.repository.ts}
    ├── delivery/      {assignments.service.ts, couriers.service.ts, dispatch.controller.ts,
    │                   courier-tasks.controller.ts, delivery.repository.ts}
    ├── engagement/    {reviews, notifications}
    ├── admin/         # thin controllers delegating to domain services
    └── audit/
```

Layer rules (Clean Architecture, pragmatic cut):

- **Controller** = HTTP translation only (parse → service → return). No Prisma imports. ≤ ~80 lines.
- **Service** = business rules & transactions. Throws typed domain errors (mapped to the envelope by the filter).
- **Repository** = all Prisma access for its aggregate. Services never call `prisma.*` for another module's tables — they call that module's service.
- **`@sprintgo/shared`** = contract (schemas/enums/transition maps). Backend and frontend both import it; it imports neither.

## 4. Git & delivery workflow

- Trunk-based: short-lived branches → PR → squash-merge to `main`. `main` is always deployable.
- PR gates (CI): lint + typecheck + unit + integration (testcontainers Postgres) + e2e smoke + `pnpm audit` + the doc-07 grep rule + the 30-second-flow e2e.
- Migrations reviewed as SQL in the PR. Seeds updated in the same PR as schema changes.
- Releases: tagged, deployed via CI only; `.env.example` updated in the same PR as any new env var.

## 5. Testing strategy (pyramid)

| Level | Tooling | What we test |
|-------|---------|--------------|
| Unit (many) | Vitest / Jest | Pricing math, transition map, Zod schemas, composables, money/phone utils |
| Integration (some) | Jest + Testcontainers | Repositories & services against real Postgres; auth flows; IDOR attempts |
| E2E (few, sacred) | Playwright | ① order-in-30s customer flow ② full chain: accept→ready→assign→pickup→delivered ③ OTP login ④ errand + store delivery-request ⑤ admin approve store |
| A11y | axe in component tests | Every `Sg*` component + key pages |

Coverage target: meaningful paths > numbers; pricing/transitions/auth at ~100 %, UI glue untargeted.

## 6. Definition of Done (every PR)

- [ ] Follows this doc's structure & naming; no duplicated UI/logic (repeat = extract)
- [ ] Uses `Sg*` components / tokens — no raw hex, px sizes, or inline text strings (i18n keys only)
- [ ] Zod schema in `@sprintgo/shared` for any new input; `.strict()` applied
- [ ] AuthZ: role guard + ownership scoping present; IDOR test if new resource
- [ ] Errors surface as typed codes with Arabic user-safe messages
- [ ] Tests per pyramid; a11y pass for new UI; skeleton/empty/error states designed
- [ ] Docs updated (this SAD + ADR if architectural)

## 7. Future improvements

- Extract `packages/ui` if a second frontend app appears (structure already isolates `components/ui`).
- Nx-style module-boundary lint rules if the team grows beyond ~6 engineers.
