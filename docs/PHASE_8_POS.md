# Phase 8 — Point of Sale

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/POS.tsx`

## Locked (unchanged)

- Catalogue data, filters, sort
- Cart state, add / remove, staff assignment, commission context
- Customer selection (does not clear cart)
- Package rules, vouchers, points redemption, credits, payment methods
- Totals math, `handleCheckout`, `isProcessing` (no new checkout lock)
- Appointment-linked sale context, voucher redemption mode
- Custom sale date/time, receipt print / new sale
- Transaction creation payload and receipt settings

## Presentational additions

`apps/merchant-portal/components/pos/`

| Component | Role |
|-----------|------|
| POSPageHeader | Title + optional voucher banner |
| POSCatalogueToolbar | Search, catalog tabs, sort, categories |
| POSCatalogueList / POSCatalogueSection | Discovery sections |
| POSItemCard | Catalogue add tile |
| POSStickyCartAction | Mobile sticky item count + running total |
| POSCartSheet | Desktop persistent rail / mobile bottom sheet |
| POSCartItem | Line item chrome (remove, redeem, therapist slots) |
| POSMemberSummary | Member / credit context around customer search |
| POSPaymentSection | Sale date/time + payment method |
| POSTotals / POSSaleCompleteActions | Dominant Complete Sale + post-sale actions |

## Layout outcomes

- **Desktop:** Discovery + filtering left; persistent cart / payment rail right; one Complete Sale action
- **Mobile:** Discovery primary; sticky cart bar (count + total); cart opens as bottom sheet; checkout above safe-area padding
- Duplicate submission guarded only by existing `isProcessing`

## Verification

- `npm run build:merchant` — PASS

## Next

**Phase 9 — Dashboard** — see `docs/PHASE_9_DASHBOARD.md`
