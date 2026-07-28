# BookGlow: Firestore → Supabase Migration Guide

## Overview

This guide walks you through migrating BookGlow from Firebase Firestore to Supabase **without data loss** and with a **rollback plan** at every step.

---

## Prerequisites

- Node.js 18+
- A Supabase project (create at [supabase.com](https://supabase.com))
- Firebase service account key JSON
- Access to the Supabase SQL editor

---

## Step 1: Install Migration Dependencies

```bash
cd migration
npm install
```

## Step 2: Create Supabase Tables

1. Open Supabase Dashboard → **SQL Editor** (or apply via Supabase MCP / CLI)
2. Run baseline SQL **in order** (greenfield only):
   - `sql/001_create_tables.sql` — Creates all 17 tables
   - `sql/002_create_indexes.sql` — Creates performance indexes
   - `sql/003_rls_policies.sql` — Row Level Security policies
   - `sql/004_triggers.sql` — Auto-update triggers
3. Apply incremental migrations under `supabase/migrations/` (public booking + merchant phases 1–5). See `supabase/migrations/README.md`.

> Phase A (2026-07-26): schema + data are applied on project `bookglow`. See `docs/PHASE_A_SUPABASE_DATA.md`.

## Step 3: Export Firestore Data

1. Get your Firebase service account key:
   - Firebase Console → Project Settings → Service accounts → Generate new private key
   - Save as `migration/firestore-export/serviceAccountKey.json`

2. Run the export:
```bash
npm run export
```

3. Verify output files in `migration/firestore-export/data/`:
   - `outlets.json`, `clients.json`, `staff.json`, etc.
   - `_export_summary.json` shows counts

> ⚠️ This is **read-only** — no Firestore data is modified.

## Step 4: Import Data to Supabase

Controlled SQL generators (output under `supabase-import/generated/`):

```bash
npm run import:outlets-services
npm run import:staff
npm run import:appointments          # live Admin export (full history by default)
npm run import:appointments:json     # regenerate SQL from existing appointments.json
npm run import:merchant-phase5       # clients, txns, catalog, vouchers, users, ledgers
npm run map:merchant-auth            # Firebase merchants → Supabase Auth + public.users
```

Appointments: use `--full-history` (default) for Phase A; `--recent-only` keeps the last 14 days only.

Or upsert exported JSON with the service role:

```bash
# Windows
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# macOS/Linux
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...

npm run import
```

The import uses **upsert** — safe to re-run.

## Step 5: Validate Data

```bash
npm run validate
```

The validation script checks:
- ✅ Row counts for all 15+ tables
- ✅ Total SALE revenue matches
- ✅ Total client points match
- ✅ Active/sold voucher counts match
- ✅ Outlet counts match

A `validation_report.json` is saved with results.

## Step 6–7: Local Supabase cutover (Phase B)

> Phase B (2026-07-26): local `.env` for both apps points at Supabase. See `docs/PHASE_B_LOCAL_CUTOVER.md`.

```env
VITE_SUPABASE_URL=https://uecphpjymbgtttrizhgy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
# optional legacy alias:
# VITE_SUPABASE_ANON_KEY=eyJ…

VITE_DATA_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
```

Never put the service role key in any `VITE_*` variable.

```bash
cd migration && npm run smoke:phase-b
```

Then restart each app (`npm run dev`) for UI smoke:

- [ ] Merchant login (mapped Auth users)
- [ ] Dashboard / reports totals
- [ ] POS sale + client points
- [ ] Appointment calendar (full history)
- [ ] Customer public booking
- [ ] Settings / staff / members

## Step 8: Production cutover (Phase C)

> Phase C (2026-07-26): production hosting deployed with Supabase providers. See `docs/PHASE_C_PRODUCTION_CUTOVER.md`.

```bash
# bake production env (apps/*/.env.production), then:
npm run build:merchant
npm run build:customer
npx firebase deploy --only hosting --project bookglow-83fb3
cd migration && npm run smoke:phase-c
```

1. Monitor 24–48 hours
2. Keep Firestore intact for rollback
3. Remove Firebase only in Phase D after C is solid

---

## Rollback Plan

If Supabase has issues at any point:

1. Set `VITE_DATA_PROVIDER=firebase` and `VITE_AUTH_PROVIDER=firebase` in `.env`
2. Restart the app
3. The app immediately uses Firestore again
4. **No data is lost** — Firestore data is never deleted

---

## File Structure

```
migration/
├── package.json                    # Dependencies
├── README.md                       # This file
├── sql/
│   ├── 001_create_tables.sql       # Table definitions
│   ├── 002_create_indexes.sql      # Performance indexes
│   ├── 003_rls_policies.sql        # Row Level Security
│   └── 004_triggers.sql            # Auto-update triggers
├── firestore-export/
│   ├── export.js                   # Export script
│   ├── serviceAccountKey.json      # (you provide this)
│   └── data/                       # Exported JSON files
├── supabase-import/
│   └── import.js                   # Import script
└── validate/
    └── validate.js                 # Validation script

apps/
├── merchant-portal/                 # VITE_DATA_PROVIDER / VITE_AUTH_PROVIDER switch
└── customer-site/
packages/
└── @bookglow/supabase               # shared Supabase client helpers
```

## Important Notes

- Merchant Auth mapping is available via `npm run map:merchant-auth` (Phase A done for portal users)
- **Firebase Storage** image URLs remain valid until a later storage migration
- **No Firestore data is deleted** at any point during Phases A–C
- Dual-provider remains until Phase D
