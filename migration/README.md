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

1. Open Supabase Dashboard → **SQL Editor**
2. Run the SQL files **in order**:
   - `sql/001_create_tables.sql` — Creates all 17 tables
   - `sql/002_create_indexes.sql` — Creates performance indexes
   - `sql/003_rls_policies.sql` — Row Level Security policies
   - `sql/004_triggers.sql` — Auto-update triggers

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
npm run import:appointments          # needs serviceAccountKey.json
npm run import:merchant-phase5       # clients, txns, catalog, vouchers, users, ledgers
```

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

## Step 6: Configure the App for Supabase

Add to your `.env` file (in `zenspa backend/`):

```env
# Supabase (get from Supabase Dashboard → Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Database provider: "firestore" (default) or "supabase"
VITE_DB_PROVIDER=firestore
```

## Step 7: Test with Supabase

1. Change provider:
```env
VITE_DB_PROVIDER=supabase
```

2. Restart dev server:
```bash
npm run dev
```

3. Test all features:
   - [ ] Dashboard loads with correct totals
   - [ ] Sales Reports show correct data
   - [ ] POS can complete a sale
   - [ ] Client points update correctly
   - [ ] Voucher purchase and redemption work
   - [ ] Appointment calendar works
   - [ ] Staff commission reports work
   - [ ] Settings page works
   - [ ] Super admin subscriber list works
   - [ ] API integration key management works

## Step 8: Switch to Supabase (Production)

Once all tests pass:

1. Set `VITE_DB_PROVIDER=supabase` in production environment
2. Deploy
3. Monitor for 24-48 hours
4. Keep Firestore data intact as backup

---

## Rollback Plan

If Supabase has issues at any point:

1. Set `VITE_DB_PROVIDER=firestore` in `.env`
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

zenspa backend/
├── lib/
│   └── supabase.ts                 # Supabase client
├── services/
│   ├── firestoreService.ts         # (existing, unchanged)
│   ├── supabaseService.ts          # NEW: Supabase CRUD layer
│   └── databaseService.ts          # NEW: Provider switch
```

## Important Notes

- **Firebase Auth** is NOT migrated — it continues working as-is
- **Firebase Storage** is NOT migrated — image URLs remain valid
- **Cloud Functions** are NOT changed — they continue using Firebase Admin SDK
- **No UI changes** — the app looks and behaves identically
- **No Firestore data is deleted** at any point
