# Supabase foundation (Bookglow)

This document describes how to connect a Supabase project to the Bookglow monorepo.
**Firebase remains the default live backend** until a domain is explicitly cut over.

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

### Seed data

No production Firestore import in this step. After schema apply, insert test rows or run a controlled migration import when approved.
