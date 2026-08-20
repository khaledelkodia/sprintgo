# 06 — Realtime Events (Socket.io)

> Status: Draft v0.1 • Last updated: 2026-07-29
> Related: [02 §4 order lifecycle](02-domain-model-and-erd.md) • [04-api-contract](04-api-contract.md)

## 1. Philosophy — sockets are hints, REST is truth

**All mutations happen over REST.** Socket.io only *pushes minimal notifications* that something changed; clients respond by refetching the REST resource (or applying the tiny payload optimistically, then reconciling). Consequences:

- A dropped/reconnected socket can never corrupt state — worst case is a delayed UI.
- Every client behaves identically with sockets ON or OFF (polling fallback), which is essential on weak Egyptian mobile networks.
- Authorization exists in exactly one place (REST guards) instead of two.

## 2. Topology

Single namespace `/rt`, room-based fan-out. Handshake authenticates via the same `sg_at` cookie (single origin makes this free); a guard maps the user to the rooms they may join.

| Room | Joined by | Purpose |
|------|-----------|---------|
| `user:{userId}` | that user (auto on connect) | Order status, notifications badge |
| `store:{storeId}` | store owner (verified) | New-order alerts, board refresh |
| `order:{orderId}` | order's customer / store owner / assigned courier / admin | Live tracking screen |
| `courier:{userId}` | that courier | Assignment alerts + reassignment/cancellation |
| `admin` | admins | Ops dashboard counters |

Scaling: `@socket.io/redis-adapter` from day one (config, not code), so adding API instances never breaks fan-out. No state in socket memory.

## 3. Event contract

Server → client (payloads are Zod schemas in `@sprintgo/shared/realtime`):

| Event | Rooms | Payload | Client reaction |
|-------|-------|---------|-----------------|
| `order:new` | `store:{id}` · errands also `admin` (dispatch queue) | `{ orderId, code, total, itemsCount, placedAt }` | Prepend card + **repeating sound until acknowledged** |
| `order:assigned` | `courier:{id}`, `store:{id}`, `order:{id}` | `{ orderId, courierName }` | Courier: sound until opened; tracking shows "تم تعيين مندوب" |
| `order:status` | `user:{id}`, `order:{id}` | `{ orderId, status, at }` | Update timeline; refetch detail |
| `order:cancelled` | both sides | `{ orderId, byRole, reason? }` | Show sheet + refetch |
| `store:availability` | `store:{id}` | `{ isAcceptingOrders }` | Sync toggle across merchant devices |
| `notification:new` | `user:{id}` | `{ id, title, body, data }` | Badge + toast |
| `admin:stats` | `admin` | `{ activeOrders, todayOrders }` | Dashboard tick |

Client → server — **only** room management: `join(room)` / `leave(room)` with server-side authorization on every join. No business events flow upward.

## 4. Reliability rules

| Concern | Rule |
|---------|------|
| Reconnect | On `connect`, client refetches active resources (merchant board / tracked order). Socket.io retries with backoff automatically |
| Polling fallback | Tracking screen polls `GET /orders/:id` every 20 s whenever the socket is not connected; merchant board every 30 s. Users never see a difference |
| Merchant ack | `order:new` sound loops until the merchant opens the order. If still `PLACED` after 10 min → SMS to merchant; 15 min → auto-cancel + apologize to customer (system transition, [02 §4](02-domain-model-and-erd.md)) |
| Dispatch ack | Assignment sound loops on the courier device until opened; any active order unassigned > 5 min turns red on the dispatch board |
| Ordering/dedup | Payloads carry `at`; clients ignore stale events (status monotonicity from the shared transition map) |
| Versioning | Event names are stable; payloads only grow additively. Breaking change ⇒ new event name |

## 5. Future improvements

- Courier GPS pings (Phase 2): Redis-only with TTL, throttled to 1 ping / 5 s, relayed to `order:{id}`.
- If push-notification delivery guarantees harden, add an outbox table drained by a worker — same event names, better durability.
