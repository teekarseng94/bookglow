# Phase 0 — Blueprint and Source Baseline

**Status:** Complete  
**Date:** 2026-07-15  
**Branch:** `redesign-from-zip`  
**Directive:** Bookglow Master Build Directive (Phases 0–4 / 0–5)  
**Production code edited:** None

---

## 1. Design-First Firestore blueprints (authoritative)

Confirmed present under `docs/Bookglow-Volumes-I-VI-Design-First-Firestore-Blueprints/`:

| # | File |
|---|------|
| I | `Bookglow-Volume-I-Platform-Truth-and-Retrofit-Strategy.html` |
| II | `Bookglow-Volume-II-Experience-Architecture-and-User-Journeys.html` |
| III | `Bookglow-Volume-III-Visual-Design-and-Merchant-Theming-System-Corrected.html` |
| IV | `Bookglow-Volume-IV-Screen-and-Component-Retrofit-Specification.html` |
| V | `Bookglow-Volume-V-Interaction-Motion-State-and-Operational-Behavior.html` |
| VI | `Bookglow-Volume-VI-Existing-Code-UI-Retrofit-and-Logic-Preservation.html` |

Also present (supporting, not a seventh volume):

- `Bookglow-Volumes-I-VI-Master-Index.html`
- `REVISION-NOTE-DESIGN-FIRST-FIRESTORE.html` — locks Design-first / Firestore-first; defers Supabase migration to a separate programme

**Use these six volumes for every subsequent phase.**

---

## 2. Obsolete blueprints — ignore

Ignore the entire folder:

`docs/Bookglow-Volumes-I-VI-Corrected-Blueprints/`

Especially ignore Volume VI titled:

`Bookglow-Volume-VI-Existing-Code-Implementation-and-Supabase-V2-Transition.html`

Also ignore on disk (not mounted in the live router):

- `apps/customer-site/src/booking-v2/` (~63 files) — experimental `/book-v2/...` tree
- `migration/` SQL/export tooling — Firestore→Supabase prep only; not runtime

**Phase 0 decision:** No V2 route will be created. No V2 source folder will be promoted. Leftover `booking-v2` must not be imported, routed, or extended.

---

## 3. Documents read

| Document | Role for Phases 1–5 |
|----------|---------------------|
| `README.md` | Stale folder names (`zenspa backend` / `zenspa Frontend`); live apps are `apps/merchant-portal` and `apps/customer-site` |
| `PROJECT_MASTER_MAP.md` | Stale path names; route intent still useful |
| `ROUTES_MASTER_MAP.md` | Same — treat as historical; live map is §4 below |
| `SYSTEM_MAP.md` | Partially obsolete (HashRouter/admin notes); Functions list still relevant |
| `REDESIGN_CHANGE_MANIFEST.md` | Shell + booking presentation already applied; handlers untouched |
| `docs/UI_STRUCTURE.md` | Current composition model |
| `docs/VOLUME_I_VI_UI_RETROFIT.md` | Locked boundaries for presentation-only work |
| `docs/KNOWN_EXISTING_TYPECHECK_ISSUES.md` | Merchant `tsc` debt outside retrofit scope |
| `docs/Bookglow Master Build Directive.pdf` | Phase execution contract |

---

## 4. Complete route map (live)

### Customer site — `apps/customer-site/index.tsx` (`BrowserRouter`)

| Route | Source | Access |
|-------|--------|--------|
| `/book/:bookingPath` | `apps/booking/BookingPage.tsx` | Public |
| `/book/:bookingPath/auth` | `apps/booking/BookingAuth.tsx` | Public |
| `/signup` | `apps/booking/SignUp.tsx` | Public |
| `/login` | Redirect → dashboard login URL | Redirect |
| `/loginbackend` | → `/login` | Alias |
| `/admin/*` | → `/login` | Alias |
| `*` | `App.tsx` | Marketing |

**Live booking routes confirmed:** `/book/:bookingPath` and `/book/:bookingPath/auth` only. Param name is `bookingPath`.

### Merchant portal — `apps/merchant-portal` (`HashRouter` → `#/...`)

| Route | Source | Notes |
|-------|--------|-------|
| `/login` | `pages/Login.tsx` | Auth-aware |
| `/book/:id` | `pages/Book.tsx` | Public booking mirror |
| `/buy-voucher/:slug` | `pages/BuyVoucher.tsx` | Public |
| `/redeem/:unique_id` | `pages/RedeemVoucher.tsx` | Public |
| `/dashboard` | `pages/Dashboard.tsx` | Tab: Today |
| `/pos` | `pages/POS.tsx` | |
| `/schedule` | `pages/AppointmentsCalendar.tsx` | Primary schedule |
| `/appointments` | Redirect → `/schedule` | Alias |
| `/member` | `pages/CRM.tsx` | |
| `/member-details/:id` | `pages/MemberDetails.tsx` | |
| `/menu` | `pages/Services.tsx` | Menu & inventory |
| `/sales-reports` | `pages/SalesReports.tsx` | |
| `/transactions` | `pages/Transactions.tsx` | Admin-only |
| `/finance` | `pages/Finance.tsx` | Admin-only |
| `/marketing` | `pages/Marketing.tsx` | Admin-only |
| `/staff` | `pages/Staff.tsx` | Admin-only |
| `/settings` | `pages/Settings.tsx` | Admin-only |
| `/settings/integrations` | `pages/ExternalIntegrations.tsx` | |
| `/admin/dashboard` | `pages/SuperAdminDashboard.tsx` | Super-owner |
| `/admin/subscribers` | `pages/SuperAdminSubscribers.tsx` | Super-owner |

**Unrouted page files (do not invent routes in Phases 1–5):**

- `pages/ReportPage.tsx` (nav id `report` exists; falls back to Dashboard)
- `pages/ApiIntegrationManagement.tsx`
- `pages/MemberProfile.tsx` (empty)

---

## 5. Page-to-source map (merchant operational pages)

| Phase target | Route | File | ~Lines |
|--------------|-------|------|--------|
| Phase 2 | `/schedule` | `AppointmentsCalendar.tsx` | 1052 |
| Phase 3 | `/menu` | `Services.tsx` | 1646 |
| Phase 4 | `/settings` | `Settings.tsx` | 1053 |
| Phase 5 | `/staff` | `Staff.tsx` | 1010 |
| — | `/dashboard` | `Dashboard.tsx` | 745 |
| — | `/pos` | `POS.tsx` | 993 |
| — | `/member` | `CRM.tsx` | 1510 |
| — | `/transactions` | `Transactions.tsx` | 771 |
| — | `/finance` | `Finance.tsx` | 352 |
| — | `/sales-reports` | `SalesReports.tsx` | 484 |
| — | `/marketing` | `Marketing.tsx` | 317 |
| — | `/login` | `Login.tsx` | 116 |

Customer booking (already redesigned in place; preserve in Phases 1–5):

| Route | File |
|-------|------|
| `/book/:bookingPath` | `BookingPage.tsx` |
| `/book/:bookingPath/auth` | `BookingAuth.tsx` |
| `/signup` | `SignUp.tsx` |

---

## 6. Role and permission map

| Role | Source | Allowed destinations |
|------|--------|----------------------|
| `admin` | `users/{uid}.role` via `UserContext` | All nav groups: Workday, Customers, Business, Workspace |
| `cashier` | same (`staff` legacy → cashier) | Nav: POS, Members, Menu, Sales Reports. Mobile same four. |
| Super-owner email | `App.tsx` hard-coded | SuperAdmin shell; no outlet |

**Admin-only tabs (cashiers redirected to `/pos`):**  
`dashboard`, `transactions`, `finance`, `staff`, `settings`, `marketing`

**Gap (do not “fix” unless a later phase explicitly asks):** `/schedule` is reachable by URL for cashiers though hidden from nav.

**Outlet feature locks (settings-driven):**  
`delete-transaction`, `edit-service`, `manage-staff`, `export-crm`, `finance-view`

Phases 1–5 must **not** change role filters, redirects, or lock semantics.

---

## 7. Shared-style inventory

### Merchant — `apps/merchant-portal/index.css` + `tailwind.config.js`

**Present tokens:** `--bg-canvas/surface/soft/selection`, `--text-primary/secondary/muted`, `--line(+strong)`, `--brand(+hover/deep/soft)`, `--success/warning/danger`, `--shadow-xs/sm/md`, `--radius-sm/md/lg`

**Gaps vs Phase 1 directive:** no explicit 4px spacing scale, safe-area tokens, focus-ring token on merchant `:root` (customer has `--focus-ring`), incomplete reduced-motion policy, login CSS references undefined aliases (`--ink`, `--paper`, `--bg-page`, etc.)

**Class families:** `bookglow-app-shell`, `bookglow-sidebar*`, `bookglow-nav-*`, `bookglow-workspace`, `bookglow-page`, `bookglow-mobile-*`, `bookglow-more-*`, `bookglow-login*`

**Tailwind:** `teal` remapped to Bookglow purple; font sizes `app-page`, `app-section`, `app-body`, `app-label`

### Customer — `apps/customer-site/src/styles/`

| File | Role |
|------|------|
| `tokens.css` | Full token set + semantic aliases + `--focus-ring` |
| `reset.css` | Base |
| `utilities.css` | Booking / auth / landing compositions |
| `global.css` | Tailwind + layer imports |

---

## 8. Existing component inventory

### Merchant `components/`

| File | Primitive? | Notes |
|------|------------|-------|
| `Layout.tsx` | Shell | Keep; Phase 1 may extend tokens only |
| `SuperAdminLayout.tsx` | Shell | Out of Phases 2–5 |
| `ProtectedRoute.tsx` | Auth gate | Untouched |
| `ErrorBoundary.tsx` | Infra | Untouched |
| `Toast.tsx` | Near-primitive | Present; currently unused by imports |
| `ReceiptTemplate.tsx` | Domain | Not a Phase 1 primitive |
| `TransactionDetailModal.tsx` | Domain modal | |
| `CreditWalletModal.tsx` | Domain modal | |
| `PointsHistoryModal.tsx` | Domain modal | |
| `OutstandingHistoryModal.tsx` | Domain modal | |

**Missing Phase 1 primitives (merchant):** PageHeader, SectionHeader, FilterToolbar, DenseEntityRow, Button, IconButton, Field, SelectField, StatusBadge, Alert, EmptyState, ErrorState, LoadingSkeleton, SaveStatus, Sheet, Modal, ConfirmationDialog, StickyActionBar

### Customer `components/`

| File | Notes |
|------|-------|
| `Button.tsx` | Marketing CTA; uses `PRIMARY_GREEN` constant — audit before reuse |
| `FloatingScreens.tsx` | Landing decoration |

---

## 9. Large pages needing presentational decomposition

| Priority | Page | ~Lines | Phase |
|----------|------|--------|-------|
| P0 | `Services.tsx` | 1646 | 3 |
| P0 | `CRM.tsx` | 1510 | later |
| P0 | `Settings.tsx` | 1053 | 4 |
| P0 | `AppointmentsCalendar.tsx` | 1052 | 2 |
| P0 | `Staff.tsx` | 1010 | 5 |
| P1 | `POS.tsx` | 993 | later |
| P1 | `Transactions.tsx` | 771 | later |
| P1 | `MemberDetails.tsx` | 747 | later |
| P1 | `Dashboard.tsx` | 745 | later |

Rule: keep Firestore / save / delete / calendar math inside the page (or existing services); extract **presentational** children only.

---

## 10. Build and type-check baseline (2026-07-15)

| Check | Result |
|-------|--------|
| `npm run build` (merchant + customer) | **PASS** |
| Customer `tsc --noEmit` | **PASS** (0 errors) |
| Merchant `tsc --noEmit` | **FAIL** — **23** existing `error TS` (legacy areas) |

Merchant errors align with `docs/KNOWN_EXISTING_TYPECHECK_ISSUES.md` (`AppointmentsCalendar`, `Marketing`, `ReportPage`, `SalesReports`, `setmoreSyncService`, `useFirestoreData`, etc.).  
**Do not expand this debt in Phases 1–5.** Production Vite build remains the release gate.

---

## 11. Locked confirmations

| Gate | Status |
|------|--------|
| Live booking routes `/book/:bookingPath` (+ `/auth`) | Confirmed |
| No new V2 route or V2 source folder | Confirmed policy |
| Firebase Authentication untouched | Confirmed — Phase 0 and subsequent UI phases |
| Firestore schema / subscriptions / rules untouched | Confirmed — Phase 0 and subsequent UI phases |
| No production code edited in Phase 0 | Confirmed |

---

## 12. Volume VI — recommended file-by-file implementation plan

Follow Volume VI order: verify → tokens/shell → presentational retrofit in place → clean builds. One phase per execution.

### Phase 1 — Shared design foundation

| Order | File / area | Action |
|------:|-------------|--------|
| 1 | Audit `index.css`, `tokens.css`, `tailwind.config.js`, existing `Toast` / customer `Button` | Reuse before creating |
| 2 | `apps/merchant-portal/index.css` | Complete semantic colour, type, 4px spacing, radius, border, elevation, focus-ring, safe-area, reduced-motion |
| 3 | `apps/merchant-portal/tailwind.config.js` | Align theme to tokens; no global class remaps that hide UI |
| 4 | `apps/customer-site/src/styles/tokens.css` (+ reset/utilities if needed) | Align gaps with merchant; preserve booking utilities |
| 5 | `apps/merchant-portal/components/ui/*` (new) | Add missing presentational primitives only; no Firestore, no business state |
| 6 | Smoke: `Layout`, `Login`, `BookingPage`, `BookingAuth` | Visual only; no handler changes |
| 7 | `npm run build` | Must pass |

### Phase 2 — Schedule

| Order | File | Action |
|------:|------|--------|
| 1 | Inspect `AppointmentsCalendar.tsx`, related hooks/services | Read-only audit |
| 2 | `components/schedule/*` presentational extracts | Header, toolbar, date strip, list/card, detail panel, empty/loading |
| 3 | `pages/AppointmentsCalendar.tsx` | Wire presentation only; preserve all appointment logic |
| 4 | Verify 360 / 375 / 768 / 1280 | Desktop + mobile layouts per directive |
| 5 | `npm run build` | Must pass |

### Phase 3 — Menu & Inventory

| Order | File | Action |
|------:|------|--------|
| 1 | Inspect `Services.tsx` + storage/upload paths | Read-only audit |
| 2 | `components/inventory/*` | Tabs, toolbar, entity row/card, edit panel, save bar, empty |
| 3 | `pages/Services.tsx` | Presentation only; preserve CRUD, DnD, locks |
| 4 | Behavioral parity check | |
| 5 | `npm run build` | Must pass |

### Phase 4 — Settings

| Order | File | Action |
|------:|------|--------|
| 1 | Inspect `Settings.tsx` field names / save handlers | Inventory sections 1–8 |
| 2 | `components/settings/*` | Nav, section, OperatingHoursRow, save bar/status, mobile accordion |
| 3 | `pages/Settings.tsx` | Reorganise presentation; **do not rename Firestore fields or localStorage keys** |
| 4 | Verify save states + operating-hours one-line row | |
| 5 | `npm run build` | Must pass |

### Phase 5 — Staff & Team

| Order | File | Action |
|------:|------|--------|
| 1 | Inspect `Staff.tsx` | Read-only audit |
| 2 | `components/staff/*` | Roster, card, editor sections, save bar |
| 3 | `pages/Staff.tsx` | Presentation only; preserve photos, permissions, commissions |
| 4 | Verify sticky save + delete confirmation presentation | |
| 5 | `npm run build` | Must pass |

### Explicit non-goals through Phase 5

- No Firebase Auth / Firestore rules / index / schema edits  
- No booking API or appointment math changes  
- No new routes; no `/book-v2`; no Supabase cutover  
- No fixing the 23 merchant `tsc` errors unless they block a phase build  
- No POS / CRM / Finance redesign in these phases  

---

## Next execution

**Start Phase 1 — Shared Design Foundation** in a new agent turn only after this baseline is accepted.
