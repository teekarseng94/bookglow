# Merchant portal mobile UX/UI audit report

**Date:** 2026-09-25  
**Scope:** Complete mobile audit and layout redesign of merchant-portal pages in `D:\GitHub\bookglow`.  
**Constraints honored:** No backend, schema, auth, permission, or business-rule changes. No deploy, Play Store release, `versionCode` bump, or production data mutation.

## Pages audited

Routes were discovered from `apps/merchant-portal/RootRoutes.tsx` and `apps/merchant-portal/App.tsx`, then each page/layout was inspected for overflow, clipping, fixed chrome, empty/loading/error states, and touch targets.

| Area | Route(s) | Page / layout |
| --- | --- | --- |
| Login | `/login` | `pages/Login.tsx` |
| Account setup | `/onboarding` | `MerchantOnboardingPage` → `MerchantOnboardingWizard` |
| Access states | `/access/*` | `AccessStatePage` |
| App shell | all merchant tabs | `components/Layout.tsx` (header, more menu, bottom nav) |
| Today | `/dashboard` | `pages/Dashboard.tsx` |
| Schedule | `/schedule` | `pages/AppointmentsCalendar.tsx` |
| Point of Sale | `/pos` | `pages/POS.tsx` |
| Members / CRM | `/member` | `pages/CRM.tsx` |
| Member details | `/member-details/:id` | `pages/MemberDetails.tsx` |
| Menu & Inventory | `/menu` | `pages/Services.tsx` |
| Staff | `/staff` | `pages/Staff.tsx` |
| Sales History | `/transactions` | `pages/Transactions.tsx` |
| Sales Reports | `/sales-reports` | `pages/SalesReports.tsx` |
| Reports | `/report` | `pages/ReportPage.tsx` |
| Finance | `/finance` | `pages/Finance.tsx` |
| Marketing | `/marketing` | `pages/Marketing.tsx` |
| Settings | `/settings` | `pages/Settings.tsx` |
| Integrations | `/integrations` | `pages/Integrations.tsx` |
| Google Reviews | `/integrations/google-reviews` | `pages/GoogleReviewsIntegrationPage.tsx` |
| Chatbot API | `/integrations/chatbot-api` | `pages/ChatbotApiIntegrationPage.tsx` |
| API keys | settings-linked | `pages/ApiIntegrationManagement.tsx` |
| External sync | settings-linked | `pages/ExternalIntegrations.tsx` |
| Superadmin | `/admin/*` | `SuperAdminLayout` + admin pages |
| Dialogs / sheets | shared | `AppSheet`, `AppModal`, `AppDrawer`, filter sheets, empty/loading/error primitives |

Required viewport check: **320 / 360 / 390 / 412 / 768 / 1440**. Desktop layout is preserved at `md` (768px) and above.

## Problems discovered

### Confirmed by the attached Android screenshots

1. **Point of Sale duplicate empty copy**  
   `POSCatalogueSection` rendered “No services found. Try a different category or search.” and the page also rendered a second catch-all “No items found…” line. Search, the All Services chip, and the cart bar were otherwise present, but the catalogue had two competing empty messages and no useful action.

2. **Menu & Inventory clipped tabs**  
   Catalog type used a 3-column grid plus mobile-only icons and `truncate`, so labels became `Servi…`, `Produ…`, `Packa…` at ~320–390px. Filter/sort icons and the Add Service FAB were usable, but important labels were not readable.

### Found during the full-route audit

3. **Onboarding (already in progress from the prior pass)**  
   Fixed Continue bar + non-definite `100dvh` grid hid software options, the location map, and category cards. Continue stayed enabled on empty required fields.

4. **Settings**  
   Desktop-width tab rail and `lg` breakpoint squeezed forms below 1024px. Overlay tabs could expand ancestors horizontally.

5. **Sales History / Reports**  
   Type chips shared a row with the date control and could clip. Report page used `100vh` and `overflow-auto`, which nested a second scroller and could hide summary cards behind the bottom nav.

6. **Inconsistent page padding**  
   Dashboard, Marketing, Finance, Schedule, API/external integrations, and Member Details either used magic `pb-20`/`pb-24` values or omitted `overflow-x-hidden` / bottom-nav clearance.

7. **Touch targets and toasts**  
   Profile avatar was 2.35rem. Icon buttons were 40px. Toasts used `min-w-[300px]`, which overflows a 320px viewport. Member import toast sat at `bottom-6`, under the Android nav.

8. **API integration fields**  
   Key and webhook inputs used `min-w-[200px]` / `min-w-[260px]`, which can force horizontal overflow on 320px.

9. **Superadmin mobile nav**  
   Horizontal scroller existed, but links were smaller than 44px.

## Screenshots / issues addressed

| Evidence | Fix |
| --- | --- |
| POS: two empty messages, no action | One `POSCatalogueEmptyState`. Empty catalog → “No services yet” + **Go to Menu**. Filtered miss → “No matching items” + **Clear filters**. Catch-all duplicate removed. |
| Menu: `Servi…` / `Produ…` / `Packa…` | Tabs now use `OverlayTabs` segmented control with full labels, horizontal scroll if needed, 44px targets, no truncate. |
| Menu FAB overlapping list / nav | FAB and list padding use `--mobile-bottom-nav-height` + safe-area instead of hardcoded `72px`. Empty states have Add / Clear actions. |
| Onboarding Continue covering lists | In-flow footer, `100dvh` grid, keyboard-aware viewport (`interactive-widget=resizes-content`). |
| Settings overflow | Mobile-composed tabs from 768px, wrapping descriptions, OverlayTabs `max-width: 100%`. |
| Sales chips clipping | Chips in their own scroller; date lives in the filter sheet. |
| Cart / bottom nav covering content | Shared `m-page-with-bottom-nav` / `m-page-with-sticky-action` padding; POS cart remains above the nav. |

Playwright harness screenshots were written to `apps/merchant-portal/test/visual/artifacts/` (`pos-*.png`, `inventory-*.png`, plus existing onboarding/settings/sales artifacts).

## Components and files changed

### Shared primitives (new)

`apps/merchant-portal/components/ui/MobileShell.tsx`

- `MobilePageShell` — `min-w-0`, `overflow-x-hidden`, bottom-nav or sticky-action padding
- `MobileHeader` — `PageHeader` with `min-w-0`
- `MobileScrollArea` — single vertical scroller, no nested x-overflow
- `BottomActionBar` — `StickyActionBar`
- `SafeAreaSpacer` — `env(safe-area-inset-*)`
- `ResponsiveTabs` — `OverlayTabs`
- `MobileFilterSheet` — bottom `AppSheet` for filters/sort
- Re-exports: `EmptyState`, `LoadingState`, `ErrorState`

Tests: `MobileShell.test.tsx`.

### Product files (this audit)

- POS: `pages/POS.tsx`, `POSCatalogueList.tsx`, `POSCatalogueToolbar.tsx` (mobile filter sheet)
- Menu: `InventoryTypeTabs.tsx`, `InventoryFiltersSheet.tsx`, `InventorySortSheet.tsx`, `pages/Services.tsx`
- Shell/CSS: `styles/mobile-tokens.css`, `index.css`, `components/Layout.tsx` avatar size, `IconButton.tsx`
- Reports: `ReportPage.tsx`, `SalesReports.tsx`, `ReportDateRangeBar.tsx` (filter sheet + 44px date arrows)
- Remaining pages wrapped for overflow + nav clearance: Dashboard, CRM, Member Details, Staff, Finance, Marketing, Schedule, Integrations, Google Reviews, Chatbot API, API Integration, External Integrations
- Superadmin: `SuperAdminLayout.tsx` 44px mobile nav chips
- Toasts: `Toast.tsx`, CRM import toast placement
- Settings / onboarding / sales (prior pass, still in tree): OnboardingShell, SettingsNavigation, Transactions, OverlayTabs, viewport meta

### Tests added/updated

- `components/pos/POSCatalogueList.test.tsx`
- `components/inventory/InventoryTypeTabs.test.tsx`
- `components/ui/MobileShell.test.tsx`
- Playwright `merchant-mobile-ux.spec.ts` + harness screens for POS and Menu

## Responsive behavior implemented

- **320–412px:** compact 56px header + safe-area, one vertical page scroller (POS catalogue scroll is intentional), no page-level x-overflow, 44px icon/avatar/tab/filter targets, stacked forms, scrollable chips/tabs, sheets for filters.
- **768px:** existing tablet/desktop composition starts (`md`). Settings side navigation, inventory desktop toolbar, schedule desktop grid (still `hidden md:flex`).
- **1440px:** desktop POS rail, report sidebar, settings two-pane layout unchanged in structure.

Layout tokens:

- `100dvh` onboarding shell
- `env(safe-area-inset-*)` / `--mobile-safe-area-bottom`
- `m-page-with-bottom-nav` and `m-page-with-sticky-action`
- Overlay tabs never expand past `max-width: 100%`

## Accessibility improvements

- POS empty states are distinct and include a primary action.
- Inventory tabs expose full accessible names (`Services`, `Products`, `Packages`) instead of truncated text.
- Filter/sort controls open labelled dialogs (`aria-haspopup="dialog"`, sheet titles).
- Icon buttons default to 44×44. Header hamburger remains 44px; profile avatar is now 44px.
- Overlay tabs keep keyboard arrow / Home / End movement.
- Empty, loading, and error primitives remain `role="alert"` / `aria-busy` where already defined.
- Close controls in sheets stay labelled `Close`.
- Continue in onboarding stays disabled until the step is valid; saving blocks double submit.

## Tests and build results

| Check | Result |
| --- | --- |
| Merchant portal `npm run typecheck` | Pass |
| Merchant portal `npm test` (Vitest) | **58 files, 197 tests passed** |
| Merchant portal `npm run build` | Pass (`vite build`, 13.7s) |
| Playwright `merchant-mobile-ux.spec.ts` `--project=layout-harness` | **8 passed** (onboarding, settings, sales, POS empty, inventory tabs) |
| `git diff --check` | Pass (CRLF conversion warnings only; no conflict markers / whitespace errors) |

New unit coverage includes: no duplicate POS empty copy, inventory tab full labels, page shell overflow classes, sticky-action padding, filter sheet open/close.

## Remaining limitations

- **Authenticated live Android / emulator pass was not available in this session.** Playwright used the static visual harness (Layout + page primitives), not a signed-in production outlet. Live POS/Menu data, Android IME, and gesture bars were not re-photographed on device.
- Nested scrolling remains **intentional** on POS (catalogue vs sticky cart) and the desktop schedule workspace (`md+` min-width staff grid, hidden on phones).
- Superadmin `/admin/*` pages received overflow-safe layout and 44px mobile chips; they are not a full consumer-app redesign.
- Login is a dedicated marketing/form layout without bottom navigation; it was audited but not converted to `MobilePageShell`.
- The full authenticated Playwright matrix (`desktop`, `mobile`, `mobile-360`, etc.) was not re-run because it depends on stored merchant auth and is slower than the layout harness.
- Visual artifacts are layout-harness screenshots, not Play-store marketing shots.

## Recommended follow-up

1. Sign in on a physical Android device (320–412) and walk POS, Menu, Settings, Reports, Schedule, and onboarding with the keyboard open.
2. Run the authenticated Playwright visual projects once `test/.auth/merchant.json` is valid.
3. Consider replacing remaining page-level `Sheet` usages with `MobileFilterSheet` for one dialog motion.
4. Audit third-party chart libraries on Dashboard for internal x-overflow at 320px with real data.
5. Superadmin: convert the mobile chip scroller to `ResponsiveTabs` if more admin destinations are added.

## Release-readiness conclusion

**The merchant app is ready for an internal Android QA build from the current sources.** The two screenshot defects (duplicate POS empty copy and clipped Menu tabs) are fixed, the shared mobile layout system is in place across merchant routes, and typecheck / unit tests / production build / layout Playwright all passed.

It is **not** a Play Store release candidate from this workstream: `versionCode` was not changed, no AAB was produced, and live-device authenticated verification still needs a human pass. Ship this as a debug/internal layout fix, then promote after device QA.
