# Phase D — Remove Firebase client (Supabase-only apps)

**Status:** Complete and redeployed  
**Date:** 2026-07-26

## Scope

| Kept | Removed from apps |
|------|-------------------|
| Firebase **Hosting** deploy (`firebase.json`, `.firebaserc`, `firebase-tools`) | Firebase Auth / Firestore / Storage **client SDK** in merchant + customer |
| Cloud **Functions** source (chatbot / legacy CF; not used by new client paths) | Dual-provider switches (`VITE_*` ignored; always Supabase) |
| Firestore **data** (untouched archive / rollback) | `firebase` npm dependency from both apps |
| `migration/` Firebase Admin scripts | `firestoreService.ts`, app `firebase.ts` modules |

## Runtime

- `packages/shared-types` → `resolveDataProvider` / `resolveAuthProvider` always return `"supabase"`.
- Merchant `databaseService`, `authService`, `storageService`, vouchers/points/outstanding, hooks, reports, Settings → Supabase only.
- Customer booking path resolve, BookingPage, booking auth → Supabase only.
- Legacy customer `/signup` marketing flow throws a clear “use booking auth” error.

## Production

Redeployed hosting after Phase D builds:

- https://bookglow-83fb3.web.app  
- https://bookglow-83fb3-dashboard.web.app  

Bundle size dropped (Firebase client no longer shipped), e.g. dashboard vendor ~2.5MB → ~1.9MB gzip-in roughly proportional.

## Still true / caveats

1. **Chatbot** migrated in Phase E → Supabase Edge Function `chatbot-webhook` (see `docs/PHASE_E_RETIRE_FIRESTORE.md`).
2. **Legacy image URLs** on `firebasestorage.googleapis.com` may still render; new uploads use Supabase `outlet-media`.
3. **Rollback** is no longer a one-line env flip: restore a pre–Phase D git revision, rebuild, redeploy. Firestore data was not deleted in Phase D/E.

## Verify

```bash
npm run typecheck
npm run build:merchant
npm run build:customer
cd migration && npm run smoke:phase-c
```
