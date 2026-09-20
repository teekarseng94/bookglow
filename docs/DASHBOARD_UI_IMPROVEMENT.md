# Merchant Dashboard UI improvement

**Scope:** Merchant Portal → Dashboard (`apps/merchant-portal/pages/Dashboard.tsx` and presentational `components/dashboard/*`).  
**Date:** 20 September 2026  
**Deployed to production:** No

This pass improves the existing Dashboard. Routing, authentication, outlet permissions, `dashboardData` aggregation, and `fetchDashboardAggregates` RPC fallback are unchanged. No Firebase/Supabase migration. No hardcoded figures in the live Dashboard.

Design direction came from UI UX Pro Max (SaaS dashboard hierarchy, 44px targets, wrapping over clipping, colour-plus-label chart encoding) and `design-system/bookglow`, keeping BookGlow purple/rose and Inter.

---

## Files changed

### Production UI

| File | Change |
|------|--------|
| `apps/merchant-portal/pages/Dashboard.tsx` | Greeting without emoji; Lucide quick actions; `HH:MM` times; `formatRM` on tables/payments; 44px calendar/tab controls; week chart + customer activity on mobile; primary row becomes 3-up from `xl` (1280px) |
| `apps/merchant-portal/components/dashboard/DashboardKpiCards.tsx` | Equal-height cards; wrapping KPI values; sparkline class that is no longer hidden; region landmark; sparkline stacks under the value on extra-small widths |
| `apps/merchant-portal/components/dashboard/UpcomingAppointments.tsx` | All of today’s rows; wrapping titles; 44px row action and schedule link; colon times |
| `apps/merchant-portal/components/dashboard/AttentionList.tsx` | Wrapping copy; 44px actions; `h2` heading |
| `apps/merchant-portal/components/dashboard/SalesSnapshot.tsx` | Wrapping totals; 44px period select and history button; chart `role="img"` |
| `apps/merchant-portal/components/dashboard/OperationalStatus.tsx` | 2×2 then 4-up Lucide tiles; focus-visible; `h2` |
| `apps/merchant-portal/components/dashboard/CustomerActivity.tsx` | Visible on all breakpoints; wrapping values |
| `apps/merchant-portal/components/dashboard/DashboardChartSection.tsx` | Shown on mobile; shorter bars; wrapping totals; today marked by colour **and** bold label |
| `apps/merchant-portal/components/dashboard/BookingLinkCard.tsx` | Stacks on small screens; 44px share; wrapping copy |
| `apps/merchant-portal/components/dashboard/TodayHeader.tsx` | Mobile greeting is visible; wrapping header actions |
| `apps/merchant-portal/index.css` | Sidebar/nav 44px hit area; brand-border + inset active rail; focus-visible; 12px/600 mobile labels; main scroll padding for safe areas |
| `apps/merchant-portal/styles/mobile-tokens.css` | Removed KPI `nowrap` and sparkline hide; wrapping money; 12px captions |

### Tests and docs

| File | Change |
|------|--------|
| `apps/merchant-portal/components/dashboard/DashboardKpiCards.test.tsx` | Asserts wrapping classes and labelled KPI article |
| `apps/merchant-portal/test/visual/dashboard-layout-harness.html` | Layout harness (same pattern as finance) |
| `apps/merchant-portal/test/visual/dashboard-layout-harness.tsx` | Presentational Dashboard composition for overflow/safe-area QA |
| `apps/merchant-portal/test/visual/dashboard-layout.spec.ts` | Viewports 320 / 375 / 390 / 768 / 1024 / 1440 |
| `apps/merchant-portal/playwright.config.ts` | `layout-harness` project (no merchant auth) |
| `design-system/bookglow/pages/dashboard.md` | Page-level Dashboard rules |
| `design-system/bookglow/README.md` | Index entry for `dashboard.md` |
| `docs/DASHBOARD_UI_IMPROVEMENT.md` | This report |

Harness figures are **only** for layout overflow checks. Live Dashboard still renders `dashboardData` / RPC aggregates.

---

## Design improvements

### Desktop

- KPI cards share padding, radius, and equal height; revenue uses a real weekly sparkline from existing chart data.
- Sales snapshot, appointments, and attention sit in one readable column until 1280px, then a three-column row, which avoids clipped money and attention copy at 1024px with the sidebar.
- Sidebar active item uses `--brand-soft`, `--brand-border`, and an inset brand bar; links are 44px with a visible focus ring.
- Decorative Info icons and the greeting emoji were removed.
- Dense calendar, top selling, top customers, and payment stay `lg+` so mobile scroll stays shorter.
- Amounts use `RM` consistently (`formatRM`).

### Mobile / Android

- Cards use `min-w-0` and `overflow-wrap: anywhere`; KPI CSS no longer forces `white-space: nowrap`.
- Quick actions are Lucide tiles at ≥44px (typically 72px on small screens).
- Bottom nav labels are 12px / semibold with an active indicator; shell still consumes `--safe-top` / `--safe-bottom`.
- Customer activity and the week chart are available below `lg` (they were previously `hidden lg:block`).
- Appointment times keep `14:30` instead of compact `1430`.

### Accessibility

- Heading order: page `h1`, section `h2` (KPI labels are `<p>`, not skipped `h3`).
- Charts expose text `aria-label`; today is not colour-only.
- Tabs use `aria-selected`. Icon buttons have accessible names.

---

## Checks run

| Check | Result |
|-------|--------|
| `vitest` `DashboardKpiCards.test.tsx` + `Step3MobilePatterns.test.tsx` | Passed (5 tests) |
| Playwright `dashboard-layout.spec.ts` `--project=layout-harness` | Passed (2 tests) |
| `npm --prefix apps/merchant-portal run build` | Passed (Vite production build, 17.97s) |
| `npm --prefix apps/merchant-portal run typecheck` | Failed — **pre-existing**, not in this diff: `services/accountDeletionService.ts(38,46)` argument not assignable to the RPC name union |
| Authenticated visual projects (`merchant-pages`, `finance` via `auth-setup`) | Not run — `test/.auth/merchant.json` and `VISUAL_EMAIL` / `VISUAL_PASSWORD` are not available locally |
| Production deploy | Not performed |

---

## Responsive testing

Playwright opened the layout harness, set `--safe-top: 28px` and `--safe-bottom: 24px`, and asserted:

1. `documentElement.scrollWidth ≤ clientWidth` (no horizontal overflow)
2. KPI value is visible and does not clip (`scrollWidth ≤ clientWidth`)
3. `RM 1,234,567.89` remains in the document (wraps rather than ellipsizes)
4. At 1440px, `.dashboard-primary` has three columns
5. Mobile header inner top ≥ 28px and nav inner bottom ≤ viewport − 24px

Screenshots: `apps/merchant-portal/test/visual/artifacts/dashboard-layout-{320,375,390,768,1024,1440}.png`

| Width | Layout notes |
|-------|----------------|
| **320** | 2×2 quick actions and KPIs; long revenue wraps onto following lines (not clipped). Greeting + actions push KPIs below the first screen; user scrolls. Bottom nav remains usable. |
| **375** | Same 2-column card grid; revenue wraps (`RM 1,234,567.` / `89`) with sparkline under the value. |
| **390** | Revenue fits `RM 1,234,567.89` with sparkline below; appointments start under the fold. |
| **768** | Still the mobile chrome (`lg` is 1024). Quick actions go 4-up (`sm`). KPIs stay 2×2. Appointments show time, service, guest, and status without horizontal overflow. |
| **1024** | Desktop sidebar + 4 KPI cards. Primary appointments / attention / sales stack so copy and RM totals stay fully visible. Customer activity + booking link two-up. |
| **1440** | Four KPIs, three-column primary row, two-column secondary row, week chart readable. Sidebar **Today** active state is clear. |

---

## Remaining issues

1. **`tsc` in merchant-portal** still fails on `accountDeletionService.ts` (unrelated to Dashboard).
2. **Authenticated Playwright** (`auth-setup`) needs stored merchant credentials; only the new harness project ran here.
3. **320px first screen** is still greeting + date + booking + four quick actions; KPIs require a short scroll. That is a density trade-off, not overflow.
4. **Long names** (clients, services) still `truncate` / `line-clamp-2` with `title` tooltips. Monetary values wrap instead.
5. **Quick calendar, top selling, top customers, payment** remain desktop-only (`lg+`), matching the existing information-density split.
6. **System font scaling** was not separately emulated beyond wrapping CSS; clamp + `overflow-wrap: anywhere` is the accommodation.
7. Nothing was deployed.

---

## What was deliberately not changed

- `dashboardData` `useMemo`, RPC `fetchDashboardAggregates`, and local transaction fallback
- React Router paths, `UserContext`, outlet permission gates
- POS, Schedule, Finance, Settings, customer site, Superadmin
- Firebase architecture / Supabase service migration
