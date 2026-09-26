# Merchant Portal

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/bookglow/MASTER.md`).

**App:** `apps/merchant-portal`  
**Density:** 7–8 (dashboard / tables denser than Master)  
**Layout:** Desktop sidebar + utility bar; mobile header + bottom nav + More sheet

## Layout

- Shell classes in `index.css` (`.bookglow-app-shell`, `.bookglow-sidebar`, `.bookglow-mobile-nav`) stay the composition model
- `lg` (1024px) switches from bottom nav to sidebar
- Overlay editors follow `pages/responsive.md` (not a 420px rail at tablet)
- Schedule is full-bleed (`bookglow-content-frame--schedule`); other pages use the content frame
- Mobile page titles are owned by the app header when `.m-page-header--app-owned` is set
- Keep outlet/role context in the sidebar; do not move tenant switching into page bodies

## Density and type

- Phone compact: page title **20px**, body **14px**, section **16px**, labels **11–12px** (`styles/density-system.css`)
- Tablet medium: page title 22px, controls 44px
- Desktop: page title 24px, body 14px
- Card padding 12px phone / 16px tablet+
- List rows ~56–64px on phone
- Header 48px phone / 52px tablet (plus `--safe-top`)
- Bottom nav **56px inner** on phone; safe-area is extra padding, not part of the token
- Do not use marketing 32px+ heroes on operational pages
- Do not use `zoom` or page-level `transform: scale()`

## Components to reuse

`Button`, `IconButton`, `PageHeader`, `SectionHeader`, `FilterToolbar`, `DenseEntityRow`, `Field`, `SelectField`, `StatusBadge`, `Alert`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `AppModal`, `AppSheet`, `AppDrawer`, `OverlayTabs`, `FormGrid`, `ScrollTable`, `StickyActionBar`, `ConfirmationDialog`, `NetworkStatusBanner`

Page-specific cards (inventory, POS, members, staff) already follow `.m-*` mobile tokens — extend those classes instead of new one-off CSS.

## Colour

Same Master brand. Success green is for money, stock, and confirmed appointments — not for primary buttons.

## Android

Also read `pages/android-webview.md`. Safe-area, 44px targets, and sticky-action offsets are required on every operational page.

## Do not

- Change route handlers, auth, or Firestore/Supabase calls while applying visuals
- Add a second sidebar pattern
- Use customer-site `PRIMARY_GREEN` or marketing `Button.tsx`
