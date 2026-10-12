# BookGlow UI audit (Phase 0)

**Scope:** `apps/merchant-portal` only.  
**Date:** 2026-10-12  
**Status:** Phase 0–5 complete. V5 primitives are in use on operational and management pages. Phase 5 QA lives in `test/visual/merchant-v5-qa.spec.ts` (viewport matrix, overflow, duplicate header, 44px hit).  
**Proposed next system name:** BookGlow UX System V5 (documentation + primitive consolidation on the existing v4 density tokens — not a new palette or token family).

---

## 1. Existing design-system files

| File | Role |
|------|------|
| `design-system/bookglow/MASTER.md` | Brand identity (`#7656d6` / `#6244bd` / rose logo only), Inter, Lucide, no product dark mode |
| `design-system/bookglow/tokens.md` | Primitive → semantic tokens |
| `design-system/bookglow/components.md` | Shared component specs |
| `design-system/bookglow/pages/merchant-portal.md` | Operational density, shell, reuse list |
| `design-system/bookglow/pages/phone-patterns.md` | List row 56–64px, sheet footer, sticky CTA |
| `design-system/bookglow/pages/pos.md` | POS phone/tablet/desktop |
| `design-system/bookglow/pages/schedule.md` | Calendar benchmark |
| `design-system/bookglow/pages/dashboard.md` | Today KPIs |
| `design-system/bookglow/pages/menu.md` | OverlayTabs / inventory |
| `design-system/bookglow/pages/responsive.md` | Drawers, forms, tables |
| `design-system/bookglow/pages/android-webview.md` | Safe area / WebView |
| `apps/merchant-portal/styles/density-system.css` | compact / medium / comfortable (`--density-version: v4`) |
| `apps/merchant-portal/styles/mobile-tokens.css` | Phone component tokens (`.m-list-row`, POS, inventory, staff, sheets) |
| `apps/merchant-portal/styles/responsive-system.css` | Overlay/drawer/container queries |
| `apps/merchant-portal/styles/hours-row.css` | Operating-hours one-row grid |
| `apps/merchant-portal/styles/fonts.css` | Inter |
| `apps/merchant-portal/index.css` | Shell (`.bookglow-app-shell`, sidebar, mobile header/nav, More sheet) |

**Do not add a second token system.** V5 should normalize these files and add missing primitives.

Density already matches the requested modes:

| Mode | Width | Title / body / control |
|------|-------|------------------------|
| compact | 0–599 | 20 / 14 / 40 visual; `--touch-min: 48px` |
| medium | 600–1023 | 22 / 14 / 44 |
| comfortable | 1024+ | 24 / 14 / 40 |

Shell chrome: bottom nav until **1024**. POS catalogue split uses **720 / 1200**, not `lg`.

---

## 2. Existing shared primitives

From `components/ui/`:

`Button`, `IconButton`, `PageHeader`, `SectionHeader`, `FilterToolbar`, `DenseEntityRow`, `Field`, `SelectField`, `StatusBadge`, `Alert`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `SaveStatus`, `AppModal`, `AppSheet`, `AppDrawer`, `OverlayTabs`, `BooleanSettingRow`, `FormGrid`, `FormSection`, `ScrollTable`, `StickyActionBar`, `ConfirmationDialog`, `NetworkStatusBanner`, plus MobileShell aliases (`MobilePageShell`, `MobileHeader`, `MobileFilterSheet`, `BottomActionBar`, `SafeAreaSpacer`).

Page-specific headers (not one primitive):

`StaffPageHeader`, `MemberPageHeader`, `InventoryPageHeader`, `POSPageHeader`, `SchedulePageHeader`, `SettingsPageHeader`, `ReportPageHeader`, `TodayHeader`, `PlatformPageHeader`.

Specialized rows/cards already on `.m-list-row`: POS catalogue, `InventoryEntityCard`, `MemberRow`, `StaffCard`, `ReportTxnCard`, `ScheduleBookingCard`, `AttentionList`, `UpcomingAppointments`.

**Missing (needed for V5, do not invent duplicates):**

- `MobilePageActions` — primary + optional secondary + overflow (Staff’s `flex-1` pair is the proof)
- Compact `MetricRail` / `MetricGrid` for phone KPIs
- Shared `FilterChipRow` (horizontal, no wrap) vs `OverlayTabs`
- Overflow menu primitive (`IconButton` + sheet/menu)
- Settings **link row** (native-settings, not accordion card by default)

---

## 3. Compliance snapshot

### Already close (use as benchmarks)

| Page | Why |
|------|-----|
| **Schedule** | Shell header hidden; no duplicate H1; compact date strip; FAB above nav; restrained booking cards; `AppSheet` details. Internal quality benchmark. |
| **POS** | Phone list rows 56–64px; tablet two-pane; sticky cart; payment CTA in `.m-sheet-footer`. Documented exception: tablet tiles, desktop list at 1200. |
| **Menu / Inventory** | `FilterToolbar` + icon filters/sort; `InventoryEntityCard` list rows; `OverlayTabs` for Services/Products/Packages. |
| **Members list** | `FilterToolbar` + sheet; `MemberRow` compact. Header duplication is the remaining issue. |

### Partially compliant

| Page | Gap |
|------|-----|
| Today / Dashboard | Compact appointments/attention; KPI tiles still 2×2 cards; extra mobile chrome (date + New Booking). |
| Sales History | `ReportTxnCard` / `MobileTransactionHistory` densified; `ReportPageHeader` still shows title/description on phone (`m-page-header--app-owned` hides title but descriptions/actions can remain). |
| Finance | Dedicated mobile overview; still a separate composition from Sales History. |
| Settings | Hours row is compact; sections are still large accordion **cards** with helper paragraphs; sticky save exists. |
| Reports | Shared header/strip; desktop-first detail pane. |

### Major design drift (Phase 3/4)

| Page | Drift |
|------|-------|
| **Staff** | Two `flex-1` `size="md"` hero buttons; 5 full-width KPI cards on phone (`grid-cols-1`); search plus **two** chip rows; list starts too low. `StaffCard` is already a list row. |
| Members header | Local `PageHeader` + description + count while shell already shows outlet + “Members · N”. |
| Menu header | Local title + long description on phone. |
| Marketing | Mixed campaign/audience/voucher cards; some `fullWidth` CTAs; editor is custom. |
| Integrations / Google Reviews | Stacked `fullWidth` buttons; form-like cards. |
| Superadmin | Separate shell; darker sidebar allowed; not in merchant density rollout. |
| Member details | Remaining `text-slate-*` / `bg-pink-*` / `bg-amber-*` utility colors. |

---

## 4. Page audit table

| Page | Phone | Tablet (600–1023) | Desktop (1024+) | Type | Spacing | Actions | Cards/lists | Nav | Shared primitives? | Hardcoded? | Migration |
|------|-------|-------------------|-----------------|------|---------|---------|-------------|-----|--------------------|------------|-----------|
| Today | Shell title + local date/CTA; 2×2 KPIs; list rows | Same chrome until 1024 | Sidebar + utility bar; 4-up KPIs | Mix of `ui-page-title` and dashboard classes | Tightened below `lg` | New Booking local | KPI cards + list rows | Shell | Partial (`TodayHeader`, `AttentionList`) | Some dashboard-specific CSS | Phase 4: MetricGrid; hide duplicate greeting |
| Schedule | Own chrome (shell header off); date strip; FAB | Calendar width-adaptive | Full-bleed grid + staff columns | Strong | Compact | FAB / New Booking desktop | Booking cards (exception) | Shell + FAB | Yes | Few `text-[Npx]` in calendar | **Benchmark.** Tokenize exceptions only |
| POS | Compact catalogue + sticky cart | Two-pane 720–1199 | List + 360 rail from 1200 | Documented | Compact | 44px add; checkout LG OK | List on phone; tiles on tablet | Shell | Yes | POS-specific tokens (allowed) | Phase 3: keep; align header with `MobilePageActions` if any leftover |
| Members | Duplicate H1/description; search+filter icon; list rows | Search + desktop actions | Table/split | Header 15px vs shell | OK | Add in toolbar/sheet | `MemberRow` | Shell | Header + toolbar yes | Few | Phase 3: `app-owned` header; `MobilePageActions` for Add |
| Staff | **Hero dual buttons**; 5 stacked KPIs; 2 chip rows | 2-col KPIs from `sm` | 5-col KPIs; list/detail `xl` | Description only desktop | `space-y-4` before list | `flex-1` md buttons | `StaffCard` OK; KPIs are cards | Shell | Header exists but wrong mobile pattern | `bg-amber-50` on one KPI | **Phase 3 first proof:** `MobilePageActions` + MetricRail |
| Menu | Duplicate header; good search/filter | Same | Tables + editor drawer | Description paragraph | `space-y-3` toolbar | Primary in header | List cards | Shell | Yes | Low | Phase 3: hide title on phone |
| Sales History | Header+description; txn rows | Mixed | Table | Arbitrary `text-[13px]` in mobile history | OK | Edit/delete 44px | List | Shell | Partial | `text-[11px]`/`[13px]` | Phase 3: app-owned header; semantic type |
| Sales Reports | Report header; filters | Mixed | Charts + table | OK | Filter chrome | Export etc. | Summary strip + table | Shell | Report primitives | Medium | Phase 4 |
| Finance | Custom mobile overview | Custom | Ledger | `text-[Npx]` in overview | Large empty/lock states | Add expense | Mix | Shell | Weak vs Reports | Medium | Phase 4: MetricRail + list |
| Marketing | Search + voucher/campaign cards | Grid | Grid | Mixed | `p-3`–`p-5` | Some fullWidth | Cards not all lists | Shell | Partial after list-row pass | Medium | Phase 4: list vs card rule |
| Settings | Accordion cards + helper copy | Accordion | 2-col nav+content | Labels OK; long hints | Section padding 16–20 | Sticky save | Cards not rows | Shell | `SettingsSection`, hours row | Low color drift | Phase 4: settings **rows** |
| Integrations | PageHeader hidden md; stacked buttons | Same | Cards | OK | Generous | Many `fullWidth` | Cards | Shell | Weak | High | Phase 4 |
| Report | Shared header | Split | Split | OK | OK | Filters | Txn cards | Shell | Yes | Low | Phase 4 polish |
| Member details | Local back chrome | Mixed | Mixed | Slate/pink utilities | Variable | Sheets | History rows improved | Shell + local | Partial | **High** (`text-slate-*`) | Phase 4 color + row |
| More sheet | 2-col icon grid | Same | Sidebar | Title 16 | Uniform links | 44px+ hits | Tiles | Shell | Layout-only | Low | Phase 2: share nav source |
| Superadmin | Own layout | Own | Dark sidebar OK | Own | Own | Own | Tables | Own | Platform primitives | Medium | Out of merchant V5 unless listed |

---

## 5. Typography / spacing / action problems (cross-cutting)

**Typography**

- Semantic classes exist (`ui-page-title`, `m-list-title`, `m-body`, `m-caption`) but many files use `text-[11px]`–`text-[17px]`.
- `PageHeader` default `titleSize="page"` is 26px on phone in comments vs density 20px — compact modifier is inconsistent.
- Shell title (~15px) vs local H1 (20–26px) when both show.

**Spacing**

- Scale 4/8/12/16/20/24/32 exists; Staff uses `space-y-4` plus KPI `gap-2` plus two chip rows.
- Settings accordion body `px-4 py-4 sm:px-5 sm:py-5` before any field.

**Actions**

- `Button` sizes: sm 32px / md 40px / lg 48px. Staff phone uses **md + flex-1**, so two 40px-tall full-width buttons.
- Visual size is coupled to height (`h-10`); no “compact visual / 44px hit” padding trick yet — this is the Fresha-density gap.
- `fullWidth` used correctly for sheet Apply/checkout; overused on Integrations and some Marketing.

**Cards vs lists**

- Directory pages still wrap KPIs as full cards.
- Settings = accordion cards, not iOS-style rows.
- Staff/Members lists are already rows.

**Navigation**

- Shell owns mobile title except Schedule (intentional).
- Members/Menu/Sales History still paint a second title block.
- Bottom nav: Today / Schedule / POS / Members + More (admin). More sheet is structurally fine.

---

## 6. Hardcoded styling (report of remaining violations)

| Kind | Examples | Risk |
|------|----------|------|
| Tailwind palette vs tokens | `MemberDetails` `text-slate-*`, `bg-pink-100`, `bg-amber-*`; `StaffSummaryCards` `bg-amber-50 text-amber-500`; `MemberRow` highlight amber | Medium — looks off-brand |
| Arbitrary type | POS, Finance overview, MobileTransactionHistory, AppointmentsCalendar | Medium — density drift |
| Per-page inputs | Staff search `min-h-[44px]`; members `m-member-search`; inventory own class | Medium |
| Per-page headers | 9 `*PageHeader` files | High — duplicate titles/actions |
| Dual hero buttons | Only `StaffPageHeader` `flex-1` pair | High — stated bug |
| Stacked phone KPIs | `StaffSummaryCards` `grid-cols-1` | High |
| Helper paragraphs | Staff desktop description; Settings booking/hours copy; Inventory header description | Medium |
| Dual chip rows | Staff role + status on phone | High (vertical cost) |

---

## 7. Schedule principles to extract (not copy layout)

1. Shell or page owns **one** title, never both.
2. Primary create action is compact (FAB or single button), not a 50/50 pair.
3. Filters are contextual (date strip), not two stacked chip groups plus search.
4. Content uses the first screen: calendar, not five KPI cards.
5. Detail in sheet/drawer; list/calendar stays dense.
6. Touch ≥44px without making the control look 48px tall.
7. Safe-area + sticky/FAB clear the tab bar.

---

## 8. Proposed shared primitives (Phase 1)

| Primitive | Purpose | First consumer |
|-----------|---------|----------------|
| `MobilePageActions` | primary + optional secondary + overflow; compact visual height; min 44px hit; **no** `flex-1` heroes | Staff |
| `MetricRail` / `MetricGrid` | phone 2-col or horizontal rail; tablet+ richer | Staff, then Today/Finance |
| `FilterChipRow` | one horizontal scroller; hide scrollbar; brand active | Staff roles; Members sort |
| Overflow: reuse `IconButton` + `AppSheet` | Roles / permissions | Staff |
| Settings row (later Phase 4) | 56–68px link row | Settings |

`Button`: keep sm/md/lg; document visual vs hit; add optional `hit="comfortable"` or CSS padding so sm stays visually 36–40px inside 44px.

---

## 9. Phase 1 file list (after approval only)

Do **not** edit these until Phase 0 is approved:

1. `apps/merchant-portal/docs/BOOKGLOW_UI_SYSTEM.md` *(create — V5 source of truth)*
2. `apps/merchant-portal/styles/density-system.css` — bump `--density-version` to v5; clarify visual vs `--touch-min`
3. `apps/merchant-portal/styles/mobile-tokens.css` — page-actions, metric-rail, chip-row tokens
4. `apps/merchant-portal/styles/responsive-system.css` — only if overlay/action needs it
5. `components/ui/Button.tsx` (+ tests)
6. `components/ui/PageHeader.tsx` — default phone compact; `app-owned` as default on mobile
7. `components/ui/MobileShell.tsx` — export new primitives
8. `components/ui/MobilePageActions.tsx` *(new)*
9. `components/ui/MetricRail.tsx` or `MetricGrid.tsx` *(new)*
10. `components/ui/FilterChipRow.tsx` *(new, or CSS + FilterToolbar chips slot)*
11. `components/ui/index.ts`
12. `components/ui/IconButton.tsx` — if overflow trigger needs a standard size
13. Tests: `Button.test.tsx`, `SharedMobilePrimitives.test.tsx`, new primitive tests
14. `design-system/bookglow/pages/merchant-portal.md` + `phone-patterns.md` pointers to V5 doc

**Not in Phase 1:** Staff.tsx layout migration (that is Phase 3, immediately after primitives exist, as the proof).

---

## 10. Regression risk

| Area | Risk | Mitigation |
|------|------|------------|
| Button height change | POS checkout / sheets looking short | Keep `lg` for checkout; Staff uses `sm`/`md` compact |
| PageHeader `app-owned` default | Hidden titles where shell is off (Schedule already custom) | Schedule keeps exception |
| Touch target 44 vs visual 40 | Failures in Playwright min-height asserts | Assert hit box, not border-box of glyph |
| MetricRail | Staff KPI copy/hints truncated | Keep values; move hints to detail |
| Auth visual snapshots | `merchant-pages.spec.ts` pixel diffs | Update after each phase, not in Phase 0 |
| Android WebView | Safe-area / `100dvh` | Existing android-webview.md; APK check after Phase 3 Staff |

**Do not touch:** auth, POS maths, schedule slot logic, commissions, RLS, APIs.

---

## 11. Test plan (Phase 5)

Harness specs run in the Playwright `layout-harness` project (no auth). Auth screenshot matrix remains `merchant-pages.spec.ts`.

| Requested | Coverage |
|-----------|----------|
| 390×844 | `merchant-v5-qa.spec.ts`, density, mobile-ux, finance |
| 375×667 | `merchant-v5-qa.spec.ts` |
| 412×915 | `merchant-v5-qa.spec.ts`, density |
| 768×1024 | `merchant-v5-qa.spec.ts`, density, tablet-768 (auth) |
| 820×1180 | `merchant-v5-qa.spec.ts` (overflow); POS layout still owns POS split |
| 1366×768 | `merchant-v5-qa.spec.ts` |
| 1440×900 | `merchant-v5-qa.spec.ts` desktop utility |
| Finance | `finance.spec.ts` + v5 QA finance harness (not live `/finance`) |
| Overflow / duplicate-header / 44px hit | `merchant-v5-qa.spec.ts` on staff, settings, POS, finance |

**Kept exceptions (do not “fix” without a new phase):** Today KPI 2×2 cards (`.dashboard-kpi-value` visual tests), Settings accordion structure, Menu phone FAB, Superadmin shell.

Phase 1: unit tests for primitives.  
Phase 3 Staff: 390×844 — first row in view, no `flex-1` heroes, KPI rail height cap.

---

## 12. Staff proof (queued for Phase 3, not now)

Current (`StaffPageHeader.tsx`):

```tsx
<div className="md:hidden flex gap-2">
  <Button … size="md" className="flex-1">Roles</Button>
  <Button … size="md" className="flex-1">Add Staff</Button>
</div>
```

Target via `MobilePageActions` (choose at Phase 3 with the primitive API):

- Preferred: `[+ Add Staff] [⋯]` with Roles in overflow, **or**
- `[Roles] [+ Add Staff]` compact, content-width, visual ~36–40px, hit ≥44px.

`StaffSummaryCards`: phone `grid-cols-1` → MetricRail or 2-col grid.  
Status chips → Filter sheet; keep one role chip row.  
First `StaffCard` visible much higher on 390×844.

---

## Stop

Phase 0 complete. **No Phase 1 file edits until approval.**
