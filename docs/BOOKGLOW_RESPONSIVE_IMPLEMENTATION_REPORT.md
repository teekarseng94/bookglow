# BookGlow responsive implementation report

**Date:** 21 September 2026  
**Deployed:** No

This pass established the shared merchant responsive foundation and applied it first to Menu & Inventory (Edit Service). POS, Schedule, and Dashboard page-specific layouts were not rewritten.

---

## Changes implemented

- Central responsive tokens on `:root` and page-frame container queries
- `AppDrawer` sizes (`sm`–`xl`, `editor`) instead of `max-w-lg` + ad-hoc 420px rails
- Shared `OverlayTabs`, `FormGrid`, `ScrollTable`
- Menu Edit Service: editor drawer, scrollable tabs, container-aware field grid, catalog `ScrollTable`
- Staff editor tabs + wider modal
- Settings: horizontal section tabs below `lg`
- Filter toolbar rows from the `compact` (900px) band

---

## Files modified (selected)

| File | Change |
|------|--------|
| `apps/merchant-portal/index.css` | Tokens, content-frame container + padding |
| `apps/merchant-portal/styles/responsive-system.css` | **New** drawer/tab/form/table/icon-grid CSS |
| `apps/merchant-portal/tailwind.config.js` | `tab` 600, `compact` 900 screens |
| `apps/merchant-portal/components/ui/AppDrawer.tsx` | `size` prop |
| `apps/merchant-portal/components/ui/OverlayTabs.tsx` | **New** |
| `apps/merchant-portal/components/ui/FormGrid.tsx` | **New** |
| `apps/merchant-portal/components/ui/ScrollTable.tsx` | **New** |
| `apps/merchant-portal/components/ui/index.ts` | Exports |
| `apps/merchant-portal/components/ui/FilterToolbar.tsx` | `compact:` row layout |
| `apps/merchant-portal/components/inventory/InventoryEditPanel.tsx` | `size="editor"`; removed 420px cap |
| `apps/merchant-portal/pages/Services.tsx` | Tabs, FormGrid, ScrollTable |
| `apps/merchant-portal/components/staff/StaffEditor.tsx` | OverlayTabs, `xl` modal |
| `apps/merchant-portal/components/settings/SettingsNavigation.tsx` | Tablet/phone tabs |
| `apps/merchant-portal/pages/Settings.tsx` | Column stack below `lg` |
| `apps/merchant-portal/playwright.config.ts` | `merchant-responsive` harness project |

---

## Shared components created or refactored

**Created:** `OverlayTabs`, `FormGrid`, `ScrollTable`, `responsive-system.css`  
**Refactored:** `AppDrawer`, `InventoryEditPanel`, `FilterToolbar`, `SettingsNavigation`, `StaffEditor`

---

## Pages migrated

| Page | Status |
|------|--------|
| Menu & Inventory | Editor drawer + tabs + form grid + table region |
| Staff & Team | Shared tabs; wider dialog |
| Settings | Shared tabs on tablet/phone |
| All merchant pages | Tokenized page padding + `page` container |
| POS | Unchanged layout CSS; regression **passed** |
| Dashboard / Schedule / Finance / Members | Foundation only; page-specific layouts preserved |
| Superadmin | Not altered |

---

## Menu Edit Service drawer

Before: `sm:max-w-[420px]` from 640px up, wrapping tab labels, `md:grid-cols-2` inside the narrow rail.

After:

- Phone: full-screen editor
- 768×1024: drawer width **greater than 500px** (harness assertion; near-full overlay)
- Desktop: 42rem rail
- Details / Pricing / Availability / Media stay on one line and scroll if needed
- Save/Cancel remain in the sticky footer

---

## POS regression

`npx playwright test test/visual/pos-layout.spec.ts --project=layout-harness` — **3 passed** (viewport matrix, iPad Mini checkout vs bottom nav, 24px font).

---

## Tablet and desktop screenshots

Harness artifacts under `apps/merchant-portal/test/visual/artifacts/`:

- `merchant-responsive-{width}x{height}.png` for the matrix in the system doc
- `merchant-responsive-375-font-24.png`, `merchant-responsive-768-font-24.png`

These are layout-harness captures with deterministic fixtures, not live production data.

---

## Test results

| Check | Result |
|-------|--------|
| Vitest OverlayTabs, OverlayPrimitives, InventoryEditPanel, SharedMobilePrimitives | **Passed** (13 tests) |
| `tsc --noEmit` | **Passed** |
| Playwright `merchant-responsive.spec.ts` | **Passed** (2 tests, 11 viewports + 24px font) |
| Playwright `pos-layout.spec.ts` | **Passed** (3 tests) |
| `npm run build` | **Passed** (Vite, 16.20s) |
| Authenticated live-route matrix | **Not re-run this pass** — requires completed merchant `auth-setup` (`test/.auth/merchant.json`). Use existing `dashboard-authenticated` / `tablet-768` projects against a local completed fixture. Do not use production merchants. |
| Production deploy | **Not performed** |

---

## Remaining issues

- Schedule, Marketing, and other `AppDrawer` callers still use default `md` (32rem). Switch to `editor` only when the form is complex.
- Finance / Sales History tables still use local overflow; optional `ScrollTable` migration.
- `Layout` still enables the desktop sidebar at 1024px, so 768 portrait keeps mobile nav. That is intentional shell behaviour, not a POS-style split.
- Some historical `md:grid-cols-2` grids remain on page bodies; migrate when they appear inside overlays.
- Live authenticated screenshots of every merchant route were not captured here.

---

## Deployment readiness

Safe to deploy as a UI-only change: no schema, auth, routing, or business-logic rewrites. Review Menu Edit Service on a tablet and desktop before release. Do not auto-deploy.
