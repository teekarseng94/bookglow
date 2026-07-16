# Phase 6 — Sales, Reports and Finance

**Status:** Complete  
**Date:** 2026-07-15  

## Process

One file at a time; calculations untouched. Shared reporting language in `components/reports/`.

| # | File | Status |
|---|------|--------|
| 1 | `pages/Transactions.tsx` | Complete |
| 2 | `pages/SalesReports.tsx` | Complete |
| 3 | `pages/ReportPage.tsx` | Complete |
| 4 | `pages/Finance.tsx` | Complete |

---

## Shared presentational language

`apps/merchant-portal/components/reports/`

| Component | Role |
|-----------|------|
| ReportPageHeader | Compact page header |
| ReportSummaryStrip | Tabular-numeral totals |
| ReportFilterToolbar | Search + chips |
| ReportFilterSheet | Sort / type filter sheet |
| ReportDateRangeBar / ReportFiltersSheet | Date range + mobile filters |
| ReportTxnCard | Mobile: amount, customer, date/time, payment, status |
| ReportDetailSheet | Transaction detail sheet |
| ReportEmptyState | Empty reporting states |

---

## Locked across all four files

- Queries, date filters, totals, grouping, exports/print
- Chart data inputs (Finance / ReportPage)
- Modal handlers and transaction detail / void behavior
- Expense create / category CRUD
- Payment method matching and collection aggregations
- No calculation repairs

## Layout outcomes

- Desktop: useful tables / detail rows retained; filters visible but compact
- Mobile: structured cards instead of wide tables; filters in sheets; print/export preserved
- Charts support decisions (Finance cashflow below header; ReportPage summary strip before monthly cards)

## Verification

- `npm run build:merchant` — PASS after all four files

## Next

**Phase 7 — Members and Member Details** (`CRM.tsx`, then `MemberDetails.tsx`)
