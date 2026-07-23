# Supabase foundation (Bookglow)

This document describes how to connect a Supabase project to the Bookglow monorepo.
**Local/dev cutover to Supabase is supported** via `VITE_DATA_PROVIDER` / `VITE_AUTH_PROVIDER`.
Keep Firebase credentials until production cutover is verified and approved.

## Packages

| Package | Purpose |
|---------|---------|
| `@bookglow/database-contracts` | Canonical generated `Database` types |
| `@bookglow/supabase` | Typed browser client factory |
| `@bookglow/shared-types` | Provider flags + repository interfaces |

## Environment (Vite apps)

Copy each app’s `.env.example` to `.env` (never commit secrets):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # or legacy anon JWT
VITE_DATA_PROVIDER=firebase
VITE_AUTH_PROVIDER=firebase
```

Rules:

- Use the **publishable** (or legacy **anon**) key in frontend apps only.
- Never put the **service_role** / secret key in `VITE_*` vars, app code, or git.
- Service role belongs only in `migration/` scripts / CI with server env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Commands (repo root)

```bash
npm install
npm run typecheck:packages
npm run supabase:types          # needs SUPABASE_PROJECT_ID=your-ref
npm run supabase:start          # local stack (optional)
npm run supabase:status
npm run supabase:stop
npm run supabase:reset          # local DB reset — destructive to local only
```

## Generate database types

```bash
# Windows PowerShell
$env:SUPABASE_PROJECT_ID="your-project-ref"
npm run supabase:types
```

Output: `packages/database-contracts/src/database.types.ts`

## Existing SQL

Baseline tables/RLS live in `migration/sql/001`–`004`.  
New incremental migrations go under `migration/supabase/migrations/`.

## Using the client (not wired into live UI yet)

```ts
import { createBrowserSupabaseClient } from "@bookglow/supabase";

const supabase = createBrowserSupabaseClient(import.meta.env);
```

Default providers stay Firebase (`VITE_DATA_PROVIDER=firebase`). Do not switch production domains until migration verification is approved.

## Connected project (local)

| | |
|--|--|
| URL | `https://uecphpjymbgtttrizhgy.supabase.co` |
| Project ref | `uecphpjymbgtttrizhgy` |
| App env | `apps/*/.env` (gitignored) — publishable/anon key only |

**Status:** `outlets` + `services` tables applied (RLS on; anon SELECT for active/visible).  
**Import (controlled):** Firestore → Supabase upsert completed for outlets/services/staff — **3 outlets**, **95 services**, **14 staff**. Re-run with `cd migration && npm run import:outlets-services` / `npm run import:staff` then apply generated SQL / MCP upserts.

### Flip booking reads to Supabase (local only)

In `apps/customer-site/.env`:

```env
VITE_DATA_PROVIDER=supabase
```

Default remains `firebase`.

### Available slots

- RPC: `get_public_available_slots(outlet_id, service_id, date, staff_id)`
- Appointments table is internal (no anon SELECT); slots only returned as `HH:mm[]`
- Appointment import needs Admin SDK: place `migration/firestore-export/serviceAccountKey.json`, then `npm run import:appointments`
- Until appointments are imported, Supabase slots = business hours only (no busy blocking)

### Create booking (write)

- RPC: `create_public_booking(...)` — creates/links `clients` + `frontend_customers`, inserts `appointments`
- No anon INSERT on those tables; writes only via SECURITY DEFINER RPC
- Optional `p_auth_uid` for future Supabase customer auth; guest path dedupes by outlet + phone
- With `VITE_DATA_PROVIDER=supabase`, BookingPage submit uses this RPC (Firebase create stays when provider is firebase)
- Authenticated bookings use JWT `auth.uid()` for `frontend_customers.id` (client-supplied uid is ignored)

### Public reviews (write)

- RPC: `submit_public_review(outlet_id, author, text, rating)` — **authenticated only** (`GRANT … TO authenticated`)
- Appends to `outlets.reviews` JSONB; requires Supabase Auth session
- Pair with `VITE_AUTH_PROVIDER=supabase` when using Supabase data for booking

### Customer auth (booking site)

- Flag: `VITE_AUTH_PROVIDER=supabase`
- Email/password via Supabase Auth; Google/Facebook via `signInWithOAuth` (enable providers in Supabase Dashboard)
- RPC: `upsert_frontend_customer_profile` after sign-in; customers may `SELECT` their own `frontend_customers` row
- Local test tip: disable “Confirm email” in Auth settings if you need an immediate session after sign-up

### Merchant portal Phase 1

With `apps/merchant-portal/.env`:

```env
VITE_DATA_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
```

**Works on Supabase:** login, Schedule, Menu (services), Staff, Settings, CRM/members, POS / Sales History / Finance, products/packages/rewards, **vouchers (Marketing / buy / redeem)**, **API key settings**, **image uploads** (Supabase Storage `outlet-media`), **Realtime refresh** (plus 60s safety poll).  
Cashiers: SALE rows plus Commission EXPENSE rows linked via `parent_sale_id`; admins see/write all transaction types.  
**Still deferred:** production default flip (see Phase 5 cutover).

**Setup each merchant login:**

1. Create user in Supabase Auth (Dashboard → Authentication → Users)
2. Insert portal mapping (SQL):

```sql
INSERT INTO public.users (uid, email, outlet_id, role, display_name)
VALUES (
  '<supabase-auth-user-uuid>',
  'you@example.com',
  'outlet_002',
  'admin',
  'You'
);
```

`uid` must equal the Auth user id. Role: `admin` | `cashier` (or `platform_admin` / admin with `outlet_id` null for owner-style access).

### Merchant portal Phase 3 (POS / catalog)

Migration: `20260722070000_merchant_portal_phase3_transactions.sql`

- Tables: `transactions`, `products`, `packages`, `rewards` with outlet-scoped merchant RLS
- Cashiers: SELECT/INSERT/UPDATE only rows with `type = 'SALE'`; admins: all transaction types
- App poll (15s) loads transactions + catalog; Sales Reports / Member Details sales use Supabase when `VITE_DATA_PROVIDER=supabase`
- POS create/void/delete (including commission expenses + points undo) dual-pathed off Firestore

Empty tables until you create catalog items / sales in-app or import from Firestore.

### Merchant portal Phase 4 (vouchers / API / Storage)

Migration: `20260722080000_merchant_portal_phase4_vouchers_storage.sql`

- Tables: `vouchers`, `api_integrations` with merchant RLS
- Public RPCs: `public_voucher_purchase`, `public_voucher_confirm_redemption` (Buy / Redeem pages)
- Storage bucket `outlet-media` (public read; merchant write under `outlets/{outlet_id}/…`)

### Merchant portal Phase 5 (data + reliability + cutover)

**Reliability:** migration `20260722090000_merchant_portal_phase5_realtime.sql` adds merchant tables to `supabase_realtime` (REPLICA IDENTITY FULL). Portal refreshes on change (debounced) with a 60s safety poll.

**Data import (controlled):**

```bash
# Requires migration/firestore-export/serviceAccountKey.json
cd migration
npm run import:merchant-phase5
# → supabase-import/generated/merchant_phase5.sql (+ summary JSON)
# Apply SQL in Dashboard, or:
#   set SUPABASE_URL=...
#   set SUPABASE_SERVICE_ROLE_KEY=...
#   npm run import
```

Also: `npm run import:appointments` for busy-slot history.

**Local cutover (already working):**

```env
VITE_DATA_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
```

**Production cutover checklist**

1. Import remaining Firestore data; run `npm run validate`
2. Smoke-test POS, CRM, vouchers, schedule, uploads on a staging build
3. Map merchants: Firebase Auth emails → Supabase Auth + `public.users`  
   (`cd migration && npm run map:merchant-auth` with service role, or one-time SQL seed)
4. Ensure every merchant can sign in; change temp passwords
5. Set production env to `supabase` for data + auth
6. Keep Firestore read-only backup 24–48h; do not delete Firebase project yet
7. Rollback: flip providers back to `firebase`

**Merchant Auth mapping (done for local cutover project):**  
Firebase staff UIDs were replaced with Supabase Auth UUIDs in `public.users` for outlet admins/cashiers recovered from Firebase Auth emails. Owner `teekarseng94@gmail.com` is `platform_admin`. New accounts used a temporary password — change it after first login.

### Seed data

No production Firestore import in this step. After schema apply, insert test rows or run a controlled migration import when approved.
