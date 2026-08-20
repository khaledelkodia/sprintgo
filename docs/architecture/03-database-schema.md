# 03 — Database Schema (Prisma)

> Status: Draft v0.1 • Last updated: 2026-07-29
> This file is the **reference draft**; the living schema is `apps/api/prisma/schema.prisma`. Any divergence is a bug in the docs — update both in the same PR.

## 1. Conventions

| Rule | Convention |
|------|-----------|
| IDs | `String @id @default(cuid())` — collision-safe, URL-safe, no sequence contention |
| Human refs | Separate short codes where humans talk about records (`Order.code` = `SG-2026-000123`) |
| Money | `Int` **piasters** (minor units). Never Float/Decimal for money |
| Time | `DateTime` (timestamptz). App timezone: `Africa/Cairo`; store UTC, format at edges |
| Naming | Prisma models `PascalCase` / fields `camelCase`; DB tables `snake_case` plural via `@@map`, columns via `@map` |
| Timestamps | `createdAt` + `updatedAt` on every mutable table |
| Soft delete | `deletedAt DateTime?` on catalog entities only (Store, Product, Address). Orders/audit are permanent |
| Deletes | FK `onDelete: Restrict` by default; `Cascade` only config-child tables (options under a product); order snapshots use `SetNull` |
| Text search | `pg_trgm` extension; trigram indexes on `Store.name`, `Product.name` (raw SQL migration) |

## 2. Schema (MVP — Phases 0–1)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────────────────────── Enums ─────────────────────────

enum Role {
  CUSTOMER
  MERCHANT
  COURIER      // Phase 2
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  BLOCKED
}

enum StoreStatus {
  PENDING      // awaiting admin approval
  ACTIVE
  SUSPENDED    // by admin
  CLOSED       // permanently, by owner
}

enum FlowType {
  DELIVERY     // catalog cart → order → deliver/pickup
  ERRAND       // مشوار — free-form fetch/deliver task, no catalog (ADR-010)
  BOOKING      // slot-based services (Phase 3)
}

enum FulfillmentType {
  DELIVERY
  PICKUP
}

enum OrderStatus {
  PLACED
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  COMPLETED
  CANCELLED
}

enum PaymentMethod {
  COD
  CARD         // Phase 2
  WALLET       // Phase 2
}

enum PaymentStatus {
  PENDING      // COD stays PENDING until DELIVERED → PAID
  PAID
  FAILED
  REFUNDED
}

enum OtpPurpose {
  LOGIN
}

enum AssignmentStatus {
  ASSIGNED
  PICKED_UP
  DELIVERED
  CANCELLED    // reassignment cancels the old row and creates a new one
}

enum FeePayer {
  RECIPIENT    // delivery fee collected at drop-off
  SENDER       // requesting store/customer pays the fee
}

enum DevicePlatform {
  WEB
  IOS
  ANDROID
}

// ─────────────────────── Identity ───────────────────────

model User {
  id           String     @id @default(cuid())
  phone        String     @unique                    // E.164: +2010XXXXXXXX
  name         String?                               // asked lazily at first order
  email        String?    @unique
  passwordHash String?                               // merchants/admins only; customers are OTP-only
  roles        Role[]     @default([CUSTOMER])
  status       UserStatus @default(ACTIVE)
  language     String     @default("ar")
  lastLoginAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  addresses      Address[]
  orders         Order[]
  stores         Store[]
  refreshTokens  RefreshToken[]
  notifications  Notification[]
  deviceTokens   DeviceToken[]
  reviews        Review[]
  courierProfile CourierProfile?
  deliveries     DeliveryAssignment[]

  @@map("users")
}

model OtpRequest {
  id         String     @id @default(cuid())
  phone      String
  codeHash   String                                  // sha256(code + pepper) — never the raw code
  purpose    OtpPurpose @default(LOGIN)
  attempts   Int        @default(0)                  // max 5, then invalidated
  expiresAt  DateTime                                // now + 5 min
  consumedAt DateTime?
  ip         String?
  createdAt  DateTime   @default(now())

  @@index([phone, createdAt])
  @@map("otp_requests")
}

model RefreshToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique                       // sha256 — raw token only in httpOnly cookie
  familyId   String                                  // rotation family; reuse detection revokes family
  deviceInfo String?
  ip         String?
  expiresAt  DateTime
  rotatedAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}

model DeviceToken {
  id         String         @id @default(cuid())
  userId     String
  token      String         @unique
  platform   DevicePlatform @default(WEB)
  createdAt  DateTime       @default(now())
  lastUsedAt DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("device_tokens")
}

// ──────────────────────── Catalog ────────────────────────

model ServiceType {
  id        String   @id @default(cuid())
  slug      String   @unique                          // "restaurants", "grocery", "pharmacy"
  nameAr    String
  nameEn    String
  icon      String                                    // icon key in the design system
  flowType  FlowType @default(DELIVERY)
  config    Json     @default("{}")                   // ServiceTypeConfig — Zod-validated (doc 07)
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stores Store[]
  orders Order[]

  @@map("service_types")
}

model Store {
  id                String      @id @default(cuid())
  serviceTypeId     String
  ownerId           String
  name              String
  slug              String      @unique
  description       String?
  logoUrl           String?
  coverUrl          String?
  contactPhone      String
  status            StoreStatus @default(PENDING)
  addressText       String                            // human-readable store location
  lat               Decimal?    @db.Decimal(10, 7)
  lng               Decimal?    @db.Decimal(10, 7)
  minOrderTotal     Int         @default(0)           // piasters
  prepTimeMins      Int         @default(20)
  isAcceptingOrders Boolean     @default(true)        // merchant's own on/off switch
  ratingAvg         Decimal     @default(0) @db.Decimal(3, 2)
  ratingCount       Int         @default(0)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?

  serviceType  ServiceType    @relation(fields: [serviceTypeId], references: [id])
  owner        User           @relation(fields: [ownerId], references: [id])
  workingHours WorkingHour[]
  zones        StoreZone[]
  categories   MenuCategory[]
  products     Product[]
  orders       Order[]
  reviews      Review[]

  @@index([serviceTypeId, status])
  @@index([ownerId])
  @@map("stores")
}

model WorkingHour {
  id        String @id @default(cuid())
  storeId   String
  dayOfWeek Int                                       // 0 = Sunday … 6 = Saturday
  opensAt   String                                    // "09:00" local (Africa/Cairo)
  closesAt  String                                    // "23:30"; split shifts = two rows

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([storeId, dayOfWeek, opensAt])
  @@map("working_hours")
}

model MenuCategory {
  id        String   @id @default(cuid())
  storeId   String
  name      String
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  store    Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  products Product[]

  @@index([storeId])
  @@map("menu_categories")
}

model Product {
  id          String    @id @default(cuid())
  storeId     String
  categoryId  String?
  name        String
  description String?
  imageUrl    String?
  price       Int                                     // piasters
  isAvailable Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  store        Store         @relation(fields: [storeId], references: [id])
  category     MenuCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  optionGroups OptionGroup[]
  orderItems   OrderItem[]

  @@index([storeId, isAvailable])
  @@map("products")
}

model OptionGroup {
  id        String @id @default(cuid())
  productId String
  name      String                                    // "الحجم", "إضافات"
  minSelect Int    @default(0)                        // 1 = required
  maxSelect Int    @default(1)                        // >1 = multi-select
  sortOrder Int    @default(0)

  product Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  options ProductOption[]

  @@map("option_groups")
}

model ProductOption {
  id          String  @id @default(cuid())
  groupId     String
  name        String                                  // "كبير", "جبنة إضافية"
  priceDelta  Int     @default(0)                     // piasters, can be 0
  isAvailable Boolean @default(true)
  sortOrder   Int     @default(0)

  group OptionGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@map("product_options")
}

// ────────────────────────── Geo ──────────────────────────

model Zone {
  id       String  @id @default(cuid())
  city     String                                     // "القاهرة"
  nameAr   String                                     // "المعادي"
  nameEn   String?
  isActive Boolean @default(true)

  storeZones    StoreZone[]
  addresses     Address[]
  orders        Order[]
  errandPickups ErrandDetail[]

  @@unique([city, nameAr])
  @@map("zones")
}

model StoreZone {
  id          String @id @default(cuid())
  storeId     String
  zoneId      String
  deliveryFee Int                                     // piasters
  etaMins     Int?                                    // added to store.prepTimeMins for total ETA

  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)
  zone  Zone  @relation(fields: [zoneId], references: [id])

  @@unique([storeId, zoneId])
  @@map("store_zones")
}

model Address {
  id           String    @id @default(cuid())
  userId       String
  zoneId       String
  label        String                                 // "البيت", "الشغل"
  street       String
  building     String?
  floor        String?
  apartment    String?
  landmark     String?                                // "جنب صيدلية العزبي" — gold for elderly UX
  contactPhone String?                                // defaults to user phone
  lat          Decimal?  @db.Decimal(10, 7)
  lng          Decimal?  @db.Decimal(10, 7)
  isDefault    Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  zone Zone @relation(fields: [zoneId], references: [id])

  @@index([userId])
  @@map("addresses")
}

// ──────────────────────── Ordering ───────────────────────

model Order {
  id               String          @id @default(cuid())
  code             String          @unique            // SG-2026-000123 (yearly PG sequence)
  customerId       String
  storeId          String?                            // null for customer errands (ADR-010)
  serviceTypeId    String
  zoneId           String?                            // null for pickup
  status           OrderStatus     @default(PLACED)
  fulfillmentType  FulfillmentType @default(DELIVERY)
  paymentMethod    PaymentMethod   @default(COD)
  paymentStatus    PaymentStatus   @default(PENDING)
  addressSnapshot  Json?                              // frozen copy at placement
  customerNotes    String?
  subtotal         Int                                // Σ line totals (piasters)
  deliveryFee      Int             @default(0)
  discount         Int             @default(0)
  total            Int                                // subtotal + deliveryFee − discount
  scheduledFor     DateTime?                          // null = ASAP
  estimatedReadyAt DateTime?
  placedAt         DateTime        @default(now())
  acceptedAt       DateTime?
  readyAt          DateTime?
  dispatchedAt     DateTime?
  deliveredAt      DateTime?
  completedAt      DateTime?
  cancelledAt      DateTime?
  cancelReason     String?
  cancelledByRole  Role?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  customer     User               @relation(fields: [customerId], references: [id])
  store        Store?             @relation(fields: [storeId], references: [id])
  serviceType  ServiceType        @relation(fields: [serviceTypeId], references: [id])
  zone         Zone?              @relation(fields: [zoneId], references: [id])
  items        OrderItem[]
  statusEvents OrderStatusEvent[]
  review       Review?
  errandDetail ErrandDetail?
  assignments  DeliveryAssignment[]

  @@index([storeId, status, placedAt])
  @@index([customerId, placedAt])
  @@map("orders")
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  productId    String?                                // reference only; truth is the snapshot
  name         String                                 // snapshot
  unitPrice    Int                                    // snapshot, piasters, incl. option deltas
  quantity     Int
  lineTotal    Int                                    // unitPrice × quantity
  options      Json    @default("[]")                 // [{ groupName, optionName, priceDelta }]
  notes        String?

  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@map("order_items")
}

model OrderStatusEvent {
  id         String       @id @default(cuid())
  orderId    String
  fromStatus OrderStatus?
  toStatus   OrderStatus
  actorId    String?                                  // plain field (no FK) — audit must outlive anything
  actorRole  Role?
  note       String?
  createdAt  DateTime     @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_status_events")
}

// ──────────────────────── Delivery ───────────────────────

model ErrandDetail {
  id              String   @id @default(cuid())
  orderId         String   @unique
  pickupText      String?                             // customer errands: "صيدلية العزبي — شارع ٩"
  pickupZoneId    String?
  instructions    String                              // "هات لي X" / "وصّل الشنطة دي"
  recipientName   String?                             // merchant requests: recipient is not a platform user
  recipientPhone  String?
  purchaseBudget  Int?                                // piasters; courier buys on behalf (customer errands)
  actualGoodsCost Int?                                // entered by courier at purchase
  codToCollect    Int      @default(0)                // goods value collected at drop-off
  feePaidBy       FeePayer @default(RECIPIENT)

  order      Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  pickupZone Zone? @relation(fields: [pickupZoneId], references: [id])

  @@map("errand_details")
}

model CourierProfile {
  id          String    @id @default(cuid())
  userId      String    @unique
  isAvailable Boolean   @default(false)
  lastSeenAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("courier_profiles")
}

model DeliveryAssignment {
  id           String           @id @default(cuid())
  orderId      String                                 // at most ONE active row per order (partial unique, §4)
  courierId    String
  assignedById String                                 // dispatcher — plain field, audit outlives accounts
  status       AssignmentStatus @default(ASSIGNED)
  assignedAt   DateTime         @default(now())
  pickedUpAt   DateTime?
  deliveredAt  DateTime?
  cancelledAt  DateTime?
  cancelReason String?

  order   Order @relation(fields: [orderId], references: [id])
  courier User  @relation(fields: [courierId], references: [id])

  @@index([orderId])
  @@index([courierId, status])
  @@map("delivery_assignments")
}

// ─────────────────────── Engagement ──────────────────────

model Review {
  id            String    @id @default(cuid())
  orderId       String    @unique                     // exactly one review per order
  customerId    String
  storeId       String
  rating        Int                                   // 1..5 — CHECK constraint in migration
  comment       String?
  merchantReply String?
  repliedAt     DateTime?
  isPublished   Boolean   @default(true)
  createdAt     DateTime  @default(now())

  order    Order @relation(fields: [orderId], references: [id])
  customer User  @relation(fields: [customerId], references: [id])
  store    Store @relation(fields: [storeId], references: [id])

  @@index([storeId, createdAt])
  @@map("reviews")
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String                                    // "order.status", "store.approved", ...
  title     String
  body      String
  data      Json?                                     // deep-link payload { orderId: ... }
  readAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@map("notifications")
}

// ─────────────────────── Platform ────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?                                  // plain field on purpose
  actorRole  Role?
  action     String                                   // "store.suspend", "auth.login", "order.cancel"
  entityType String?
  entityId   String?
  meta       Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId, createdAt])
  @@map("audit_logs")
}
```

## 3. Phase 2 models (designed, **not** migrated yet)

Kept out of the live schema so the MVP DB stays honest; adding them later is additive (no breaking migration).

```prisma
model Payment {
  id             String        @id @default(cuid())
  orderId        String        @unique
  method         PaymentMethod
  provider       String?                              // "paymob"
  providerRef    String?
  amount         Int
  status         PaymentStatus @default(PENDING)
  idempotencyKey String?       @unique
  payload        Json?                                // provider webhook echo
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  @@map("payments")
}

model Coupon {
  id             String   @id @default(cuid())
  code           String   @unique
  type           String                               // PERCENT | FIXED
  value          Int
  minOrderTotal  Int      @default(0)
  maxDiscount    Int?
  storeId        String?                              // null = platform-wide
  startsAt       DateTime
  endsAt         DateTime
  maxUses        Int?
  maxUsesPerUser Int      @default(1)
  usedCount      Int      @default(0)
  isActive       Boolean  @default(true)
  @@map("coupons")
}

```

## 4. Raw-SQL migration companions

Things Prisma can't express — shipped as SQL inside migrations:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_stores_name_trgm   ON stores   USING gin (name gin_trgm_ops);

ALTER TABLE reviews ADD CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE order_items ADD CONSTRAINT chk_qty_positive CHECK (quantity > 0);

CREATE SEQUENCE order_code_seq;  -- Order.code = 'SG-' || year || '-' || lpad(nextval,6,'0')

-- at most one ACTIVE courier per order; reassignment cancels the old row + inserts a new one
CREATE UNIQUE INDEX uq_active_assignment
  ON delivery_assignments(order_id) WHERE status IN ('ASSIGNED', 'PICKED_UP');
```

## 5. Query-pattern → index map

| Hot query | Served by |
|-----------|-----------|
| Store list per vertical+zone (home feed) | `stores(serviceTypeId, status)` + join `store_zones(storeId, zoneId)` unique |
| Merchant orders board | `orders(storeId, status, placedAt)` |
| Customer order history | `orders(customerId, placedAt)` |
| Order timeline | `order_status_events(orderId, createdAt)` |
| Search | trigram GIN indexes |
| Courier task list | `delivery_assignments(courierId, status)` |
| Dispatch queue (active orders w/o active assignment) | small status-filtered scan + partial index `uq_active_assignment` |
| Unread notifications badge | `notifications(userId, readAt)` |

## 6. Migration & seed policy

- **Never edit an applied migration.** Forward-only; `prisma migrate diff` in CI guards drift.
- Every migration is reviewed as SQL (generated file), not just schema diff.
- Seeds are idempotent (`upsert` by slug/phone) and layered: `seed:base` (zones, service types) → `seed:demo` (stores, products for dev/staging only).
- Backups: nightly `pg_dump` + WAL archiving for PITR (see [09-security](09-security.md)).

## 7. How this scales / future improvements

- The order write path touches ≤ 5 tables in one short transaction — comfortably thousands of orders/min on a single Postgres.
- Read-model pressure (home feed) is absorbed by Redis before any DB scaling is needed.
- Later: table partitioning on `orders(placedAt)` per year if volume demands; read replicas; `audit_logs` → cold storage after 12 months.
