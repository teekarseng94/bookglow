# BookGlow design-system report

**Date:** 20 September 2026  
**Scope:** Documentation only. No production pages, routes, auth, payments, tenant isolation, or database behaviour were changed.  
**Method:** Inspected the existing React + Vite + TypeScript apps, then ran UI UX Pro Max searches (`--design-system`, `--domain`, `--stack`). Brand colour and Inter were kept; generic skill palettes were not persisted.

---

## 1. Proposed design decisions

### Keep (identity and architecture)

- Brand purple `#7656d6`, hover `#6244bd`, deep `#3e2b7d`, tint `#f0ebff`
- Rose `#c84d78` only in the logo/booking mark gradient
- Warm canvas `#f7f4f6` and paper `#fffdfb`
- Inter as the UI typeface
- Soft UI Evolution: light depth, 8–12px control radii, 150–300ms motion
- Existing 4px spacing scale, focus rings, safe-area tokens, reduced-motion rules
- Merchant `components/ui/` primitives and `.m-*` mobile tokens
- `lucide-react` + `recharts` (already installed)
- Capacitor status bar: white, non-overlay, light icons

### Adopt from UI UX Pro Max (behaviour, not palette)

| Research | How it is used |
|----------|----------------|
| Soft UI Evolution | Shared visual style for all three apps |
| Booking product pattern | Available = success green; booked = muted grey; confirm = brand purple |
| Variance 5 / motion 3 / density 6 | Master baseline; merchant/POS/superadmin denser; booking more open |
| WCAG 2.2 AA outcomes | Error summary + inline errors; focus not obscured; accessible auth (paste/OAuth) |
| React 19.2 stack | Focus trap in dialogs; native form submit; no new UI kit |
| Tailwind focus-visible | Keep token rings; never outline-none without replacement |
| Charts | Line/area for trends via existing Recharts; no colour-only series |
| Native safe areas / 5-tab cap | Matches current Android shell and More sheet |

### Reject from UI UX Pro Max

| Recommendation | Why |
|----------------|-----|
| Pink luxury palette `#EC4899` / `#FDF2F8` | Replaces BookGlow identity |
| Lora + Raleway | Inter is loaded and used in every app; serif is not suitable for POS/tables |
| Phosphor icons | Merchant already standardises on Lucide |
| GSAP scroll-reveal | Unnecessary dependency; CSS motion is enough |
| Product-wide dark mode | Skill anti-pattern also warned against it; superadmin dark **rail** only |
| shadcn / Radix (from ui-styling skill) | User requirement: no new frameworks |

### Shared vs per-app

| Principle | Shared | Varies |
|-----------|--------|--------|
| Colour identity | Yes | Superadmin dark rail tokens |
| Typeface | Inter | Login story serif headline only |
| Control radius / focus / 44px touch | Yes | Marketing surface radius may be larger |
| Density | — | Merchant 7–8, booking 4–5, superadmin 8 |
| Navigation | — | Sidebar vs bottom nav vs booking dock vs platform rail |

---

## 2. Current vs proposed

| Area | Current | Proposed | Action later |
|------|---------|----------|--------------|
| Brand hex | Purple/rose already in CSS | Keep; document as source of truth | None for identity |
| Token layers | Flat CSS variables + aliases | Primitive → semantic → component mapping in docs | Converge names; no hex rewrite |
| Radius | Merchant 8/10/12/16/20; customer 8/12/18/26/34; mobile 8/10/14 | Canonical controls = merchant scale; marketing surfaces may stay larger | Align inputs/buttons first |
| Body type | `body` 15px vs `--text-body` 14px | 15px everywhere | Fix token to match live body |
| Font weights | 650/750/780/850 used; Inter file loads 300–700 | 400/500/600/700 only | Replace unofficial weights |
| Muted text | `#89818c` | Darken to `#6f6873` for captions/nav | Contrast fix |
| Status | Tokens exist; Toast uses Tailwind green/red/blue | All feedback uses `--success/warning/danger/info` | Restyle Toast |
| Customer CTA | `PRIMARY_GREEN = '#7656D6'` + slate Button | `var(--brand)` | Rename/stop spreading the constant |
| Loading splash | Spinner `#0d9488` (old teal) in merchant `index.html` | `--brand` | Tiny HTML restyle later |
| Superadmin rail | Hardcoded `#171322` | `--platform-surface` | Tokenise chrome |
| Dual dialogs | `Modal.tsx` and `AppModal.tsx` | `AppModal` canonical | Stop new `Modal` usage |
| Dual buttons | Merchant `ui/Button` vs customer marketing `Button` | Merchant primitive for apps; marketing CTA uses tokens | Do not share a new package yet |
| Touch | Many 44px targets; POS add 38–40px | 44px minimum | POS/qty/report arrows |
| Nav labels | Some 0.62rem (~10px) | ≥ 12px | Mobile nav |
| Teal utilities | `teal-*` remapped to purple | New code uses `brand` | Leave remap for old classes |
| Dark mode | Light product + dark admin rail | Same | No product dark theme |
| Icons | Lucide | Lucide | No Phosphor |
| Motion | CSS + reduced-motion | Keep; no GSAP | — |

---

## 3. Components to reuse

### Merchant portal (`apps/merchant-portal/components/ui/`)

| Primitive | Role |
|-----------|------|
| `Button`, `IconButton` | Actions |
| `Field`, `SelectField` | Labelled controls |
| `PageHeader`, `SectionHeader`, `FilterToolbar` | Page chrome |
| `DenseEntityRow` | Compact lists |
| `StatusBadge`, `Alert`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `SaveStatus` | Feedback |
| `AppModal`, `AppSheet`, `AppDrawer`, `ModalParts`, `ConfirmationDialog` | Overlays |
| `StickyActionBar` | Mobile primary action |
| `NetworkStatusBanner` | Connectivity |
| `useDialogInteraction` | Focus trap / Escape |

### Domain-specific (extend, don’t duplicate)

- Inventory: `InventoryEntityCard`, type tabs, outlet card
- POS: `POSItemCard`, `POSCartSheet`, sticky cart
- Members / staff / schedule / reports / dashboard cards
- Superadmin: `PlatformMetricCard`, `GlobalSuperAdminSearch`, `OutletInspector`
- Shell: `Layout.tsx`, `SuperAdminLayout.tsx`

### Customer site

- Booking: `BookingMerchantHeader`, `BookingServiceCard`, `BookingSectionTabs`, `BookingStickyAction`, `BookingEmptyState`, `BookingStateScreen`
- Marketing: landing + pricing components (visual only)
- `BrandLogo` for third-party marks

### Do not duplicate

- `Toast.tsx` — restyle, don’t replace
- Booking journey handlers inside `BookingPage.tsx`
- Capacitor status-bar setup

---

## 4. Inconsistencies to correct (future UI pass)

1. **Misnamed brand constant** `PRIMARY_GREEN` is purple.
2. **Splash spinner** still teal `#0d9488`.
3. **Toast** colours bypass semantic status tokens.
4. **Radius and type tokens** diverge between merchant, mobile, and customer files.
5. **Unofficial font-weight** numbers vs Inter loaded 300–700.
6. **Hardcoded hex** in shells (`#c84d78`, `#171322`, `#9a929d`, `#111` onboarding continue).
7. **Onboarding continue** is near-black, not brand — decide: keep as a high-contrast “next” or switch to `--brand`.
8. **Two modal implementations** and two Button implementations.
9. **Sub-44px** POS add, some qty buttons, some report arrows.
10. **Bottom-nav type** below 12px.
11. **Placeholder / muted** contrast likely under 4.5:1.
12. **Platform tokens** defined but unused by Superadmin layout.
13. **Customer Inter** is not loaded in `index.html` (merchant is); customer relies on system ui-sans-serif unless another import exists.
14. **Skill checklist “cursor-pointer on clickable elements”** — add on buttons/links that are not native `<button>`/`<a>` when those are later touched.

None of these require a new dependency.

---

## 5. Affected areas (when implementation is authorised)

Documentation does **not** modify these. They are the surfaces a later visual pass would touch.

### Merchant portal

- `index.css` / `mobile-tokens.css` / `tailwind.config.js` (token alignment only)
- `index.html` splash colours
- `Layout.tsx` (nav label size, hit areas)
- Dashboard, POS, schedule, members, staff, inventory, settings, finance, reports, integrations
- `components/Toast.tsx`
- `components/ui/*` (shared states)
- Android: `capacitor.config.ts` already correct; page sticky offsets only if a target is short

### Customer site

- `src/styles/tokens.css`, `utilities.css`
- `constants.tsx` (`PRIMARY_GREEN`)
- `components/Button.tsx` (stop hex/slate drift)
- Booking components and `.bookglow-booking`
- Landing/pricing CTAs

### Superadmin

- `SuperAdminLayout.tsx` chrome tokens
- Admin dashboards, subscribers, onboarding, support, health, audit, subscriptions

### Explicitly out of scope

- Auth, routing, Stripe/PayPal, Google OAuth, tenant isolation
- Supabase/Firebase data and migrations
- New BookGlow V2 repository or app
- Package.json dependency additions

---

## 6. Retrieval prompt for later implementation

```
I am building the [Page Name] page.
Read design-system/bookglow/MASTER.md.
Also read design-system/bookglow/pages/[page-name].md if it exists
(merchant-portal, customer-booking, superadmin, android-webview, pos, schedule, booking).
If the page file exists, prioritize its rules; otherwise use Master exclusively.
Reuse apps/merchant-portal/components/ui and existing CSS variables.
Do not replace BookGlow purple/rose with another palette.
Do not change application logic, auth, routing, payments, or data.
```

---

## 7. Files added

```
design-system/bookglow/
  README.md
  MASTER.md
  tokens.md
  components.md
  REPORT.md
  pages/
    merchant-portal.md
    customer-booking.md
    superadmin.md
    android-webview.md
    pos.md
    schedule.md
    booking.md
```
