# 07 — Service Extensibility (adding a vertical with near-zero code)

> Status: Draft v0.1 • Last updated: 2026-07-29
> This document is the contract behind the core promise: **"new services must be added with minimal code changes."**

## 1. The model

A vertical (`ServiceType`) is a **database row + validated config**, interpreted by three pluggable layers:

```
ServiceType row ──┬─► config (JSONB, Zod-validated)  → behavior switches, no code
                  ├─► OrderFlowStrategy (backend)    → code ONLY for genuinely new flows
                  └─► UI slot registry (frontend)    → code ONLY for genuinely new screens
```

Most verticals need **only the row**. Strategy/UI code is the escape hatch, not the norm.

## 2. `ServiceTypeConfig` (Zod schema in `@sprintgo/shared`)

```ts
export const serviceTypeConfigSchema = z.object({
  ordering: z.object({
    fulfillment: z.array(z.enum(['DELIVERY', 'PICKUP'])).min(1).default(['DELIVERY']),
    allowScheduling: z.boolean().default(false),       // "اطلب لوقت لاحق"
    allowItemNotes: z.boolean().default(true),
    requiresAttachment: z.object({                     // pharmacy prescription
      enabled: z.boolean().default(false),
      labelAr: z.string().optional(),                  // "صورة الروشتة"
    }).default({ enabled: false }),
  }),
  catalog: z.object({
    hasOptionGroups: z.boolean().default(true),        // restaurants yes, grocery/خضار mostly no
    layout: z.enum(['grid', 'list']).default('list'),  // grocery/خضار grid, restaurants list
    showCalories: z.boolean().default(false),
  }),
  errand: z.object({                                   // ERRAND-flow verticals only (مشوار)
    baseFee: z.number().int().positive(),              // piasters
    zoneFees: z.record(z.string(), z.number().int()).default({}), // zoneId → fee override
    maxPurchaseBudget: z.number().int().default(200_000),         // 2,000 EGP cap (ADR-010)
  }).optional(),
  ui: z.object({
    icon: z.string(),                                  // design-system icon key
    accentToken: z.string().optional(),                // optional per-vertical accent (from token palette only)
  }),
}).strict();
```

Config is validated on every admin write **and** on boot (seeds) — an invalid vertical cannot enter the system.

## 3. Backend: Strategy + Factory

```ts
// ordering/strategies/order-flow.strategy.ts
export interface OrderFlowStrategy {
  /** extra validation beyond the generic pipeline (e.g. prescription attached?) */
  validate(ctx: PlaceOrderContext): Promise<void>;
  /** price adjustments beyond items+fees (weight-based pricing, service charges) */
  price(ctx: PricedCart): Promise<PricedCart>;
  /** allowed status transitions for this flow (defaults to shared DELIVERY map) */
  transitions(): TransitionMap;
}

// ordering/strategies/order-flow.factory.ts
@Injectable()
export class OrderFlowFactory {
  private readonly registry = new Map<FlowType, OrderFlowStrategy>();
  constructor(delivery: DeliveryFlowStrategy, errand: ErrandFlowStrategy /*, booking: BookingFlowStrategy (P3) */) {
    this.registry.set(FlowType.DELIVERY, delivery);
    this.registry.set(FlowType.ERRAND, errand);
  }
  forServiceType(st: ServiceType): OrderFlowStrategy {
    const s = this.registry.get(st.flowType);
    if (!s) throw new UnsupportedFlowError(st.flowType);
    return s;
  }
}
```

`OrdersService.placeOrder()` is generic and closed for modification (OCP): it runs the shared pipeline and delegates the variable 20 % to the strategy. `ErrandFlowStrategy` (**مشوار — ships in MVP**) is the living proof: no catalog validation, per-zone fees from config, a recipient snapshot instead of a cart, and its own transition map (`PLACED → OUT_FOR_DELIVERY → DELIVERED`) — with zero changes to the generic pipeline. `BookingFlowStrategy` (Phase 3) registers the same way.

## 4. Frontend: config-driven UI + slot registry

The generic vertical experience (store list → store page → cart → checkout → tracking) reads `serviceType.config` and adapts: `layout: 'grid' | 'list'`, scheduling picker on/off, attachment step on/off. For the rare vertical needing truly custom UI:

```ts
// app/features/catalog/vertical-slots.ts
// Maps serviceType.slug → async components for named slots. Missing slug = generic UI.
export const verticalSlots: Record<string, Partial<VerticalSlots>> = {
  pharmacy: {
    checkoutExtra: () => import('~/features/pharmacy/PrescriptionUpload.vue'),
  },
};
```

Slots are rendered by the generic pages via `<component :is>` with `defineAsyncComponent` — custom code is lazy-loaded only for that vertical, so it never taxes the bundle of the others.

## 5. Worked example — adding "صيدليات" (Pharmacy — ships at launch)

| Step | What | Kind |
|------|------|------|
| 1 | Admin creates ServiceType `pharmacy` with `requiresAttachment.enabled: true`, `hasOptionGroups: false`, `layout: 'list'` | **Data** |
| 2 | Nothing — generic checkout renders the attachment step because config says so | — |
| 3 | (Only if fancy UI wanted) register `pharmacy.checkoutExtra` slot component | ~1 small file |
| 4 | Onboard pharmacies as stores | **Data** |

Adding "خدمات منزلية" (home services, Phase 3): new `BookingFlowStrategy` + booking UI slot + `Booking` satellite table — still no change to existing verticals, orders, or auth.

## 6. What keeps this honest (anti-erosion rules)

1. **No `if (slug === 'restaurants')` anywhere.** Behavior differences must flow through config or strategy. CI greps for `serviceType.slug ===` outside the slot registry.
2. Config keys are added to the Zod schema first (with defaults) — old rows stay valid.
3. Every new vertical gets a seed fixture + an e2e smoke test of the generic flow.

## 7. Future improvements

- Per-vertical commission/settlement rules → `pricing` block in config (Phase 2 with payments).
- Vertical-level feature flags for gradual city rollouts.
- If a vertical ever outgrows the model (e.g., ride-hailing), it becomes a sibling bounded context — the marketplace core (identity, geo, payments, design system) is already shared.
