# Phase C — Production Supabase cutover

**Status:** Deployed — monitor 24–48h before Phase D  
**Date:** 2026-07-26  
**Firebase project:** `bookglow-83fb3`  
**Supabase project:** `bookglow` (`uecphpjymbgtttrizhgy`)

## Goals

1. Bake `VITE_DATA_PROVIDER=supabase` / `VITE_AUTH_PROVIDER=supabase` into production builds
2. Deploy merchant (dashboard) + customer (booking) hosting
3. Keep Firebase Auth/Firestore available for rollback
4. Do **not** remove Firebase yet (Phase D)

## What shipped

| Site | Hosting URL | Build output |
|------|-------------|--------------|
| Booking (customer) | https://bookglow-83fb3.web.app | `dist-booking` |
| Dashboard (merchant) | https://bookglow-83fb3-dashboard.web.app | `dist-dashboard` |

Also: https://bookglow-83fb3.firebaseapp.com / https://bookglow-83fb3-dashboard.firebaseapp.com

Production env (local, gitignored):

- `apps/merchant-portal/.env.production`
- `apps/customer-site/.env.production`

Both set Supabase URL + publishable key + providers=`supabase`.

Deploy command used:

```bash
npm run build:merchant
npm run build:customer
npx firebase deploy --only hosting --project bookglow-83fb3 --non-interactive
```

## Post-deploy smoke

```bash
cd migration && npm run smoke:phase-c
```

Report: `migration/supabase-import/generated/phase_c_smoke_report.json`

Expected / verified:

- Both hosting sites HTTP 200
- Production JS includes Supabase project URL + publishable key
- Anon can read outlets
- Merchant Auth + RLS clients still work

## Auth URL configuration (manual)

Password login works without redirects. For password-reset / magic-link emails, set in Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://bookglow-83fb3-dashboard.web.app` (or your preferred primary)
- **Redirect URLs:**  
  - `https://bookglow-83fb3-dashboard.web.app/**`  
  - `https://bookglow-83fb3.web.app/**`  
  - `http://localhost:5173/**`  
  - `http://localhost:3000/**`

Dashboard deep link:  
https://supabase.com/dashboard/project/uecphpjymbgtttrizhgy/auth/url-configuration

## Security / ops notes

- Merchant cutover temp passwords were reset in Phase B — **change them in production now**.
- Never put `service_role` in frontend env.
- Firebase remains the rollback path; do not delete Firestore data.

## Rollback (production)

1. Set both apps' `.env.production` (and rebuild) to:
   ```env
   VITE_DATA_PROVIDER=firebase
   VITE_AUTH_PROVIDER=firebase
   ```
2. Rebuild + redeploy hosting:
   ```bash
   npm run build:merchant
   npm run build:customer
   npx firebase deploy --only hosting --project bookglow-83fb3
   ```
3. Users immediately use Firestore again. No Firestore data was deleted.

## Monitor checklist (24–48h)

- [ ] Merchant login on dashboard hosting
- [ ] Schedule / appointments load
- [ ] POS sale completes
- [ ] Members / clients under outlet RLS
- [ ] Customer booking page loads outlet + services
- [ ] Public create booking succeeds
- [ ] No spike in Auth/API errors (Supabase logs)

## Phase D next (only after monitor window)

Remove Firebase client paths / deps only when Phase C is solid and rollback is no longer needed.
