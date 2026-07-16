# Phase 3 — Menu & Inventory

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/Services.tsx`

## Locked (unchanged)

- Services / products / packages CRUD handlers
- Category add / edit / delete / reorder
- Stock, duration, price, images, icon picker
- Upload / delete image (`storageService`)
- Drag-and-drop service reorder (`handleDragEnd` + SortableContext)
- Visibility / activation fields in form
- Validation and `isLocked` gates
- Package service selector and pricing allocation math

## Presentational additions

`apps/merchant-portal/components/inventory/`

| Component | Role |
|-----------|------|
| InventoryPageHeader | Compact header + one primary create action |
| InventoryTypeTabs | Services / Products / Packages segmented control |
| InventoryToolbar | Categories, search, sort (filters separated from entity actions) |
| InventoryFiltersSheet | Mobile category filters sheet |
| InventoryEntityCard | Dense 2–3 row mobile cards |
| InventoryStatusBadge | Visible / hidden / low-stock |
| InventoryEmptyState | Empty list presentation |
| InventoryEditPanel | Consistent edit chrome |
| InventorySaveBar | Sticky/footer **Save Changes** (explicit; close does not save) |

## Layout outcomes

- Desktop: table retained with DnD for services
- Mobile: dense entity cards (thumbnail, name, category, price, duration/stock, status, actions)
- Filters open in a sheet on small screens
- Edit uses InventoryEditPanel; Cancel without saving remains explicit; Save Changes in footer

## Verification

- `npm run build:merchant` must pass
- Behavioral parity: add/edit/delete, upload, DnD, locked feature, package compose

## Next

**Phase 4 — Settings** (`Settings.tsx`)
