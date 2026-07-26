# Phase A — Supabase data + schema

**Status:** Complete (ready for Phase B local cutover)  
**Project:** `bookglow` (`uecphpjymbgtttrizhgy`, `ap-northeast-1`)  
**Date:** 2026-07-26

## Goals

1. Apply schema (baseline + incremental migrations)
2. Export Firestore → import Supabase
3. Validate row counts / business totals
4. Map merchant Auth users into `public.users` (Supabase Auth UUIDs)

Firebase remains in place for rollback. No production cutover in this phase.

## Schema

All incremental migrations are applied on the remote project (15 migration versions through `merchant_portal_phase5_realtime`).

Local reference files:

- Baseline: `migration/sql/001`–`004`
- Incremental: `migration/supabase/migrations/*.sql`

Public tables present (RLS on): outlets, services, staff, appointments, clients, frontend_customers, users, points_credits, point_transactions, outstanding_transactions, credit_history, transactions, products, packages, rewards, vouchers, api_integrations.

## Data

| Table | Firestore export | Supabase | Notes |
|-------|------------------|----------|-------|
| outlets | 3 | 3 | match |
| services | 95 | 95 | match |
| staff | 14 | 14 | match |
| appointments | 1391 | **1392** | full history backfilled; +1 live |
| clients | 758 | 759 | +1 live |
| transactions | 1934 | 1937 | +3 live |
| products / packages / rewards / vouchers | 4 / 4 / 5 / 2 | same | match |
| points_credits | 824 | 825 | +1 live |
| point_transactions | 103 | 103 | match |
| users | 14 | 14 | merchant rows remapped to Auth UUIDs |
| client points (sum) | 300112 | 300112 | match |
| SALE revenue | 102958 | 103038 | +80 live |

Report: `migration/validate/validation_report.json`

### Appointment history fix

Earlier import kept only the last **14 days** (slot warmup): 108 kept / 1283 skipped.  
Phase A regenerated and applied **full history** (`APPOINTMENTS_FULL_HISTORY` / `--full-history`).

```bash
cd migration
npm run import:appointments:json   # regenerates apt_*.sql from export
# apply generated SQL via SQL editor / MCP execute_sql (batches under generated/apt_batches/)
```

`import-appointments-only.mjs` now defaults to full history; use `--recent-only` for the old 14-day window. Invalid Firestore time `24:00` is sanitized to `23:59`.

## Auth mapping

Merchant portal accounts are mapped (see `migration/supabase-import/generated/merchant_auth_map.json`):

- 8 merchant/`platform_admin` rows use Supabase Auth UUIDs
- 0 merchant rows still use Firebase UIDs
- Smoke login previously recorded OK for `baliwellness88@gmail.com`
- Temp password via `MERCHANT_TEMP_PASSWORD` (change after first login)
- 1 Firebase UID skipped (no Auth user)

Customer/client-role rows may still use legacy Firebase UIDs in `public.users`; customer auth uses `frontend_customers` + Supabase customer flows separately.

## What Phase A did **not** do

- Did not flip `VITE_DATA_PROVIDER` / `VITE_AUTH_PROVIDER` to `supabase` (that is Phase B)
- Did not remove Firebase
- Did not require a fresh Firestore export (used 2026-07-22 snapshot + live positive deltas)

## Phase B next

1. Set local `.env` for both apps:
   - `VITE_DATA_PROVIDER=supabase`
   - `VITE_AUTH_PROVIDER=supabase`
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (never put service_role in `VITE_*`)
2. Merchant + customer E2E smoke (login, schedule, POS, booking, members)
3. Keep Firebase credentials available for instant rollback
