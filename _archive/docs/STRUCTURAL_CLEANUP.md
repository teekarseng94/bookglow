# Structural Cleanup — Post Volumes I–VI

**Date:** 2026-07-16  
**Scope:** customer-site + merchant-portal  
**Rule:** No Firebase/Firestore/business-logic changes

## Deleted (safe)

| Path | Why safe |
|------|----------|
| `apps/customer-site/src/booking-v2/` (entire tree, ~63 files + tests) | Unmounted; zero imports from `index.tsx`, `App.tsx`, live booking, or services |
| `apps/merchant-portal/pages/Book.tsx` | Replaced by `LegacyBookingRedirect`; no other imports |
| `apps/merchant-portal/pages/MemberProfile.tsx` | Empty file; zero static/dynamic imports |
| `apps/merchant-portal/lib/supabase.ts` | Not imported by active app (only by deleted supabaseService) |
| `apps/merchant-portal/services/supabaseService.ts` | Not imported by pages/hooks; Firestore is sole provider |
| `@supabase/supabase-js` dependency | Removed; `package-lock.json` regenerated via `npm install` |

## Added / changed

| Change | Notes |
|--------|-------|
| `components/LegacyBookingRedirect.tsx` | `window.location.replace` → `https://bookglow-83fb3.web.app/book/:id` + query |
| `RootRoutes.tsx` | `/book/:id` → redirect component |
| `App.tsx` | `case 'report'` + `VALID_TAB_IDS` / `ADMIN_ONLY_TABS` include `report` |
| `services/databaseService.ts` | Firestore-only comments; exports unchanged |
| `.gitignore` + `.env.example` | Both apps |
| Visible Bookglow branding | titles, loading, metadata, settings examples, receipt fallback, CSV name |

## Preserved intentionally

- `zenflow_memberFormSettings` storage key
- Firebase project IDs / collection names / Cloud Function export names
- Package names `zenflow-spa-manager` / `zenflow-functions` (functions `file:..` dependency)
- Hosting target id `zenspabookingsystem` in customer deploy docs
- Documented test login email `admin@zenflow.test` (may be a live Auth user)

## Verification

- V2 / `/book-v2` / `VITE_ENABLE_BOOKING_V2`: no matches under `apps/customer-site`
- Active Supabase imports: none under merchant app source
- Duplicate booking UI: removed; merchant `/book/:id` redirects only
- Settings booking URL: `https://bookglow-83fb3.web.app/book/...`
- `npm run build:merchant` PASS
- `npm run build:customer` PASS
- Customer vitest: pass with no tests
- Customer `tsc`: 0 errors
- Merchant `tsc`: 25 pre-existing (was 27; supabase-related gone)
