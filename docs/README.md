# SprintGo — Software Architecture Document (SAD)

> **Status:** Draft v0.1 — awaiting stakeholder approval
> **Last updated:** 2026-07-29
> **Rule:** No production code is written unless it complies with these documents. Changes to architecture require updating the relevant doc + an ADR entry ([11-decisions-adr.md](architecture/11-decisions-adr.md)).

SprintGo is a **multi-vertical local commerce marketplace** for the Egyptian market: customers order from nearby stores (restaurants, groceries, pharmacies, …) and merchants manage incoming orders — with an experience simple enough for **users with zero technical experience, including elderly users**.

The platform is designed as an **ecosystem**: new service verticals plug in through configuration + small strategy classes, not rewrites.

---

## الملخص التنفيذي (Arabic Executive Summary)

**إيه المشروع؟**
منصة "سبرنت جو": سوق خدمات محلي متعدد الأقسام. العميل يفتح الموقع، يختار محل قريب منه، يضيف المنتجات، ويطلب في أقل من ٣٠ ثانية. صاحب المحل يستقبل الطلب على لوحة بسيطة جدًا بزرار كبير واحد: "ابدأ التجهيز".

**أهم القرارات المعمارية (مشروحة بالتفصيل في الوثائق):**

1. **الدخول برقم الموبايل + كود OTP فقط** — بدون باسورد للعملاء نهائيًا. أسهل طريقة لكبار السن، والجلسة تفضل شغالة شهور فمش هيحتاج يسجل دخول كل مرة.
2. **الدفع كاش عند الاستلام (COD) في الإطلاق** — مع طبقة تجريد جاهزة لإضافة الدفع الإلكتروني (Paymob / محافظ) في المرحلة الثانية بدون تعديل في نظام الطلبات.
3. **التوصيل كله بمناديب المنصة من اليوم الأول** — رسوم التوصيل ربح مباشر للمنصة. فيه لوحة توزيع (Dispatch) يوزّع منها المشغّل الطلبات على المناديب، وشاشة مندوب بأزرار كبيرة: "استلمت الطلب" و"تم التوصيل".
4. **أقسام الإطلاق: مطاعم، سوبر ماركت، صيدلية (بصورة الروشتة)، خضار وفاكهة + قسم "مشوار"** (اطلب أي حاجة من أي مكان، أو المحل نفسه يطلب مندوب يوصّل طلباته). الأقسام كلها مجرد بيانات + إعدادات — إضافة قسم جديد = صف في قاعدة البيانات، مش إعادة برمجة. دي أهم نقطة في المعمارية كلها.
5. **عربي أولًا (RTL)** بخط كبير وواجهة بأزرار ضخمة، مع دعم الإنجليزية لاحقًا.
6. **السعر النهائي يُحسب على السيرفر دائمًا** — العميل لا يرسل أسعارًا أبدًا (أمان + دقة).
7. **Monorepo واحد** فيه الواجهة والسيرفر وحزمة "العقد المشترك" (Zod schemas) — نفس قواعد التحقق تشتغل في الواجهة والسيرفر من مصدر واحد، فمفيش تكرار كود نهائيًا.

**المطلوب منك تأكيده قبل بدء التنفيذ:** راجع قسم [Pending decisions](#pending-decisions--قرارات-محتاجة-تأكيدك) تحت.

---

## Document map

| # | Document | What it answers |
|---|----------|-----------------|
| — | [ROADMAP.md](ROADMAP.md) | Phases, MVP scope, what is explicitly out of scope |
| 01 | [System Overview](architecture/01-system-overview.md) | Actors, high-level architecture, tech stack rationale, monorepo layout, NFRs |
| 02 | [Domain Model & ERD](architecture/02-domain-model-and-erd.md) | Entities, relationships, order state machine |
| 03 | [Database Schema](architecture/03-database-schema.md) | Full Prisma schema, conventions, indexing, migration policy |
| 04 | [API Contract](architecture/04-api-contract.md) | REST v1 endpoints, response envelope, error codes, pagination, idempotency |
| 05 | [Auth & RBAC](architecture/05-auth-and-rbac.md) | OTP flow, token rotation, roles, permission matrix, ownership rules |
| 06 | [Realtime Events](architecture/06-realtime-events.md) | Socket.io namespaces, rooms, event contract, fallback strategy |
| 07 | [Service Extensibility](architecture/07-service-extensibility.md) | How a new vertical is added with near-zero code changes |
| 08 | [Design System](architecture/08-design-system.md) | Tokens, component inventory, elderly-first UX rules, the 30-second flow |
| 09 | [Security](architecture/09-security.md) | OWASP Top 10 mapping, rate limits, audit, PII handling |
| 10 | [Conventions & Structure](architecture/10-conventions-and-structure.md) | Naming everywhere, folder trees, git flow, testing, Definition of Done |
| 11 | [Architecture Decision Records](architecture/11-decisions-adr.md) | Why each major decision was made, alternatives considered |

**Reading order for a new engineer:** 01 → 02 → 10 → (their area).
**Reading order for review/approval:** this page → ROADMAP → 08 (Design System) → 02.

---

## Confirmed decisions — القرارات المعتمدة (2026-07-29)

Resolved with the owner and recorded as ADRs. Changing any of these now requires a superseding ADR.

| # | Decision (final) | Notes | Where documented |
|---|------------------|-------|------------------|
| D1 | Launch verticals: **Restaurants, Supermarket, Pharmacy (prescription photo), Fruits & Vegetables + "مشوار" (Errand)** | Errand = customer asks a courier to fetch anything, or a store requests delivery for its own (phone) orders | [ROADMAP](ROADMAP.md) • [ADR-010](architecture/11-decisions-adr.md) |
| D2 | **All delivery by platform couriers from day 1** — delivery fees are platform revenue; manual dispatch board in MVP | Merchant self-delivery rejected by owner; cash settlement in ADR-011 | [ADR-009](architecture/11-decisions-adr.md) |
| D3 | **COD only** at launch; Paymob/wallets Phase 2 | — | [ADR-006](architecture/11-decisions-adr.md) |
| D4 | **4-digit OTP** with strict rate limits | — | [ADR-002](architecture/11-decisions-adr.md) |
| D5 | **Arabic-only UI, light theme** at launch | EN + dark are token/i18n swaps later | [08-design-system](architecture/08-design-system.md) |

---

## Glossary — قاموس المصطلحات

| Term | Arabic | Meaning in SprintGo |
|------|--------|---------------------|
| Service type / Vertical | قسم الخدمة | A category of stores (restaurants, grocery, pharmacy). Data-driven, pluggable. |
| Store | المحل / المتجر | A merchant-owned shop inside one vertical |
| Merchant | التاجر / صاحب المحل | The store owner user |
| Product | المنتج / الصنف | An item sold by a store; may have option groups |
| Option group | مجموعة إضافات | e.g. "الحجم" (required, pick 1), "إضافات" (optional, pick many) |
| Order | الطلب | The core aggregate; immutable snapshots of items & address |
| Zone | منطقة التوصيل | Delivery area; each store serves specific zones with a fee |
| Courier | مندوب التوصيل | Platform delivery agent (MVP) — all delivery is platform-owned |
| Errand | مشوار | Non-catalog order: fetch/deliver anything; customer- or merchant-initiated |
| Dispatcher | موزّع الطلبات | Ops person (admin panel) assigning orders to couriers |
| COD | الدفع عند الاستلام | Cash on delivery |
| Piaster (minor unit) | قرش | All money is stored as integer piasters. 100 قرش = 1 جنيه |

---

## How these documents are governed

1. Docs live with the code and are versioned together.
2. Any architectural change = PR that updates the doc **and** appends an ADR. No silent drift.
3. Each doc states **why the approach was chosen, how it scales, and future improvements** — this is a standing requirement for all technical writing in this repo.
4. The docs are written in English (long-term maintainability with any future team); user-facing copy and UX writing are Arabic-first.
