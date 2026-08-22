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

## Push notifications (Firebase)

Push is **off until a Firebase project is wired in**, and everything keeps working
without it — the apps still poll, the in-app notification centre still fills up.
Turning it on takes three pieces:

1. **Create a Firebase project** and add two Android apps to it, with these exact
   package names: `com.sprintgo.customer` and `com.sprintgo.courier`.
   Download each app's `google-services.json`.
2. **Give CI the files** — one repository secret per app, holding that app's JSON
   (raw or base64): `GOOGLE_SERVICES_JSON_CUSTOMER` and `GOOGLE_SERVICES_JSON_COURIER`.
   [`scripts/android-firebase.mjs`](scripts/android-firebase.mjs) applies it to the
   generated Android project on every APK build; without the secret it no-ops and
   the APK builds push-free.
3. **Give the API a service account** — in Firebase, *Project settings → Service
   accounts → Generate new private key*, then set `FCM_PROJECT_ID`,
   `FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY` (keep the `\n` escapes) in the API's
   environment.

The API logs `FCM enabled (project …)` at boot when all three are present, and
`FCM disabled — …` when they are not.

> One Firebase project covers both apps; each Android app still has its own
> `google-services.json`, which is why there are two secrets.
