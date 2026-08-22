# SprintGo — سبرنت جو

Multi-vertical local commerce marketplace (Egypt). **The architecture documents in [`docs/`](docs/README.md) are the law of this repo** — read [`docs/README.md`](docs/README.md) first.

## Workspace

| Path | What |
|------|------|
| `apps/customer` | React + Capacitor — **the customer app** (Android APK). The only place customers order from. |
| `apps/courier` | React + Capacitor — the courier (كابتن) app |
| `apps/web` | Nuxt 4 — the **staff** surface: admin, merchant and courier boards |
| `apps/api` | NestJS — REST `/api/v1` + realtime gateway |
| `packages/shared` | ⭐ The contract: Zod schemas, enums, error codes, transition maps, ar labels |
| `packages/config` | Shared tsconfig/tooling presets |
| `docs/` | Software Architecture Document (SAD) + ADRs |

> Customers order **only** from `apps/customer` — the web has no customer pages
> ([ADR-012](docs/architecture/11-decisions-adr.md)). Build a customer feature once, in the app.

## Quickstart

```bash
pnpm install
pnpm build                 # builds shared → api → web/apps
pnpm db:migrate            # needs PostgreSQL (see apps/api/.env)
pnpm db:seed
pnpm dev                   # web on :3000, api on :4000 (web proxies /api → :4000)
```

The customer and courier apps run on their own ports:

```bash
pnpm --filter @sprintgo/customer dev   # :5175
pnpm --filter @sprintgo/courier dev    # :5176
```

Dev login: any valid Egyptian mobile (e.g. `01012345678`). The OTP is printed in the **api console** (mock SMS provider) and, in development, returned as `devCode` on the OTP request.

Useful pages: `/` (staff landing), `/staff-login` (admin + merchant), `/login` (courier OTP), `/dev/ui` (design-system playground).
