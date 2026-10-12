# BookGlow UX System V5

**App:** `apps/merchant-portal`  
**Status:** Phase 0–5 complete. QA matrix: `test/visual/merchant-v5-qa.spec.ts`. Remaining exceptions: Today KPI 2×2 cards (dashboard layout tests), Settings accordion (not flattened to iOS rows), Menu FAB (allowed create pattern), Superadmin out of merchant V5.  
**Identity:** `design-system/bookglow/MASTER.md` (page files under `design-system/bookglow/pages/` override Master).  
**Tokens:** extend `styles/density-system.css`, `styles/mobile-tokens.css`, `styles/responsive-system.css`. Do **not** add a second palette or token family.

Brand stays BookGlow purple (`#7656d6` / `#6244bd`). Rose (`#c84d78`) is logo gradient only. Inter. `lucide-react`. No shadcn, Radix, Phosphor, GSAP, or product-wide dark mode.

Fresha / Setmore / Square / Shopify / Stripe / native iOS–Android are **layout and density references only**. Do not copy their colours, assets, or wording.

---

## Goal

BookGlow should feel like one professionally designed application on every merchant page.

Schedule is the internal quality **benchmark** (compact hierarchy, one title owner, restrained cards, sticky/FAB actions, useful first screen). Do not clone the calendar onto other pages.

---

## 1. Breakpoints

| Mode | Width | Chrome | Density |
|------|-------|--------|---------|
| Phone | 0–599px | Mobile header + bottom nav | compact |
| Tablet | 600–1023px | Same mobile chrome until **1024** | medium |
| Desktop | 1024px+ | Sidebar + utility header | comfortable |

POS layout splits at **720** (tablet catalogue) and **1200** (desktop list + cart rail). Those are POS exceptions, not new shell breakpoints.

Tailwind `lg` (1024) matches the shell switch. Prefer `lg:` for “desktop chrome”, not `md:` (768), when hiding mobile page actions.

`--density-version: v5`

---

## 2. Density modes

Keep the three modes in `density-system.css`.

| Token | Phone | Tablet | Desktop |
|-------|-------|--------|---------|
| Page title | 20px | 22px | 24px |
| Section title | 16px | 17px | 16px |
| Body | 14px | 14px | 14px |
| Secondary | 13px | 14px | 14px |
| Caption / label | 12px / 11px | 12px | 12px / 11px |
| Page pad-x | 12px | 20–24px | 32px |
| Section gap | 12px | 16px | 16px |
| Control **visual** | 40px | 44px | 40px |
| Touch min | 44px | 44px | 44px |
| Bottom nav inner | 56px + safe-area | 60px + safe-area | n/a |
| Card padding | 10–12px | 16px | 16px |
| List row | 56–64px | 64px | tables |

### Visual size ≠ touch target

Do **not** paint a 48px-tall button because the hit area must be 44–48px.

- Standard control: **40px visual** (`--control-height`)
- Hit: at least `--touch-min` (44px) via expanded hit slop on `sm`/`md` buttons
- Icon can be 20px inside a 44px `IconButton`
- `lg` is the exception: major CTA may be 44–48px visual

---

## 3. Typography hierarchy

Same Inter/system stack everywhere. Prefer semantic classes, not `text-[13px]`.

| Role | Class | Phone |
|------|-------|-------|
| Shell title | `.bookglow-mobile-header__title` | 15px semibold |
| Page title (when local) | `.ui-page-title` / `.m-page-title` | 20px |
| Section | `.ui-section-title` / `.m-section-title` | 16px |
| List primary | `.m-list-title` / `.m-entity-row-title` | 14–15px semibold |
| Body | `.m-body` / `.text-app-body` | 14px |
| Secondary | `.m-secondary` / `.ui-muted` | 13px |
| Caption / label | `.m-caption` / `.m-field-label` | 12px / 11px uppercase |

---

## 4. Spacing scale

Use **4 / 8 / 12 / 16 / 20 / 24 / 32** (`--space-1` … `--space-8`). Avoid 13, 18, 22, 27 unless a documented component token requires it.

---

## 5. Page containers

Phone template:

1. App header (shell)
2. Page context / `MobilePageActions` if needed
3. Search / filter if needed
4. Content
5. Sticky action only if needed
6. Bottom nav

Use `MobilePageShell` (`m-page-with-bottom-nav` or `m-page-with-sticky-action`).

Every pixel above the primary content must justify itself. Do not stack: big H1 + description + dual hero buttons + five KPI cards + search + two filter rows.

---

## 6. Headers

The shell owns the phone/tablet title (`[Menu] Outlet / Page [Avatar]`).

- `PageHeader` defaults to `appOwned` — title/description hide below 1024; actions may remain
- Do not repeat outlet name + page name in local content
- Schedule hides the shell header on purpose; keep that exception
- Desktop: `PageHeader` title + primary action on one row

`titleSize="compact"` is only for a rare local title that must match the 15px shell. Prefer hiding the local H1.

---

## 7. Primary / secondary / overflow actions

Use `MobilePageActions` on phone/tablet (`lg:hidden` by default).

| Role | Use | Visual |
|------|-----|--------|
| Primary | Main task (Add Staff, New Booking) | `Button` `sm` or `md`, content-width |
| Secondary | Supporting (Roles, Export) | `Button` `secondary` `sm`, content-width |
| Overflow | Rare / settings | `IconButton` ⋯ → `AppSheet` |

**Never** two `flex-1` full-width hero buttons for page actions.

`fullWidth` only for: form confirm, checkout, bottom sticky CTA, destructive confirm in a sheet.

---

## 8. Search / filter

Phone: `[Search ........................] [Filter]` then one chip row. Extra sort/filter in `MobileFilterSheet`.

Do not stack several dropdowns on phone.

Tablet/desktop: search + main filters on one row (`FilterToolbar`).

---

## 9. Tabs vs chips

| | Tabs (`OverlayTabs`) | Chips (`FilterChip` / `FilterChipRow`) |
|--|----------------------|------------------------------------------|
| Job | Switch major view | Filter the current dataset |
| Examples | Services / Products / Packages | All / Lead Therapist / Active |
| Mobile | Segmented, equal or hug | One horizontal row, scroll, hide scrollbar, **never wrap** |
| Active | BookGlow purple | Brand fill / border; inactive = surface + line |

Do not style filters like primary buttons.

---

## 10. Lists

Use **list rows** when scanning many similar records: Members, Staff, sales history, transactions, settings links, simple inventory.

Target 56–72px. Primary 14–15px semibold. Secondary 12–13px. Trailing value 14px semibold. Detail belongs on the detail screen.

`.m-list-row` / `DenseEntityRow` / page `*Card` tokens that already inherit list-row.

---

## 11. Cards

Use **cards** when grouped data needs visual separation: dashboard KPI, booking block, checkout item, complex inventory, promo.

Phone card padding 10–12px. Do not wrap every directory row in a floating card.

---

## 12. Forms

| | Phone |
|--|-------|
| Field visual | 40px (`Field` / `.m-field-control`) |
| Touch | 44px+ |
| Label | 11–12px semibold |
| Body | 14px |
| Helper | 12px, only when it adds information |

Do not repeat obvious instructions (“Set your outlet’s operating hours…”). Show the data.

---

## 13–15. Modals, drawers, sheets

| Width | Pattern |
|-------|---------|
| Phone | Bottom sheet or full-screen editor (`AppSheet` `mobileMode`) |
| Tablet | Large drawer / split; not a 32rem rail |
| Desktop | Right drawer for long edit; dialog only for short tasks |

Reuse `AppSheet`, `AppDrawer`, `AppModal`, `StickyActionBar`, `OverlayTabs`. Sticky footer: `.m-sheet-footer`.

---

## 16. Sticky actions

`StickyActionBar` sits **above** bottom nav + `--safe-bottom`. One primary CTA. `lg` size allowed here (Save, Complete Sale, Confirm, Book).

---

## 17. Empty / loading / error

`EmptyState`, `LoadingSkeleton`, `ErrorState`. Compact padding on phone (`py-6`). No illustrations from other products.

---

## 18. Bottom navigation

Source of truth: `components/shell/merchantNav.ts`.

| Role | Primary tabs | More |
|------|----------------|------|
| Admin | Today / Schedule / POS / Members | remaining catalog |
| Manager | Schedule / POS / Members / Staff | remaining allowed |
| Cashier | POS / Members / Menu / Reports | none |

Inner height ~56px + safe-area (60px medium). Do not invent a second tab bar per page. The header menu button opens the same More sheet as the More tab.

---

## 19. Desktop sidebar

`.bookglow-sidebar` (grouped from the same catalog) + utility header.

Desktop utility is **outlet context**, not a second page H1:

- Eyebrow: Bookglow workspace
- Heading: outlet name + Live outlet
- User + avatar

The page owns its title via `PageHeader` / page chrome. Shared `Button` for actions.

---

## 20. Tablet

Same mobile header + bottom nav until **1024**. Medium density: header title 17px, more tiles 56px, page pad 20–24px. More sheet stays a 2-column icon+title grid (wider padding). Not a giant phone and not a squeezed desktop sidebar.

Examples: POS split from 720; Schedule calendar uses width; Staff/Members list-detail when width allows; Settings 2-column when practical.

---

## 21. Safe-area

`--safe-top` / `--safe-bottom`. Header uses `.bookglow-mobile-safe-area-top`. Sticky/FAB/nav clear the home indicator. See `design-system/bookglow/pages/android-webview.md`.

---

## 22. Accessibility

- Hit targets ≥ 44px (visual may be smaller)
- Focus: `--shadow-ui-focus-strong` / brand ring
- Do not rely on colour alone (status + text)
- `prefers-reduced-motion`
- Sheets/modals: accessible name, focus trap (existing overlay primitives)
- Contrast: body uses `--text-secondary` or darker, not disabled muted `#89818c`

---

## Colour (unchanged)

Primary BookGlow purple. Success emerald. Warning amber. Danger red/rose. Surfaces from existing `--bg-*`. No teal/blue theme.

---

## Button sizes

| Size | Role | Phone visual |
|------|------|----------------|
| `sm` | Compact page / secondary | 36px |
| `md` | Normal page / form | 40px |
| `lg` | Checkout, save, confirm, book | 44–48px |

Continue using `components/ui/Button.tsx`. Do not scatter custom button CSS.

---

## KPI / metrics

Phone: `MetricRail` `layout="grid"` (2-column) or `layout="rail"` (horizontal scroll). Concise label + value. No paragraphs. Tablet/desktop may use richer cards.

---

## More sheet

Keep the 2-column icon + title grid. Uniform height. No descriptions. Shared secondary nav in `Layout.tsx` from `merchantNav.ts`.

---

## Settings

Target native-settings **rows** (56–68px), not giant accordion cards with helper novels. Hours already use `OperatingHoursRow`. Phone hides section helper copy; section body padding is compact.

---

## Page-specific tokens

Schedule booking cards, POS tiles, inventory media, member/staff avatars may have dedicated sizes. They must inherit type, colour, radius, spacing rhythm, touch, and density.

---

## Engineering

Do not change auth, routing, payments, tenant isolation, schema, calculations, POS totals, loyalty, APIs, or queries to “standardize UI”. Refactor presentation around existing handlers.

New pages: read this file, then reuse primitives. Future visual changes should land in tokens/primitives, not in ten page files.

---

## Primitive index

| Primitive | File |
|-----------|------|
| `Button` | `components/ui/Button.tsx` |
| `IconButton` | `components/ui/IconButton.tsx` |
| `PageHeader` | `components/ui/PageHeader.tsx` |
| `MobilePageActions` | `components/ui/MobilePageActions.tsx` |
| `MetricRail` | `components/ui/MetricRail.tsx` |
| `FilterChipRow` / `FilterChip` | `components/ui/FilterChipRow.tsx` |
| `FilterToolbar` | `components/ui/FilterToolbar.tsx` |
| `MobileFilterSheet` | `components/ui/MobileShell.tsx` |
| `DenseEntityRow` | `components/ui/DenseEntityRow.tsx` |
| Overlay / sticky | `AppSheet`, `AppDrawer`, `AppModal`, `StickyActionBar` |
| Merchant nav catalog | `components/shell/merchantNav.ts` |
| More sheet | `components/shell/MerchantMoreSheet.tsx` |
