# 08 — Design System ("SG")

> Status: Draft v0.1 • Last updated: 2026-07-29
> Inspiration: Uber/Careem/Talabat clarity + Apple HIG restraint. Target: **WCAG 2.1 AA**, elderly-first.
> Implementation home: `apps/web/app/components/ui` + Tailwind v4 `@theme` tokens. **No raw hex/px in feature code — tokens only.**

## 1. The five laws (every screen is reviewed against these)

1. **One primary action per screen.** Exactly one big green button. Everything else is visually secondary.
2. **Big or gone.** Touch targets ≥ 48 px (primary buttons 56 px). Body text ≥ 17 px. If it must be small, it must be optional.
3. **Words a grandmother uses.** Egyptian Arabic microcopy, zero jargon: "فين نوصلك؟" not "حدد الموقع الجغرافي".
4. **Never dead-end, never blame.** Every error states what happened + one tap to recover. Every empty state says what to do next.
5. **Show the system's heartbeat.** Skeletons while loading, explicit success confirmations, live order status — the user always knows "what's happening now".

## 2. Design tokens (Tailwind v4 `@theme` — single source)

```css
@theme {
  /* Brand — one primary, used sparingly (buttons, active states, links) */
  --color-primary-500: #10b981;
  --color-primary-600: #059669;  /* default action */
  --color-primary-700: #047857;  /* hover/pressed + small text on white */
  --color-primary-50:  #ecfdf5;  /* selected backgrounds */

  /* Neutrals (zinc) — the UI is mostly white + near-black text */
  --color-ink:        #18181b;   /* primary text — 16.9:1 on white */
  --color-ink-soft:   #52525b;   /* secondary text — 7.6:1 */
  --color-line:       #e4e4e7;   /* borders */
  --color-surface:    #ffffff;
  --color-surface-alt:#fafafa;

  /* Semantic — status is NEVER color-only (always icon + text) */
  --color-success-600:#059669;
  --color-warning-600:#d97706;
  --color-danger-600: #dc2626;
  --color-info-600:   #0284c7;

  /* Typography — Cairo (Arabic+Latin), generous sizes */
  --font-sans: "Cairo", "Segoe UI", Tahoma, system-ui, sans-serif;
  --text-sm:   0.9375rem;  /* 15px — metadata only */
  --text-base: 1.0625rem;  /* 17px — body minimum */
  --text-lg:   1.25rem;    /* 20px — emphasized body, buttons */
  --text-xl:   1.5rem;     /* 24px — section titles */
  --text-2xl:  1.875rem;   /* 30px — screen titles, prices in checkout */

  /* Shape & elevation — soft, calm */
  --radius-md: 12px;  --radius-lg: 16px;  --radius-full: 999px;
  --shadow-card:  0 1px 3px rgb(0 0 0 / 0.08);
  --shadow-sheet: 0 -8px 30px rgb(0 0 0 / 0.12);

  /* Motion — quick, honest, optional */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;  --duration-base: 250ms;
}
```

Rules: line-height 1.6 for Arabic body; digits are Latin (0-9) for prices/phones (universally read in Egypt); spacing on a 4 px grid; light theme only at launch (dark is a Phase 3 token swap — components never hardcode colors, so it costs nothing later); `prefers-reduced-motion` disables all non-essential animation.

## 3. Layout system

- **Mobile-first, one column.** Customer app renders in a centered `max-w-[480px]` column even on desktop (Talabat pattern) — one layout to perfect, zero responsive bugs.
- Merchant board: same column on phones; on tablets/desktop expands to a 3-column Kanban. Admin: conventional wide dashboard.
- Bottom navigation (customer): 4 items max — الرئيسية / طلباتي / العناوين / حسابي. Icons + labels, always.
- Safe-area aware; sticky bottom CTA bar on store/cart screens (thumb reach).
- Courier app: single-task screen — the active delivery fills the viewport (pickup, drop-off, cash to collect); history behind one tab.

## 4. Component inventory (`Sg` prefix — build once, use everywhere)

| Component | Purpose / key props | Notes for elderly-first |
|-----------|--------------------|-------------------------|
| `SgButton` | `variant: primary/secondary/ghost/danger`, `size: md(48)/xl(56)`, `loading`, `icon`, `block` | `loading` shows spinner + keeps label; disables double-submit |
| `SgInput` | label, hint, error, `inputmode` | Label always visible (no placeholder-as-label), 17 px+ |
| `SgPhoneInput` | EG format `01X XXXX XXXX`, `inputmode=tel` | Huge digits, auto-normalizes to E.164 |
| `SgOtpInput` | 4 boxes, auto-advance, paste, WebOTP autofill | Digits 30 px; auto-submit on last digit |
| `SgQuantityStepper` | `- 2 +`, min/max | 48 px buttons — the core "add to cart" control |
| `SgCard` | padding/radius/shadow slot wrapper | The only allowed card wrapper |
| `SgSheet` | Bottom sheet: `title`, drag-dismiss, focus-trap | **Primary container for all flows** (cart, options, confirmations) — keeps context visible behind |
| `SgDialog` | Centered modal for destructive confirms only | Two buttons max, danger styled |
| `SgToast` | success/error/info, auto-dismiss 4 s, `role=status` | Bottom-anchored above nav |
| `SgBadge` / `SgStatusBadge` | Status → label+icon+color from shared map | Never color-only |
| `SgPrice` | Formats piasters → "١٢٥٫٥٠ جنيه" | Big variant for totals (30 px) |
| `SgServiceCard` | Vertical entry: icon + name, min-height 96 px | Home screen grid of 2 |
| `SgStoreCard` | Logo, name, rating, fee, ETA, open/closed | Closed stores greyed + "يفتح ٩ ص" |
| `SgProductCard` | list/grid per vertical config, image, price, stepper | Add without leaving the list |
| `SgOrderCard` | Code, store, status badge, total, CTA (track/reorder) | "اطلب تاني 🔄" = one-tap reorder |
| `SgAddressCard` | Label icon, landmark line, radio select | Default preselected at checkout |
| `SgCartBar` | Sticky bottom: items count + total + "اتمام الطلب" | Appears the moment cart > 0 |
| `SgOrderTimeline` | Vertical steps from statusEvents + assignment | The tracking screen centerpiece |
| `SgCourierTaskCard` | Pickup point, drop-off, **cash to collect (huge)**, call buttons, one CTA | The courier screen is one card, one button |
| `SgCashSummary` | Courier daily: deliveries, cash held, fees to remit | Plain numbers at 30 px (ADR-011) |
| `SgSkeleton` | text/card/image variants, shimmer | Mirrors real layout (no spinners on content) |
| `SgEmptyState` | Icon + one sentence + one action | Never a blank screen |
| `SgTabs` | Underline tabs, swipe-linked | Merchant board columns on mobile |
| `SgAvatar`, `SgSearchBar`, `SgTopBar`, `SgBottomNav`, `SgCallButton` | — | `SgCallButton`: green phone button on order screens — elderly users prefer calling |

Composition rule: **feature code composes `Sg*` components; it never styles primitives directly.** A repeated pattern appearing twice becomes a component the second time.

## 5. The 30-second order (returning user) — the flow everything serves

| Sec | Screen | User does | System does |
|----:|--------|-----------|-------------|
| 0–3 | Home | Taps "مطاعم" | Zone remembered; skeletons < 300 ms |
| 3–8 | Store list | Taps favorite store (recent stores pinned first) | SSR-cached |
| 8–18 | Store page | Taps + on 2 items | `SgCartBar` slides up with running total |
| 18–22 | Cart sheet | Taps "اتمام الطلب" | Address (default ✓) + COD (✓) pre-selected |
| 22–26 | Confirm sheet | Sees total + address landmark, taps **"اطلب دلوقتي"** (56 px) | Idempotent POST; button locks with spinner |
| 26–30 | Tracking | — | "استلمنا طلبك ✓" + live timeline. Done. |

Taps: **6**. First-time users add: zone pick (once), address form (once — 4 required fields only: zone, street, building, landmark), OTP (auto-filled).
Guard in CI: Playwright e2e runs this exact script and fails the build if it exceeds 30 s on throttled 4G emulation.

**The errand flow (مشوار) obeys the same laws:** one screen, three questions in the user's own words (إيه المطلوب؟ / منين؟ / فين نوصله؟), optional budget, the fee shown **before** the confirm button, then the same tracking screen. Target ≤ 60 s. The merchant's "اطلب مندوب" form is the same pattern with recipient name/phone + cash to collect.

## 6. Microcopy — voice & tone (ar-EG)

| ✅ Write | ❌ Not | Why |
|---------|--------|-----|
| فين نوصلك؟ | حدد عنوان التوصيل | Conversational beats formal |
| اطلب دلوقتي | تأكيد الطلب | Action, not bureaucracy |
| المحل بيجهّز طلبك | جاري معالجة الطلب (PREPARING) | Human, never internal states |
| النت فصل ثانية — بنحاول تاني | Error 500 / فشل الاتصال | Reassure + auto-retry |
| الرقم ده مش مظبوط، اتأكد منه | رقم هاتف غير صالح | Helpful, never blaming |
| للأسف "برجر بلس" قفل دلوقتي — يفتح بكرة ٩ ص. شوف محلات شبهه؟ | المتجر مغلق | Always offer the next step |
| محتاج حاجة من أي مكان؟ اطلب مشوار | خدمة المهام والتوصيل الخارجي | Name the need, not the feature |
| المندوب هيشتري بحد أقصى ١٥٠ ج وهتدفع اللي اتصرف بالظبط | الحد الأقصى للميزانية المصرح بها | Money talk stays human |

All strings live in `apps/web/i18n/ar.json`, keyed `feature.screen.element` — no hardcoded text in components (English later = translate one file).

## 7. Accessibility checklist (WCAG 2.1 AA — enforced in review + axe CI)

- Contrast ≥ 4.5:1 body / 3:1 large text (token pairs pre-validated — the palette above passes).
- Full keyboard operability; visible focus rings (`:focus-visible`, 2 px primary offset ring).
- `SgSheet`/`SgDialog`: focus trap, `Esc`/back-swipe dismiss, `aria-modal`, restore focus on close.
- Toasts `role=status` (never focus-stealing); form errors linked via `aria-describedby`; OTP announces attempts left.
- `lang="ar" dir="rtl"` at root; icons that imply direction flip automatically via logical properties (`ms-*`, `ps-*` — never `ml/pl`).
- Zoom to 200 % without horizontal scroll; all imagery has alt or is `aria-hidden`.
- Status conveyed by icon + text + color, never color alone.

## 8. Future improvements

- Dark theme = second token block (components untouched).
- Font-size preference switch ("خط أكبر") stored per user — tokens make this a root-variable change.
- Voice-note order instructions (attachment infra from doc 07 reused).
