# Merchant Dashboard UI improvement

**Scope:** Merchant Portal → Dashboard (`apps/merchant-portal/pages/Dashboard.tsx` and presentational `components/dashboard/*`).  
**Updated:** 20 September 2026  
**Deployed to production:** No

This work improves the existing Dashboard. Routing, authentication, outlet permissions, `dashboardData` aggregation, and `fetchDashboardAggregates` RPC fallback are unchanged. No Firebase/Supabase architecture change. No hardcoded figures in the live Dashboard.

Design direction: [UI UX Pro Max](../.cursor/skills/ui-ux-pro-max/SKILL.md) (compact-label overflow, operable truncation, 44px targets) and [design-system/bookglow](../design-system/bookglow/README.md).

---

## TypeScript error — root cause and resolution

**Symptom:** `apps/merchant-portal/services/accountDeletionService.ts` line 38 failed `tsc` because `client().rpc(name, args)` received `name: string`, while the typed Supabase client only accepts known `Database['public']['Functions']` keys.

**Cause:** Outdated generated types, not an incorrect RPC name and not a production-function bug.

The four merchant RPCs (plus the public submit RPC from the same migration) already exist in:

`migration/supabase/migrations/20260918120000_account_deletion_requests.sql`

They were missing from `packages/database-contracts/src/database.types.ts` (last generated from the local migration workspace before that file was added).

**Fix (smallest, no `as any` / `@ts-ignore`):**

1. Add the missing `Functions` entries to the shared Database contract, matching the SQL signatures (`uuid` → `string`, `jsonb` → `Json`, no-arg status RPC → `Args: never`).
2. Call each RPC with a **literal name** and typed `Args`.
3. Parse `Json` returns into domain rows with explicit field checks (no unsafe casts).

Database functions were **not** modified.

`npm --prefix apps/merchant-portal run typecheck` now **passes**.

---

## Additional UI improvements (this pass)

### Currency

`MoneyAmount` wraps at thousand groups but keeps the last digits and `.xx` in a `white-space: nowrap` tail (`.dashboard-money__tail`). Amounts no longer break as `567.` / `89`.

### Mobile density (320 / 375)

- Page and section gaps: `space-y-2` on small screens, `lg:space-y-4` on desktop.
- Quick-action tiles: 56px minimum (still ≥44px), smaller icons on xs.
- KPI card min-height 84px; greeting stack `space-y-1.5`.
- First screen at 320px now shows greeting, actions, and both revenue/profit KPIs with full `RM 1,234,567.89`.

### Long names

`ExpandableText` replaces hover-only `title` tooltips. Truncated service/customer/attention copy expands on click, tap, and keyboard (`aria-expanded`).

### Font scaling

Playwright sets `document.documentElement.style.fontSize = '24px'` at 375px and asserts no horizontal overflow on the document, KPI values, or bottom nav.

---

## Files changed

### Production / types

| File | Change |
|------|--------|
| `packages/database-contracts/src/database.types.ts` | Account-deletion RPC signatures from migration `20260918120000` |
| `apps/merchant-portal/services/accountDeletionService.ts` | Literal RPC names + Json parsers |
| `apps/merchant-portal/pages/Dashboard.tsx` | `MoneyAmount` / `ExpandableText`; tighter mobile stack |
| `apps/merchant-portal/components/dashboard/MoneyAmount.tsx` | New |
| `apps/merchant-portal/components/dashboard/ExpandableText.tsx` | New |
| `apps/merchant-portal/components/dashboard/DashboardKpiCards.tsx` | Uses `MoneyAmount` |
| `apps/merchant-portal/components/dashboard/UpcomingAppointments.tsx` | Expandable names; slightly tighter rows |
| `apps/merchant-portal/components/dashboard/AttentionList.tsx` | Expandable copy |
| `apps/merchant-portal/components/dashboard/SalesSnapshot.tsx` | `MoneyAmount` |
| `apps/merchant-portal/components/dashboard/DashboardChartSection.tsx` | `MoneyAmount` |
| `apps/merchant-portal/components/dashboard/OperationalStatus.tsx` | Compact 56px tiles on xs |
| `apps/merchant-portal/components/dashboard/CustomerActivity.tsx` | Tighter vertical rhythm |
| `apps/merchant-portal/components/dashboard/TodayHeader.tsx` | Tighter mobile greeting stack |
| `apps/merchant-portal/index.css` | Global `.dashboard-money` / `__tail` |
| `apps/merchant-portal/styles/mobile-tokens.css` | Density and tile height |

### Tests and docs

| File | Change |
|------|--------|
| `apps/merchant-portal/components/dashboard/DashboardKpiCards.test.tsx` | Money tail + expandable-name tests |
| `apps/merchant-portal/test/visual/dashboard-layout.spec.ts` | Cents nowrap + 24px root font |
| `apps/merchant-portal/test/visual/dashboard-layout-harness.tsx` | Compact stack; long customer name |
| `apps/merchant-portal/test/visual/dashboard-authenticated.spec.ts` | Live Dashboard checks; screenshots; desktop vs mobile chrome |
| `apps/merchant-portal/test/visual/auth.setup.ts` | Login `#email`/`#password`; fail if account is still onboarding |
| `apps/merchant-portal/playwright.config.ts` | Auth tests on desktop + mobile only |
| `apps/merchant-portal/VISUAL_TESTING.md` | Completed workspace rules + local fixture |
| `design-system/bookglow/pages/dashboard.md` | Money / expand / density rules |
| `docs/DASHBOARD_UI_IMPROVEMENT.md` | This report |

---

## Test results

| Check | Result |
|-------|--------|
| `npm --prefix apps/merchant-portal run typecheck` | **Passed** |
| Vitest `DashboardKpiCards.test.tsx` + `Step3MobilePatterns.test.tsx` | **Passed** (7 tests) |
| Playwright `dashboard-layout.spec.ts` `--project=layout-harness` | **Passed** (3 tests: 6 widths, Android insets, 24px font) |
| Playwright `dashboard-authenticated.spec.ts` `--project=desktop,mobile` | **Passed** (5: auth-setup + 2 desktop + 2 mobile) against local completed fixture |
| `npm --prefix apps/merchant-portal run build` | **Passed** (Vite, 12.68s) |
| Production deploy | **Not performed** |

---

## Responsive testing (layout harness)

Playwright still asserts no horizontal overflow, visible unclipped KPIs, `RM 1,234,567.89` in the tree, nowrap decimal tail, 3 primary columns at 1440px, and Android safe-area insets.

Screenshots: `apps/merchant-portal/test/visual/artifacts/dashboard-layout-{320,375,390,768,1024,1440}.png`

| Width | Notes |
|-------|--------|
| **320** | KPIs appear on the first screen. Revenue shows `RM 1,234,567.89` with sparkline; cents stay with `567.89`. |
| **375** | Full KPI row + appointments (`14:30`, expandable long service name, Scheduled). |
| **390** | Same 2-column cards; no overflow. |
| **768** | Mobile chrome; 4-up quick actions; 2×2 KPIs. |
| **1024** | Desktop sidebar; primary cards stacked for readability. |
| **1440** | 4 KPIs, 3-column primary, 2-column secondary. |
| **375 @ 24px root** | No horizontal overflow on document, KPI, or bottom nav; expanded customer name remains visible. |

---

## Authenticated visual testing

**Date:** 21 September 2026 (Asia/Kuala_Lumpur in Playwright)  
**Result:** **Passed** against a completed **local** merchant fixture. Cloud/staging production merchants were not used.

### Setup inspected

| Source | Finding |
|--------|---------|
| `playwright.config.ts` | `auth-setup` writes gitignored `test/.auth/merchant.json`; desktop 1440 and mobile 390 depend on it. |
| Existing `merchant.json` | Authenticated **cloud** session (`*.supabase.co`), JWT expired, user had **no completed outlet** → merchant onboarding picker. |
| `VISUAL_EMAIL` / `VISUAL_PASSWORD` | Not present in repo, `.env`, or CI. No authorized cloud test credentials. |
| Merchant-portal `.env` | `VITE_SUPABASE_URL` is a **cloud** project; port 5173 was already serving that backend. |
| Local `bookglow-local` | Running on `127.0.0.1:55431`. All Auth emails are `@example.test`. Completed owner: `owner@example.test` → `outlet_local_authz_fixture` (“Local Authz Salon”), `onboarding_status=complete`. |

No production outlet was created. Real merchant rows were not modified. Authentication was not bypassed. A **session-only** password reset was applied through the **local** Auth admin API so Playwright could sign in on the real `/login` form.

Vite for these tests used local env on `http://127.0.0.1:5188` (`VISUAL_BASE_URL`) so the cloud 5173 process was left alone.

### Command

```powershell
npx playwright test test/visual/dashboard-authenticated.spec.ts --project=desktop --project=mobile
# 5 passed (14.7s)
```

### Checklist

| Check | Result |
|-------|--------|
| 1. Login → Dashboard | Passed. Auth setup lands on `Business performance`; greeting “Good morning, Local”. |
| 2. Outlet-scoped data | Passed. Desktop `Live outlet` title includes `outlet_local_authz_fixture`; sidebar/header show **Local Authz Salon**; session email `owner@example.test`. No Remote Control banner. No outlet combobox (regular merchants use `users.outletId`). |
| 3. KPI values unclipped | Passed. Revenue / profit / expenses `RM 0.00` fully visible; `scrollWidth <= clientWidth`. This fixture has no large totals — long-amount wrapping remains proven in the layout harness (`RM 1,234,567.89`). |
| 4. Currency decimals together | Passed when `.dashboard-money__tail` is present (`white-space: nowrap`). Live values are `RM 0.00`. |
| 5. Appointment times `HH:MM` | Empty state today: “No appointments scheduled today.” `HH:MM` coverage remains in the layout harness (`14:30`). |
| 6. Expand names (click / touch / keyboard) | No appointment rows on this fixture, so expand controls were not exercised live. Unit tests + layout harness still cover `ExpandableText`. |
| 7. Quick actions | Passed. New Booking → `/schedule`; New Sale → `/pos`; Today `aria-current="page"`. |
| 8. Desktop sidebar / mobile nav | Passed. 1440: `#bookglow-sidebar` visible, bottom nav hidden. 390: bottom nav visible (Today / Schedule / POS / Members / More), sidebar hidden. |
| 9. Loading / empty / error | Passed. Loading and “Workspace data could not be loaded” absent after load. Empty appointments, empty sales snapshot, empty top customers are usable. Error shell not forced (would hide the Dashboard). |

### Screenshots

| File | Viewport |
|------|----------|
| `apps/merchant-portal/test/visual/artifacts/dashboard-authenticated-desktop.png` | 1440 × 1000 |
| `apps/merchant-portal/test/visual/artifacts/dashboard-authenticated-mobile.png` | 390 × 844 |
| `apps/merchant-portal/test/visual/artifacts/dashboard-authenticated-nav-desktop.png` | After returning from Schedule/POS |
| `apps/merchant-portal/test/visual/artifacts/dashboard-authenticated-nav-mobile.png` | After returning from Schedule/POS |

Desktop: four KPI cards, 3-column primary row, sidebar **Today** active, **Live outlet**, Local Authz Salon.  
Mobile: header outlet name, 44px+ quick actions, KPIs, empty appointments, bottom nav; Needs Attention continues below the fold.

### Issues found and fixes applied (tests only)

Dashboard production UI was not redesigned.

1. **Auth setup labels.** Login fields are `Email` / `Password` (`#email`, `#password`), not “Email address”. Fresh login now fills those controls. Setup **fails** (does not skip) if the account is sent to onboarding.
2. **`Live outlet` is desktop-only** (`hidden lg:flex` utility header). Mobile asserts the mobile header outlet name instead.
3. **Session email appears twice** on desktop (profile + utility header). Assertion uses the banner locator.

### Remaining testing blockers

1. **Cloud / staging authenticated QA** is still blocked until an **authorized, completed** cloud test merchant is provided (`VISUAL_EMAIL` / `VISUAL_PASSWORD`, `users.outlet_id` set, `onboarding_status=complete`). Do not use real production merchant credentials without that authorization.
2. This local fixture has **no today’s appointments** and **RM 0.00** sales. Re-run against a richer dedicated outlet to exercise live `HH:MM` rows, expandable long names, and large `RM` wrapping on real data.
3. `VISUAL_MUTATION_TESTS` (walk-in booking, sale, member, and so on) were **not** run.
4. `test/.auth/merchant.json` now holds a **local** completed session. It is gitignored and is not valid against the cloud `.env` on port 5173. Refresh it with cloud credentials only when an authorized completed cloud workspace exists (`VISUAL_REFRESH_AUTH=1`).

How to configure a completed test merchant: see `apps/merchant-portal/VISUAL_TESTING.md`.

---

## Deployment-readiness summary

**Ready for a UI review / staging deploy of merchant-portal**, with these caveats:

1. Typecheck passes after this QA pass (tests/docs only; production Dashboard source unchanged). The previous production Vite build still stands and was not rebuilt.
2. Layout, money wrapping, expandable names, and enlarged-font overflow are verified in the harness.
3. Authenticated Dashboard QA **passed** on the local completed fixture (desktop + mobile). Cloud/staging live login was not exercised.
4. Quick calendar / top selling / payment remain `lg+` by design.
5. Do not deploy from this task automatically.

---

## What was deliberately not changed

- `dashboardData` `useMemo`, RPC `fetchDashboardAggregates`, local fallback
- React Router, `UserContext`, outlet permission gates
- POS, Schedule, Finance, Settings, customer site, Superadmin pages
- Production SQL functions
- Firebase / Supabase architecture
