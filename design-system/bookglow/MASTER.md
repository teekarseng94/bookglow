# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/bookglow/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** BookGlow
**Generated:** 2026-09-20
**Category:** Multi-tenant appointment booking SaaS (wellness, beauty, and other service businesses)
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 3/10 (Subtle) | Density 6/10 (Standard, with per-app overrides)
**Research source:** UI UX Pro Max skill (`--design-system`, `--domain`, `--stack`)
**Brand rule:** Preserve the established BookGlow identity. Do not replace it with a generic spa-pink SaaS palette.

---

## Product analysis

| Axis | Decision |
|------|----------|
| Product | Hybrid: B2B merchant operations + C-end booking |
| Audience | Owners and staff (workday, POS, Android app); customers (mobile-first booking) |
| Style | Soft UI Evolution — subtle depth, measured contrast, no neumorphism |
| Typeface | Inter (existing). Marketing serif is allowed only on login story headlines |
| Icons | `lucide-react` outline set already in the merchant portal. Do not add a second icon family |
| Charts | Existing `recharts`. Prefer line/area for trends; never colour-only series |
| Motion | 150–300ms colour/opacity/elevation. Honour `prefers-reduced-motion` |
| Dark mode | Light is the product default. Superadmin may use a dark **sidebar** only |

UI UX Pro Max recommended Lora/Raleway and a pink luxury palette for “spa wellness”. Those recommendations are **rejected** for identity and operations: BookGlow is already a purple/rose brand with Inter as the UI font. Style, density, accessibility, and booking-product patterns from the skill **are** adopted.

---

## Global Rules

### Brand identity (do not replace)

| Role | Hex | Existing token | Notes |
|------|-----|----------------|-------|
| Brand / primary | `#7656d6` | `--brand` | CTAs, active nav, focus ring origin |
| Brand hover | `#6244bd` | `--brand-hover` | Hover / pressed primary |
| Brand deep | `#3e2b7d` | `--brand-deep` | Text on tinted brand surfaces |
| Brand soft | `#f0ebff` | `--brand-soft` | Selection, avatars, active nav fill |
| Brand border | `#d8cdf9` | `--brand-border` | Selected cards, focus-adjacent borders |
| Rose accent | `#c84d78` | `--rose` (customer; add alias on merchant) | Logo gradient only — **not** button fill |
| On brand | `#ffffff` | `--text-on-brand` | Text/icons on brand fill |

Logo mark: `linear-gradient(145deg, var(--brand), var(--rose))`. Keep the sparkle/star mark. Wordmark is “Bookglow”.

### Surfaces and text

| Role | Hex | Token |
|------|-----|-------|
| Canvas | `#f7f4f6` | `--bg-canvas` / `--bg-page` |
| Paper | `#fffdfb` | `--bg-paper` |
| Surface / card | `#ffffff` | `--bg-surface` |
| Soft inset | `#fbf8fa` | `--bg-soft` |
| Selection | `#f0ebff` | `--bg-selection` |
| Text primary | `#19161d` | `--text-primary` |
| Text secondary | `#615a66` | `--text-secondary` |
| Text muted | `#6f6873` proposed (today `#89818c`) | `--text-muted` |
| Border | `#e9e2e8` | `--line` |
| Border strong | `#d9cfd9` | `--line-strong` |

**Muted text correction:** `#89818c` on white/canvas is too light for 4.5:1 body copy. Keep it for disabled states only. Body, helper, and nav labels use `--text-secondary` or the darkened muted token.

### Status (booking semantics)

Map the skill’s booking colours (available green, booked grey, confirm accent) onto existing BookGlow status tokens:

| Meaning | Hex | Token | Use |
|---------|-----|-------|-----|
| Available / success / paid | `#16735d` | `--success` | Confirmed, in stock, live |
| Success soft | `#e9f6f1` | `--success-soft` | Badges, KPI tints |
| Warning / pending | `#96620a` | `--warning` | Needs attention |
| Danger / cancelled | `#a43b50` | `--danger` | Destructive, errors |
| Info | `#3d5a80` | `--info` | Neutral system notes |
| Booked / occupied | `--text-secondary` on `--bg-soft` | — | Occupied slots, not a new hue |

### Platform administration (superadmin only)

Keep the existing platform tokens. Do not invent a second dark theme for merchant or customer apps.

| Role | Hex | Token |
|------|-----|-------|
| Platform surface | `#111827` | `--platform-surface` |
| Platform line | `#263244` | `--platform-line` |
| Platform text | `#ffffff` | `--platform-text` |
| Platform muted | `#a9b4c5` | `--platform-muted` |
| Platform accent | `#7de2be` | `--platform-accent` |

Superadmin chrome should consume these tokens instead of hardcoded `#171322`.

### Typography

- **UI font:** Inter, `ui-sans-serif`, system fallbacks (`--font-sans`)
- **Loaded weights:** 400, 500, 600, 700. Stop using 650 / 750 / 780 / 850 — they are not in the Inter file and snap unpredictably
- **Marketing serif:** Georgia / Times **only** on merchant login story headlines (already present)
- **Do not** switch the product to Lora/Raleway

| Role | Size | Line height | Weight | Token / class |
|------|------|-------------|--------|---------------|
| Page title | 24px desktop / 26px mobile | 1.25 | 700 | `--text-page` / `.ui-page-title` |
| Section title | 16–18px | 1.25 | 600–700 | `--text-section` / `.ui-section-title` |
| Body | 15px (0.9375rem) | 1.5 | 400 | Align `--text-body` to the live `body` size |
| Label / eyebrow | 11px | 1 | 600 | `--text-label`, uppercase + tracking |
| Caption | 12px | 1.35 | 400 | Mobile `--mobile-text-caption` |

Minimum readable text: **12px**. Bottom-nav labels that are 0.62rem (~10px) should become 12px.

### Spacing

Keep the existing 4px rhythm. Master density is standard; apps override.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon gaps |
| `--space-2` | 8px | Inline, chip gap, touch spacing |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Default card/control padding |
| `--space-6` | 24px | Section gap |
| `--space-8` | 32px | Page section |
| `--space-12` | 48px | Marketing blocks |

Prefer `space-ui-*` Tailwind aliases or CSS variables over one-off `p-[15px]`.

### Radius

**Canonical (controls and operational cards):**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 8px | Chips, small inputs |
| `--radius-sm` | 10px | Buttons, fields, nav items |
| `--radius-md` | 12px | Cards, dialogs |
| `--radius-lg` | 16px | Sheets, large cards |
| `--radius-xl` | 20px | Marketing panels |
| Pill | 9999px | Avatars, FABs, status badges |

Customer marketing surfaces may use larger radii (see `pages/customer-booking.md`). Form controls stay on the canonical scale so merchant and booking inputs feel like one product.

### Elevation and focus

Keep the warm-ink shadows already in CSS:

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Resting operational cards |
| `--shadow-sm` | Dropdowns, FABs |
| `--shadow-md` | Modals, profile menus |
| `--shadow-lg` | Rare hero lift |
| `--focus-ring` | 3px `rgba(118, 86, 214, 0.16)` |
| `--focus-ring-strong` | 3px `rgba(118, 86, 214, 0.28)` |

Focus rules:

- Use `:focus-visible`, not `:focus` on click
- Never `outline: none` without a replacement ring
- Sticky headers/footers must not fully cover focused controls (`scroll-padding` + safe-area offsets)
- Overlay scrim: `rgba(25, 22, 29, 0.42)` (existing `.bg-ui-overlay`)

### Motion

- Duration: 150–200ms for colour/border; 200–300ms for sheets
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Pressed cards: `scale(0.99)` is allowed on mobile; do not shift layout bounds
- Existing `@media (prefers-reduced-motion: reduce)` stays mandatory
- Do not add GSAP. CSS + current `fadeIn` / `scaleIn` is enough

### Breakpoints

| Name | Width | Use |
|------|-------|-----|
| Phone | < 600px | Full-screen editor drawers, Android WebView |
| `sm` | 640px | Large phone / small tablet utilities |
| `tab` | 600px | Tablet portrait token (new) |
| `md` | 768px | Tablet; existing table/card switches |
| `compact` | 900px | Tablet landscape / compact desktop utilities |
| `lg` | 1024px | Desktop sidebar (runtime shell) |
| `posd` | 1200px | POS catalogue rail (existing) |
| `xl` | 1280px | Wide dashboards |

Merchant overlays must use `--drawer-size-*` and container queries. Do not size edit forms with viewport `md` while the panel is a 420px rail. Details: `pages/responsive.md` and `docs/BOOKGLOW_GLOBAL_RESPONSIVE_SYSTEM.md`.

Content widths: `--content-max: 1180px` (marketing/booking), `--decision-max: 720px` (forms). Merchant workspace is full-bleed inside the shell.

Recompose layouts; do not scale a desktop grid down to 375px.

### Accessibility (WCAG 2.2 AA)

1. **Contrast:** Body and UI text ≥ 4.5:1. Non-text controls and focus ≥ 3:1. Brand purple on white is for large/bold text and fills; small links use `--brand-deep`.
2. **Focus:** Visible `:focus-visible` ring. Focus must remain at least partly visible under sticky chrome.
3. **Keyboard:** All interactive elements are native `button` / `a` / form controls. Dialogs trap focus and restore it (`useDialogInteraction`).
4. **Forms:** Every input has a `<label>`. Inline errors use `role="alert"` and `aria-describedby`. After failed submit, move focus to an error summary and keep inline errors.
5. **Touch:** Minimum 44×44px hit area (`--mobile-min-touch-target`). 8px gap between adjacent targets. Icon-only controls need `aria-label`.
6. **Icons:** Decorative icons `aria-hidden="true"`. No emoji as structural icons (Lucide/SVG only).
7. **Auth:** Allow paste and password managers. Keep Google OAuth. Do not block paste or force cognitive transcription.
8. **Motion:** Honour reduced motion. Auto-rotating testimonials (marketing) need pause/previous/next.
9. **Live regions:** Toasts and save status are polite; validation errors are assertive.

### Navigation principles

- Merchant desktop: collapsible sidebar, grouped workday nav, profile footer
- Merchant mobile: 3–5 bottom tabs + More sheet (already matches the 5-item cap)
- Customer booking: sticky merchant header, section tabs, sticky CTA dock
- Superadmin: dark rail, light workspace, global search

Primary actions stay above browser chrome and the Android navigation bar.

### What this system must not do

- Do not create a BookGlow V2 app or replace backends
- Do not change authentication, routing, payments, tenant isolation, or data
- Do not introduce shadcn, Radix, Phosphor, GSAP, or new CSS frameworks
- Do not remap `--brand` to teal, pink, or a generic SaaS blue
- Do not enable product-wide dark mode in this phase

---

## Component Specs

Canonical implementations live in `apps/merchant-portal/components/ui/`. Specs and examples: [`components.md`](./components.md). Token layers: [`tokens.md`](./tokens.md).

| Pattern | Reuse |
|---------|--------|
| Button / IconButton | `components/ui/Button.tsx` |
| Field / SelectField | `components/ui/Field.tsx` |
| Dialog | `AppModal` + `useDialogInteraction` |
| Sheet / drawer | `AppSheet`, `AppDrawer` (`size`) |
| Overlay tabs / forms / tables | `OverlayTabs`, `FormGrid`, `ScrollTable` |
| Feedback | `Alert`, `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `SaveStatus` |
| Page chrome | `PageHeader`, `SectionHeader`, `FilterToolbar`, `StickyActionBar` |
| Toast | Existing `Toast.tsx` — restyle to status tokens later |

Customer marketing `components/Button.tsx` is a **legacy** CTA. New work should use CSS variables (`--brand`), not `PRIMARY_GREEN`.

---

## Implementation mapping

| App | Token files | Shell |
|-----|-------------|-------|
| Merchant portal | `apps/merchant-portal/index.css`, `styles/mobile-tokens.css`, `tailwind.config.js` | `Layout.tsx` |
| Customer site | `apps/customer-site/src/styles/tokens.css`, `utilities.css`, `global.css` | booking + landing components |
| Superadmin | Same merchant CSS; `--platform-*` | `SuperAdminLayout.tsx` |
| Android | `capacitor.config.ts`, `androidShell.ts` | StatusBar + `viewport-fit=cover` |

Future token work should converge names, not fork a third palette. Production pages stay unchanged until an explicit UI implementation pass.
