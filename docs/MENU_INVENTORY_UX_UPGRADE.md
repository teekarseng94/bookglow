# Menu & Inventory UX upgrade

Date: 2026-09-27  
App: Merchant Portal Menu (`/menu`, `pages/Services.tsx`)  
Android: same BookGlow Mobile UI as Chrome F12. No Play upload in this pass.

## 1. Existing category architecture

Menu categories are **plain strings**, not enums and not a lookup table.

| Layer | Store |
| --- | --- |
| Outlet | `outlets.service_categories` JSONB via `outletService.getServiceCategories` / `updateServiceCategories` |
| Service / product / package rows | `category` (services also copy `categoryId`) |
| Tenant | Outlet ID from the signed-in merchant |

Phase 3 already had add / rename / delete / reorder. Rename already rewrote item `category` values. Delete only removed the name from the outlet list and left items untouched.

No schema migration is required.

## 2. Root cause of the Massage default

Two frontend shortcuts stacked:

1. `useFirestoreData` injected `DEFAULT_SERVICE_CATEGORIES = ['Massage', 'Facial', 'Nails', 'Aromatherapy', 'Packages']` whenever the outlet list was empty.
2. Add Service / Product / Package set `category: categories[0]`.

A nail salon with no saved categories therefore saw **Massage** pre-selected. Existing merchant strings in the database were never overwritten.

## 3. Category management architecture

Still outlet-scoped string lists.

New UI:

- `CategorySelect` in Add/Edit Service, Product, and Package
- `AddCategoryDialog` from the selector (keeps unsaved editor state)
- `CategoryManagerModal` from Menu (phone Tags icon, desktop Categories)

Merchants are not seeded with Hair / Nail / Massage examples.

## 4. Schema changes

None. No production migration to run.

Backfill: none. Existing `service_categories` and item `category` values stay as stored.

## 5. Tenant / outlet scoping

Reads and writes go through `outletID` already used by `outletService.updateServiceCategories` and `*.updateCategoryName`. Categories are not global BookGlow lists.

## 6. UI UX Pro Max findings applied

Searches run via the skill CLI (`ux`, `web`, `html-tailwind`, `react`):

| Guidance | Applied |
| --- | --- |
| Label form controls (`htmlFor` / `id`); no placeholder-as-label | Category, price, duration, commission, redeem |
| Compact controls need role + name + selected/pressed | `OverlayTabs` + `aria-selected`; redeem `role="switch"` |
| Keyboard focus visible in dialogs | Existing `useDialogInteraction`; add-category modal `z-[110]` above the editor |
| Failed submit: inline error, not toast-only | Category required error on Details |
| Equal-width segments instead of content-hug left bias | `OverlayTabs layout="equal"` |
| One checkbox, associated label — not a card for a boolean | `BooleanSettingRow` |
| Touch spacing / safe footer | Shared editor footer tokens; equal Cancel / Save |

Rejected from the skill: Phosphor icons, spa-pink palette, Lora/Raleway (BookGlow identity rules).

## 7. Services / Products / Packages redesign

The control was left-weighted because tabs used `flex: 0 0 auto` / `min-width: max-content` (content width + leftover empty space).

Now `InventoryTypeTabs` uses equal grid columns and brand-filled selected state, matching the Members `Recent | New | Birthday | Name` structure via the **same** `OverlayTabs` primitive (CRM sort tabs migrated too).

## 8. Editor tab redesign

`Details | Pricing | Availability | Media` uses `layout="equal"` underline tabs so all four share the drawer width. Phone uses caption-sized labels.

## 9. Details tab

Tighter stack, labelled controls, compact textarea (`--editor-textarea-min-height` 4.5rem on phone), `CategorySelect` with placeholder.

## 10–12. Pricing / Commission / Redeem

- **Price (RM)** — see currency
- **Commission eligible** is one checkbox row
- Redeem stays a switch; Item Point Value shows only when on

Loyalty and commission **calculations are unchanged**.

## 13. Currency finding

BookGlow merchant UI is Malaysian Ringgit (`RM` / `en-MY` / `MYR`) on receipts, POS, dashboard, reports, and package editors. `PRICE ($)` was leftover copy in the service/product editor only. There is no per-merchant currency config. Fields and catalog amounts on this page now say **RM**. Superadmin Stripe amounts remain ISO currency codes.

## 14. Responsive testing

Playwright editor parity: 375 / 390 / 412 / 427. Vitest covers helpers, selector, boolean row, OverlayTabs equal layout, and Menu add/edit/filter. Typecheck + Vite build run after implementation. Manual matrix 320–1440 is listed for device QA.

## 15. Android APK testing

Fresh debug APK after this change (`npm run android:debug:fresh`). Do not upload to Play. Physical check: Add Service category placeholder, equal tabs, compact commission row.

## 16. Files changed

- `apps/merchant-portal/src/inventory/categories.ts` (+ tests)
- `components/inventory/CategorySelect.tsx`, `AddCategoryDialog.tsx`, `CategoryManagerModal.tsx`
- `components/ui/OverlayTabs.tsx`, `BooleanSettingRow.tsx`
- `pages/Services.tsx`, `pages/CRM.tsx`, `hooks/useFirestoreData.ts`, `App.tsx`
- `styles/density-system.css`, `styles/responsive-system.css`, `styles/mobile-tokens.css`
- Visual harness + editor-parity spec
- `docs/MENU_INVENTORY_UX_UPGRADE.md`
- `design-system/bookglow/pages/menu.md`, `components.md`, `MASTER.md`, `pages/merchant-portal.md`

## 17. Test results

| Check | Result |
| --- | --- |
| Vitest (categories, CategorySelect, BooleanSettingRow, OverlayTabs, InventoryTypeTabs, Services.category) | 19 passed |
| Playwright `merchant-editor-parity` (layout-harness) | 2 passed |
| `tsc --noEmit` merchant-portal | passed |
| Production Vite build | passed |
| `npm run android:debug:fresh` | `app-debug.apk` 27 Sep 2026, 11:02 PM, 5,202,680 bytes, density v4 |

## 18. Migration / deployment

No SQL migration. No hosting deploy. No Play upload. Categories persist on next outlet `service_categories` write (add/rename/delete/reorder).

## 19. Remaining issues

- Product/package editors stay single-scroll (no Details/Pricing tabs) — field sets are smaller.
- Emoji fallback icons on service thumbnails are pre-existing.
- Physical APK confirmation still needs a human pass on a phone.

## 20. Rollback

Revert the frontend files. Outlet JSON and item category strings remain compatible with the previous UI. Do not restore `DEFAULT_SERVICE_CATEGORIES` if you want merchants to keep choosing their own lists.
