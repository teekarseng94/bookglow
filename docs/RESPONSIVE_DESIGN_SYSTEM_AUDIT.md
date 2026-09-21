# Merchant Portal responsive design system audit

**Date:** 21 September 2026  
**Scope:** BookGlow Merchant Portal (`apps/merchant-portal`). Superadmin shared chrome was inspected and left unchanged.  
**Research:** UI UX Pro Max (`--design-system`, `--domain ux/web`, `--stack html-tailwind/react`) plus `design-system/bookglow` and `docs/DASHBOARD_UI_IMPROVEMENT.md`.

UI UX Pro Max recommended a generic blue glassmorphism SaaS palette and Plus Jakarta Sans. Those identity recommendations are **rejected**. BookGlow keeps Inter and the purple/rose brand from Master. Adopted from the skill: no horizontal page overflow, touch targets ≥44px, focus not obscured by sticky chrome, table overflow handled by scroll or cards, mobile-first then enhance, labels stay whole, drawers/forms adapt to available width.

---

## What was already working

| Area | Evidence |
|------|----------|
| Shell switch | Sidebar and desktop utility bar at `lg` 1024px; mobile header + 5-item bottom nav below that |
| POS tablet split | Dedicated `720–1199` CSS plus catalogue **container queries** (`pos-catalogue`) |
| Dashboard | Completed density, money wrapping, expandable names, 44px actions |
| Schedule | Full-bleed content frame; page-specific layout preserved |
| Shared overlays | `AppModal` / `AppDrawer` / `AppSheet` with focus trap, sticky header/footer, safe-area footer padding |
| Mobile tokens | Large `styles/mobile-tokens.css` already covers phone density, 44px controls, Android insets |
| Members / Finance | Card lists on phone; tables or panels from `md` |

---

## Conflicting breakpoint definitions

| Token / query | Width | Used for |
|---------------|-------|----------|
| Tailwind `sm` | 640px | Forms, headers, many `sm:` utilities |
| `--bp-sm` | 640px | CSS reference only |
| Tailwind `md` | 768px | Tables, two-column forms, “desktop table” |
| `--bp-md` | 768px | Reference |
| `@media (max-width: 767.98px)` | phone | Most `.m-*` mobile token rules |
| Tailwind `post` | 720px | POS tablet split start |
| `@media (min-width: 720px) and (max-width: 1199.98px)` | POS tablet | POS only |
| Tailwind `lg` | 1024px | Sidebar, many toolbars (`lg:flex-row`) |
| `--bp-lg` | 1024px | Reference |
| Tailwind `posd` | 1200px | POS desktop rail |
| Tailwind `xl` | 1280px | Wide dashboard grids |
| Onboarding | 720–1199 and 900px | Separate merchant-onboarding CSS |
| Drawer `lg:top-[4.5rem]` | 1024px | Desktop header offset |

**Conflict that caused the Menu drawer bug:** viewport `md` (768) and `sm` (640) were used *inside* a drawer whose width was `sm:max-w-[420px]`. At iPad Mini 768×1024 the page is in a tablet shell, but the Edit Service panel was a 420px rail with `md:grid-cols-2` fields. Tabs wrapped. That is viewport-aware layout applied to a container that is much narrower than the viewport.

Master said merchant desktop chrome starts at `md` 768. Runtime `Layout.tsx` correctly switches chrome at `lg` 1024. Tablet portrait therefore still uses mobile nav — by design of the shell — while several pages already showed desktop tables.

---

## Page notes

### Dashboard / Today
Tokenized page padding now applies. Layout rules from the Dashboard UI improvement remain. Do not flatten into the Menu/POS structure.

### Schedule
Full-bleed frame preserved. Booking detail still uses `AppDrawer` default `md` (32rem).

### POS
720–1199 split and container queries unchanged. Regression harness passed after this work.

### Menu & Inventory
Primary failure: `InventoryEditPanel` forced `sm:max-w-[420px]`. Edit tabs used a wrapping flex row. Service form used `md:grid-cols-2`. Catalog table was `hidden md:block` with a plain `overflow-x-auto` wrapper.

### Members
Card rows on phone; existing toolbar. No drawer rewrite this pass.

### Staff
Editor already used a wide modal (`~720px`) and scrollable tabs. Tabs now share `OverlayTabs`. Modal size is `xl` with existing `mobileFullscreen` on phones.

### Sales History / Finance / Reports
Phone cards + `md` tables with local overflow. Shared `ScrollTable` is available; Sales History already had an `overflow-auto` region and was left as-is.

### Marketing / Integrations / Onboarding
Existing drawers keep default `md` size. Onboarding CSS (720–1199) was not replaced.

### Settings
Side nav was `hidden lg:block`, so tablet portrait had **no section navigation**. Horizontal `OverlayTabs` now cover `< lg`.

### Superadmin
Inspected only. `OutletInspector` drawer className overrides remain. No workflow changes.

---

## Duplicated rules to stop copying

- Per-page `max-w-[420px]` / `max-w-lg` drawer widths
- Viewport `md:grid-cols-2` inside overlays
- One-off tab strips with wrapping labels
- `lg:flex-row` toolbars that ignore 900px compact-desktop

Canonical replacements: `--drawer-size-*`, `AppDrawer size`, `OverlayTabs`, `FormGrid`, `ScrollTable`, page/drawer **container queries**.
