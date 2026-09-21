# Merchant portal — responsive overlays

> ⚠️ **IMPORTANT:** Rules in this file **override** `pages/merchant-portal.md` for drawer, tab, form, and table layout.

**App:** `apps/merchant-portal`  
**Canonical CSS:** `styles/responsive-system.css`  
**Do not** replace POS / Schedule / Dashboard page structure with the Menu editor layout.

## Overlays

- Complex edit forms use `<AppDrawer variant="right" size="editor" />` (`InventoryEditPanel`)
- Phone: full screen. Tablet: near-full width. Desktop: 42rem rail
- Default `size="md"` stays 32rem for simple detail rails
- Tabs: `OverlayTabs` — nowrap, 44px, horizontal scroll, arrow keys
- Field pairs: `FormGrid`, never viewport `md:grid-cols-2` inside a drawer

## Tables

Use `ScrollTable` for dense desktop/tablet tables. Keep phone entity cards.

## Shell

Sidebar still starts at `lg` 1024. Tokenized `--page-pad-*` applies to `.bookglow-content-frame`. Named container: `page`.
