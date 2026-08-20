# SprintGo — سبرنت جو

Multi-vertical local commerce marketplace (Egypt). **The architecture documents in [`docs/`](docs/README.md) are the law of this repo** — read [`docs/README.md`](docs/README.md) first.

## Workspace

| Path | What |
|------|------|
| `apps/web` | Nuxt 4 — customer / merchant / courier / admin UIs (route groups) |
| `apps/api` | NestJS — REST `/api/v1` + realtime gateway |
| `packages/shared` | ⭐ The contract: Zod schemas, enums, error codes, transition maps, ar labels |
| `packages/config` | Shared tsconfig/tooling presets |
| `docs/` | Software Architecture Document (SAD) + ADRs |

## Quickstart

```bash
pnpm install
pnpm build                 # builds shared → api → web
pnpm db:migrate            # needs PostgreSQL (see apps/api/.env)
pnpm db:seed
pnpm dev                   # web on :3000, api on :4000 (web proxies /api → :4000)
```

Dev login: any valid Egyptian mobile (e.g. `01012345678`) — the OTP code is printed in the **api console** (mock SMS provider).

Useful pages: `/login`, `/dev/ui` (design-system playground).
