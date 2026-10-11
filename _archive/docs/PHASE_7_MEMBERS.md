# Phase 7 — Members and Member Details

**Status:** Complete  
**Date:** 2026-07-15  

## Process

CRM first, verify, then Member Details. Presentation only; balance types stay separate.

| # | File | Status |
|---|------|--------|
| 1 | `pages/CRM.tsx` | Complete |
| 2 | `pages/MemberDetails.tsx` | Complete |

---

## Shared presentational language

`apps/merchant-portal/components/members/`

| Component | Role |
|-----------|------|
| MemberPageHeader | List page title + count |
| MemberToolbar | Search, filters, desktop actions |
| MemberFilterSheet | Mobile import / export / loyalty sheet |
| MemberRow | Compact client row |
| MemberSummary | Identity + contact + join date |
| MemberBalanceSection | Separate credit / points / voucher / outstanding tiles |
| MemberHistorySection | Visits / sales / appointments / notes blocks |
| MemberActionBar | Footer actions (delete remains visible) |

---

## Locked

- Search, sort filters, CRUD, import/export, duplicates, history
- Points, credits, vouchers, outstanding (not merged)
- Modal handlers (points / credit / outstanding / transaction detail / void)
- Storage key `zenflow_memberFormSettings` (unchanged)
- No horizontal scroll on mobile member details

## Layout outcomes

- **CRM:** Header + toolbar; compact rows; mobile actions in sheet; bottom total / delete-all / add preserved
- **Member Details:** Eight presentational areas — identity, visits nav, points, credits, vouchers, outstanding, transactions nav, notes/media + actions

## Verification

- `npm run build:merchant` — PASS after CRM + MemberDetails

## Next

**Phase 8 — POS** — see `docs/PHASE_8_POS.md`
