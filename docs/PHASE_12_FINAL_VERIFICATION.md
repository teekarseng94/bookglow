# Phase 12 — Final Visual and Behavior Verification

**Status:** Complete (programme gates PASS with residual debt)  
**Date:** 2026-07-16  
**Branch:** `redesign-from-zip`  
**Rule:** Do not migrate the backend. Performance optimisation only after this verification.

---

## Verdict

| Gate | Result |
|------|--------|
| Phases 0–11 presentation retrofit delivered | **PASS** |
| `build:merchant` / `build:customer` | **PASS** |
| Logic / handlers / Firestore contracts preserved (per phase locks) | **PASS** |
| Backend boundary (Auth + Firestore live; no Supabase cutover; no V2 live) | **PASS** |
| Design-system foundation + feature folders | **PASS** |
| Full pixel / a11y / legacy-chrome compliance vs Volumes I–VI | **NEEDS WORK** (residual debt below) |
| Programme ready for isolated performance work | **YES**, if residual debt is accepted as follow-up |

---

## Page completion matrix

| Surface | Route(s) | Phase | Presentational retrofit | Notes |
|---------|----------|-------|-------------------------|-------|
| Shared tokens + `ui/*` | — | 1 | Complete | Merchant + customer tokens |
| Schedule | `/schedule` (`/appointments` → redirect) | 2 | Complete | Feature folder wired |
| Menu / inventory | `/menu` | 3 | Complete | DnD/CRUD locks preserved |
| Settings | `/settings` | 4 | Complete | Field names / keys locked |
| Staff | `/staff` | 5 | Complete | Discard still `window.confirm` |
| Sales / transactions / finance | `/sales-reports`, `/transactions`, `/finance` | 6 | Complete | ReportPage nav stale (see issues) |
| Members / CRM | `/member`, `/member-details/:id` | 7 | Complete | CRM chrome still heavy legacy |
| POS | `/pos` | 8 | Complete | Cart/checkout locked |
| Dashboard | `/dashboard` | 9 | Complete | Admin-only |
| Customer booking + marketing | `/book/:bookingPath`, landing | 10 | Complete | `booking-v2` not live |
| Super Admin | `/admin/dashboard`, `/admin/subscribers` | 11 | Complete | Owner-email gate |
| Marketing vouchers | `/marketing` | 11 | Complete | Admin-only |
| Integrations | `/settings/integrations` | 11 | Complete | Real connection states only |
| API keys | (settings-linked page) | 11 | Complete | Hash/generate unchanged |
| Buy / redeem voucher | `/buy-voucher/:slug`, `/redeem/:unique_id` | 11 | Complete | Public on merchant host |
| Login | `/login` | 1+ | Complete | |
| Public merchant book | `/book/:id` | — | Legacy presentational | Not a Phase 2–11 primary target |

---

## Blueprint compliance matrix (Volumes I–VI)

| Volume | Intent | Compliance |
|--------|--------|------------|
| **I** Platform truth & retrofit strategy | Design-only; protect Firebase/logic | **Met** — no Auth/Firestore schema/rules cutover; no parallel product |
| **II** Experience architecture | Journeys, nav, responsive continuity | **Mostly met** — tab URLs + mobile patterns in place; stale `/report` nav item; cashier deep-link to `/schedule` possible |
| **III** Visual design & theming | Tokens, density, components, a11y | **Foundation met**; legacy pages still mix `teal-*` / `rounded-2xl` with tokens |
| **IV** Screen & component retrofit | Target structure per screen | **Met for phase targets**; residual chrome on CRM, Services editor, member modals |
| **V** Interaction / motion / state | Loading, save, error, overlays | **Partial** — shared Alert/Empty/SaveStatus/Sheet/Modal; some `window.confirm`; Modal/Sheet lack focus trap |
| **VI** Existing-code retrofit & gates | Safe sequence + verification | **Met** — phased docs 0–11; this report is the verification gate |

---

## Changed-file inventory (summary)

Relative to `main...HEAD` on `redesign-from-zip` (plus uncommitted Phase 10–11 work at verification time):

| Area | Change character |
|------|------------------|
| `apps/merchant-portal/components/ui/*` | New shared primitives (~20 files) |
| Feature folders | New: `schedule`, `inventory`, `settings`, `staff`, `reports`, `members`, `pos`, `dashboard`, `admin` |
| Merchant pages | Presentational rewires of Schedule, Services, Settings, Staff, reports/finance, CRM, POS, Dashboard, Super Admin, Marketing, integrations, vouchers |
| `apps/merchant-portal/index.css`, `tailwind.config.js` | Token system + `ui-*` utilities |
| Customer tokens / booking components / marketing visuals | Phase 1 + 10 |
| `docs/PHASE_0` … `PHASE_12` | Programme documentation |
| Nested `bookglow/` tree | Removed / consolidated in monorepo layout |

Exact `git diff --stat main...HEAD` at verification: large consolidate + redesign (≈292 paths in that range). Uncommitted at verification: Phase 10–11 page/component/docs files listed in `git status`.

---

## Extracted-component inventory

### Merchant `components/ui/`

Alert, Button, ConfirmationDialog, DenseEntityRow, EmptyState, ErrorState, Field, FilterToolbar, IconButton, LoadingSkeleton, Modal, PageHeader, SaveStatus, SectionHeader, SelectField, Sheet, StatusBadge, StickyActionBar, `cx`, `index`

### Feature folders

| Folder | Role |
|--------|------|
| `schedule/` | Calendar header, toolbar, date strip, booking list/card/detail, empty/loading |
| `inventory/` | Menu tabs, toolbar, entity card, edit panel, filters sheet, save/status |
| `settings/` | Nav, section, hours row, save bar/status, mobile section |
| `staff/` | Roster, card, editor sections, save bar, status |
| `reports/` | Header, filters, date range, summary, txn card, detail sheet, empty |
| `members/` | Header, toolbar, row, filter sheet, summary/balance/history, action bar |
| `pos/` | Catalogue, cart sheet/items, sticky action, payment, totals, member summary |
| `dashboard/` | Today, attention, appointments, sales, customers, operational, charts |
| `admin/` | Platform banner + page header |

### Customer

`components/booking/*` (header, service card, sticky action, state/empty screens, messages), `ProductPreviewPanel`, `FloatingScreens` (product UI), marketing `Button`

---

## Responsive verification results

**Method:** Static / code audit (breakpoint tokens, `sm`/`md`/`lg` layouts, safe-area padding). Not a device-lab screenshot pass.

| Viewport (directive) | Code support | Risk |
|----------------------|--------------|------|
| 360 × 640 | `sm:640`, mobile-first sheets/sticky bars | Low–medium on legacy CRM density |
| 375 × 667 | Same | Low–medium |
| 390 × 844 | Same + safe-area | Low |
| 768 × 1024 | `md:768` dual layouts (cards ↔ tables) | Low |
| 1280 × 800 | `lg:1024` / content max widths | Low |
| 1440 × 900 | Same desktop patterns | Low |

Tailwind screens: `sm 640` / `md 768` / `lg 1024` / (`xl` via config). Safe-area insets in merchant `index.css`.

**Recommendation:** Manual smoke at 360 and 768 on POS, Schedule, CRM, booking before performance work if residual CRM chrome is in-scope.

---

## Accessibility results

| Check | Status |
|-------|--------|
| Global `:focus-visible` + focus-ring tokens | Present (merchant + customer) |
| `IconButton` requires `label` → `aria-label` | Present |
| Modal/Sheet Escape + body scroll lock | Present |
| Focus trap / restore / `aria-labelledby` on overlays | **Missing** on `ui/Modal` / `ui/Sheet` |
| `prefers-reduced-motion` | Present |
| `sr-only` / `aria-live` on loading | Partial (`LoadingSkeleton`, some schedule/inventory) |
| Form labels / Field `id` association | Mixed — newer pages better; legacy forms uneven |
| Contrast / 44px targets | Generally improved on new components; legacy dense controls remain |
| Remaining `window.confirm` | CRM (5), AppointmentsCalendar (1), Staff discard (1), TransactionDetailModal (1) |

---

## Build / type-check / test results

| Check | Result |
|-------|--------|
| `npm run build:merchant` | **PASS** (2026-07-16) |
| `npm run build:customer` | **PASS** (2026-07-16) |
| Merchant `tsc --noEmit` | **27 errors** — pre-existing / out-of-scope (see `docs/KNOWN_EXISTING_TYPECHECK_ISSUES.md`; also ReportFilterSheet keys, Services `Search`, etc.) |
| Customer `tsc --noEmit` | **0 errors** |
| Customer `vitest run` | **180 / 180 PASS** (booking-v2 suite; experimental, not live-routed) |
| Merchant unit tests | **None** configured |

---

## Backend boundary confirmation

| Requirement | Confirmed |
|-------------|-----------|
| Firebase Authentication remains active | Yes — merchant + customer |
| Firestore remains active | Yes — sole live DB via `databaseService` → Firestore |
| No query/write contract migration in Phases 0–11 | Yes — phase docs lock handlers/fields |
| No Supabase integration introduced as live path | Yes — dormant `lib/supabase.ts` / dep unused by pages |
| No provider-neutral repository replacing Firebase | Yes — Firestore hardcoded |
| No Firebase removal | Yes |
| No V2 implementation live | Yes — `booking-v2` exists, **not mounted** in `customer-site/index.tsx` |

---

## Behavior preservation (spot audit)

Preserved by phase locks and route audit:

- Auth redirects, outlet requirement, owner Super Admin email gate
- Admin-only tabs vs cashier nav
- Feature locks (`finance-view`, `manage-staff`, `export-crm`, etc.)
- Schedule booking CRUD / delete confirm path
- POS cart, checkout, `isProcessing`
- CRM search/CRUD/import-export / separate balance domains
- Settings field names and localStorage keys
- API key generate/regenerate SHA-256
- Live booking path `/book/:bookingPath` (Any available staff, friendly errors)

**Known nav quirk (pre-existing / leftover):** Layout may expose a `report` item → `/report`, but `report` is not in `VALID_TAB_IDS` (falls through to dashboard). Not introduced as a new booking/API change.

---

## Remaining visual issues

1. Legacy page chrome: CRM, parts of Services / MemberDetails / Settings still use hard `teal-*` / `rounded-2xl` (teal remapped to brand — looks OK, fights token system).
2. Overlay zoo: `ui/Modal`/`Sheet` vs CreditWallet / Points / Outstanding / TransactionDetail hand-rolled modals.
3. Confirm UX split: `ConfirmationDialog` vs `window.confirm` (see a11y).
4. Customer live booking still carries some legacy palette classes beside new booking components.
5. No customer shared `components/ui/` kit.
6. Super Admin metric cards intentionally show `—` (no fake numbers).
7. `ROUTES_MASTER_MAP.md` outdated vs code.

---

## Pre-existing technical issues

- Merchant strict `tsc` ~27 errors (documented).
- Dormant `@supabase/supabase-js` dependency + unused service files.
- Vendor chunk size warning on merchant build (>500 kB).
- Circular chunk warning (`vendor` ↔ `loader`).
- Hard-coded Super Admin owner email in App / ProtectedRoute.
- Cashier can deep-link `/schedule` though nav hides it.

---

## Logic preservation confirmation

Phases 0–11 were executed as **presentation-only**. Verification finds:

- No Firestore rules/index/schema edits in the retrofit programme docs or audited UI wiring.
- No replacement of checkout, booking math, commission, or API-key hashing.
- `booking-v2` untouched and unmounted.
- Firebase Auth/Firestore remain the live stack.

---

## Next

Performance optimisation may begin as an **isolated** track (no design or logic changes in the same commits).

Suggested follow-ups (optional, not Phase 12 scope):

1. Migrate remaining `window.confirm` → `ConfirmationDialog`
2. Focus trap on Modal/Sheet
3. Token pass on CRM / member modals
4. Refresh `ROUTES_MASTER_MAP.md`
5. Fix or remove stale `/report` nav item
6. Separate maintenance pass for merchant `tsc` errors
