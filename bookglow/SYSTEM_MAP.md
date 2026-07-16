# SYSTEM MAP

## 1) Frontend Route Manifest

This repo currently contains two UI entry patterns:
- `zenspa Frontend` (BrowserRouter build; currently serving booking + `/admin/*` mini admin routes)
- `zenspa backend` (HashRouter build; full dashboard/POS/CRM app)

### Booking Site Routes (`zenspa Frontend/index.tsx`)

- `/` -> Landing page component (`App`) via wildcard fallback.
- `/signup` -> `SignUp`.
- `/book/:outletId` -> Public booking page.
- `/book/:outletId/auth` -> Booking auth screen.

### Dashboard Routes (`zenspa Frontend/index.tsx`)

- `/loginbackend` -> Admin login.
- `/admin` -> Protected admin layout shell.
- `/admin/dashboard` -> Admin dashboard.
- `/admin/pos` -> Admin POS.
- `/admin/staff` -> Admin staff.
- `/admin/services` -> Admin services.
- `/admin` (index) -> Redirects to `/admin/dashboard`.

### Dashboard Routes (`zenspa backend` HashRouter app)

With `HashRouter`, real URLs are `/#/...`.

Root/auth routes (`zenspa backend/RootRoutes.tsx`):
- `/#/` -> Redirect to `/#/login`.
- `/#/login` -> Backend login page.
- `/#/book/:id` -> Public booking page in backend app shell.
- `/#/*` -> Loads main app.

Main app routes (`zenspa backend/App.tsx` + layout navigation):
- `/#/dashboard`
- `/#/pos`
- `/#/appointments`
- `/#/member`
- `/#/menu`
- `/#/sales-reports`
- `/#/transactions`
- `/#/finance`
- `/#/staff`
- `/#/settings`
- `/#/member-details/:id`
- `/#/settings/integrations`

Super admin routes:
- `/#/admin/dashboard`
- `/#/admin/subscribers`

### Legacy URL compatibility

`zenspa Frontend/index.tsx` includes hash-to-browser redirects:
- `/#/login` -> `/loginbackend`
- `/#/dashboard` -> `/admin/dashboard`

This helps old links but does not solve hosting target mix-ups when booking and dashboard deploy to the same site with different build outputs.

---

## 2) API / Backend Route Manifest (Firebase Functions)

Functions source: `zenspa backend/functions/index.js` (region: `asia-southeast1`).

### Callable functions (`https.onCall`)

- `uploadServiceImage`
- `deleteStorageFile`
- `verifyApiKeyForChatbot`
- `fetchSetmoreFeed`
- `getSetmoreFeed`
- `syncSetmoreCalendar`
- `getPublicAvailableSlots`
- `getPublicOutletData`
- `createPublicBooking`

### HTTP request functions (`https.onRequest`)

- `chatbotWebhook`
- `publicGetMenu`
- `publicPostBook`

### Firestore/Auth/background triggers

- None found in current `functions/index.js` export list (no `firestore.document(...).on*`, `auth.user().on*`, Pub/Sub schedule exports).

---

## 3) Cross-Links Between Booking and Dashboard

Explicit booking-to-dashboard link points:

- `zenspa Frontend/services/authService.ts`
  - `DASHBOARD_URL = "/admin/dashboard"`
  - Registration flows (`register`, `registerWithGoogle`, `registerWithFacebook`) redirect to dashboard URL.

- `zenspa Frontend/apps/booking/SignUp.tsx`
  - Header/login links use `DASHBOARD_URL`.
  - "Already have an account? Login" link uses `DASHBOARD_URL`.

- `zenspa Frontend/App.tsx`
  - Landing page has `href="/loginbackend"` for backend/admin login CTA.

Notes:
- These links assume booking and dashboard routes can coexist on the same origin.
- In a dual-build deployment, keep absolute environment-specific URLs per app (or separate domains/subdomains) to avoid route/chunk mismatches.

---

## 4) Hosting Configuration Audit (`firebase.json`)

Current `firebase.json` already defines two hosting targets:
- `booking-site` -> `dist-booking`
- `dashboard-site` -> `dist-dashboard`

The problem is not `firebase.json` structure; it is target mapping when both targets point to the same site ID (`bookglow-83fb3`), causing release confusion and stale chunk failures.

### Recommended production setup: Firebase multisite (best)

Use two Firebase Hosting site IDs under one project:

- Booking: `bookglow-83fb3`
- Dashboard: `bookglow-83fb3-dashboard` (create once)

Then map:
- target `booking-site` -> site `bookglow-83fb3`
- target `dashboard-site` -> site `bookglow-83fb3-dashboard`

Outcome:
- Booking deploys cannot overwrite dashboard files.
- Dashboard deploys cannot overwrite booking files.

Suggested access URLs:
- Booking: `https://bookglow-83fb3.web.app`
- Dashboard: `https://bookglow-83fb3-dashboard.web.app/#/login`

### Alternate setup: one site with subdirectory rewrites (not preferred here)

Possible but higher risk for this repo:
- Host booking at `/`
- Host dashboard static files under `/admin-app/*`
- Rewrite `/admin-app/**` to dashboard index and keep booking catch-all for `/`.

This needs build-time `base` path adjustments for dashboard chunk assets and careful route handling. Without those changes, chunk load errors are likely.

---

## 5) Deployment Flow (Independent, No Overwrite)

From repo root.

### One-time target/site setup

```bash
firebase use bookglow-83fb3
firebase hosting:sites:create bookglow-83fb3-dashboard --project bookglow-83fb3
firebase target:apply hosting booking-site bookglow-83fb3 --project bookglow-83fb3
firebase target:apply hosting dashboard-site bookglow-83fb3-dashboard --project bookglow-83fb3
```

### Build outputs

```bash
cd "zenspa backend" && npm run build -- --outDir ../dist-dashboard
cd .. && cd "zenspa Frontend" && npm run build -- --outDir ../dist-booking
cd ..
```

### Deploy booking only

```bash
firebase deploy --only hosting:booking-site --project bookglow-83fb3
```

### Deploy dashboard only

```bash
firebase deploy --only hosting:dashboard-site --project bookglow-83fb3
```

### Deploy both hosting targets

```bash
firebase deploy --only hosting --project bookglow-83fb3
```

### Deploy Firestore rules/indexes only

```bash
firebase deploy --only firestore:rules,firestore:indexes --project bookglow-83fb3
```

### Post-deploy validation

- Booking URL returns booking UI and booking chunks only.
- Dashboard URL loads `/#/login` and can navigate to `/#/pos` without dynamic-import chunk errors.
- Hard refresh once after first multisite cutover to clear stale chunk references.
