# Deploy ZenSpa (razak-residence-2026) – Multisite Hosting

All deploys use the **project root** (`1. ZenSpa`). The project uses one Firebase project (`razak-residence-2026`) with two hosting targets: **booking-site** and **dashboard-site**.

---

## 1. One-time: Link hosting targets to site IDs

In [Firebase Console](https://console.firebase.google.com/) → your project → **Hosting**, add a second site if you don’t have two yet. Note the **Site ID** for each (e.g. default is `razak-residence-2026`, second might be `razak-residence-2026-dashboard`).

From the **project root** run:

```bash
cd "c:\Users\Acer\Desktop\Vibe-Coding\1. ZenSpa"

firebase use razak-residence-2026

firebase target:apply hosting booking-site <BOOKING_SITE_ID>
firebase target:apply hosting dashboard-site <DASHBOARD_SITE_ID>
```

Replace:
- `<BOOKING_SITE_ID>` – e.g. `razak-residence-2026` (booking landing page)
- `<DASHBOARD_SITE_ID>` – e.g. `razak-residence-2026-dashboard` (admin dashboard)

If you only have one site, create the second in Hosting → **Add another site**, then run the two `target:apply` commands.

---

## 2. Deploy Booking site only (recommended – only hosting from dashboard)

Booking hosting uses **zenspa dashboard** only. From project root:

```bash
cd "c:\Users\Acer\Desktop\Vibe-Coding\1. ZenSpa"

cd "zenspa dashboard"
npm run build
cd ..

firebase deploy --only hosting:booking-site
```

The `booking-site` target in firebase.json points to `zenspa dashboard/dist` (Vite’s default output), so no `--outDir` is needed.

---

## 3. Deploy Dashboard site only

From project root:

```bash
cd "c:\Users\Acer\Desktop\Vibe-Coding\1. ZenSpa"

cd "zenspa backend"
npm run build -- --outDir ../dist-dashboard
cd ..

firebase deploy --only hosting:dashboard-site
```

---

## 4. Deploy both sites

From project root:

```bash
cd "c:\Users\Acer\Desktop\Vibe-Coding\1. ZenSpa"

cd "zenspa dashboard"
npm run build
cd ..

cd "zenspa backend"
npm run build -- --outDir ../dist-dashboard
cd ..

firebase deploy --only hosting
```

---

## 5. Deploy Firestore rules / indexes / functions (optional)

From project root (firebase.json points to `zenspa backend/` for Firestore and functions):

```bash
cd "c:\Users\Acer\Desktop\Vibe-Coding\1. ZenSpa"

firebase deploy --only firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

---

## Summary

| Action              | Command (from project root) |
|---------------------|-----------------------------|
| Use project         | `firebase use razak-residence-2026` |
| Apply targets (once)| `firebase target:apply hosting booking-site <id>` then `... dashboard-site <id>` |
| Deploy Booking      | Build in `zenspa dashboard` (→ `dist/`), then from root `firebase deploy --only hosting:booking-site` |
| Deploy Dashboard    | Build backend → `../dist-dashboard`, then `firebase deploy --only hosting:dashboard-site` |
| Deploy both hosting | Build dashboard (→ `dist/`), build backend (→ `../dist-dashboard`), then `firebase deploy --only hosting` |
