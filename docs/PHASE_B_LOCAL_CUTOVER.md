# Phase B — Local Supabase cutover

**Status:** Complete (Phase C production cutover done — see `PHASE_C_PRODUCTION_CUTOVER.md`)  
**Project:** `bookglow` (`uecphpjymbgtttrizhgy`)  
**Date:** 2026-07-26

## Goals

1. Point local merchant + customer apps at Supabase (`VITE_DATA_PROVIDER` / `VITE_AUTH_PROVIDER`)
2. Use publishable/anon keys only (never `service_role` in `VITE_*`)
3. Smoke-test anon public reads + merchant Auth + RLS
4. Keep Firebase credentials available for instant rollback

## Local env

Both apps use:

```env
VITE_SUPABASE_URL=https://uecphpjymbgtttrizhgy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
VITE_SUPABASE_ANON_KEY=eyJ…   # legacy alias kept for compatibility
VITE_DATA_PROVIDER=supabase
VITE_AUTH_PROVIDER=supabase
```

Files (gitignored):

- `apps/merchant-portal/.env`
- `apps/customer-site/.env`

Safe defaults remain `firebase` in each `.env.example`.

## Fixes applied during Phase B

1. **UID mismatch** — `baliwellness88@gmail.com` had `public.users.uid` ≠ `auth.users.id`. Aligned to Auth UUID so RLS works after login.
2. **Merchant temp passwords** — reset for the 8 mapped portal Auth users so local smoke login works. **Change these after first login** (do not leave the cutover temp password in production).

## Smoke results

Command:

```bash
cd migration
npm run smoke:phase-b
```

Report: `migration/supabase-import/generated/phase_b_smoke_report.json`

| Check | Result |
|-------|--------|
| Both apps providers = supabase | PASS |
| Publishable key (not service_role) | PASS |
| Anon read outlets / services | PASS |
| Appointments anon blocked/empty | PASS |
| Merchant sign-in (`baliwellness88@gmail.com`) | PASS |
| `public.users` profile | PASS (`admin@outlet_001`) |
| RLS clients / transactions | PASS (226 / 648 for outlet_001) |

Builds:

- Merchant portal: `npm run typecheck` + `npm run build` — OK  
- Customer site: `npm run typecheck` + `npm run test` + `npm run build` — OK  

## Manual UI checklist (optional)

With providers already on Supabase:

```bash
# terminal 1
cd apps/merchant-portal && npm run dev   # http://localhost:5173

# terminal 2
cd apps/customer-site && npm run dev     # http://localhost:3000
```

- [ ] Merchant login with a mapped outlet admin
- [ ] Schedule calendar shows full history
- [ ] POS / clients load under outlet RLS
- [ ] Customer booking page loads outlet + services from Supabase

## Rollback (local)

In both `.env` files:

```env
VITE_DATA_PROVIDER=firebase
VITE_AUTH_PROVIDER=firebase
```

Restart Vite. Firebase data was never deleted.

## Phase C next

1. Set the same provider flags + publishable keys in **production** hosting env
2. Deploy merchant + customer
3. Monitor 24–48h with Firebase still available
4. Only then start Phase D (remove Firebase)
