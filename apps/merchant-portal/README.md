# ZenFlow Spa Manager 2.0

A comprehensive CRM, POS, and financial tracking system for spa and wellness centers with Firebase/Firestore backend, multi-tenant (outlet) support, and AI-powered insights.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure & File Purposes](#project-structure--file-purposes)

---

## Quick Start

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` for AI insights (optional).
3. Run locally: `npm run dev`
4. Build: `npm run build`
5. Deploy: `npm run deploy` (hosting) or `npm run deploy:all` (hosting + Firestore)

---

## When do I need to deploy to Firebase?

You do **not** need to redeploy for every code change. Deploy only what changed:

| What changed | Deploy command | When |
|--------------|----------------|------|
| **App code** (React, TS, UI, logic) | `npm run build` then `firebase deploy --only hosting` or `npm run deploy` | So users get the new app in the browser. |
| **Firestore security rules** (`firestore.rules`) | `firebase deploy --only firestore:rules` or `npm run deploy:rules` | After changing who can read/write which collections. |
| **Firestore indexes** (`firestore.indexes.json`) | `firebase deploy --only firestore:indexes` or `npm run deploy:indexes` | After adding or changing composite indexes for queries. |
| **New fields or collections in code** | No Firestore deploy needed | Firestore is schemaless; your app just reads/writes the new structure. Deploy **hosting** so users get the new code. |

So: change app code → deploy **hosting**. Change rules or indexes → deploy **firestore** (rules or indexes). Adding new fields/collections in code only needs a **hosting** deploy, not a Firestore one.

---

## Image upload (Catalog) blocked by CORS?

Image uploads use **Cloud Functions** so the browser never talks to Storage directly (no CORS). Deploy functions once:

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

Then deploy hosting as usual (`npm run build` then `firebase deploy --only hosting`). Full options (Cloud Functions vs CORS): **[STORAGE_CORS_SETUP.md](STORAGE_CORS_SETUP.md)**.

---

## Project Structure & File Purposes

### Root Entry & Config

| File | Purpose |
|------|--------|
| **index.html** | Single HTML shell: title "ZenFlow Spa Manager", Tailwind CDN, Inter font, `#root` mount point, and loading placeholder until React hydrates. |
| **index.tsx** | App entry: mounts React with StrictMode, wraps app in ErrorBoundary, subscribes to Firebase auth, provides UserContext, and mounts `App`. Handles missing root element gracefully. |
| **App.tsx** | Main app: auth + outlet checks via ProtectedRoute, loads Firestore data with `useFirestoreData`, manages active tab and POS-from-appointment flow. Renders Layout and tab content (Dashboard, POS, CRM, Staff, Services, etc.) with feature-locking and commission/points logic. |
| **vite.config.ts** | Vite config: dev server (port 5173), React plugin, env loading for `GEMINI_API_KEY`/`API_KEY`, path alias `@` → project root. |
| **tsconfig.json** | TypeScript: target ES2022, ESNext modules, JSX react-jsx, path `@/*` → `./*`, allowJs, noEmit. |
| **package.json** | Dependencies (React 19, Firebase, Recharts, @google/genai, recharts) and scripts: dev, build, preview, deploy, deploy:all, deploy:firestore, deploy:rules, deploy:indexes. |
| **constants.tsx** | Shared constants: `COLORS`, nav **Icons** (Dashboard, Calendar, Clients, POS, Finance, Services, Staff, etc.), and initial seed data: `INITIAL_SERVICES`, `INITIAL_PRODUCTS`, `INITIAL_PACKAGES`, `INITIAL_STAFF`, `INITIAL_ROLE_COMMISSIONS`, `INITIAL_REWARDS`, `INITIAL_EXPENSE_CATEGORIES`. |
| **types.ts** | Global TypeScript types: `TransactionType`, `Service`, `Product`, `Package`, `Reward`, `Staff`, `Client`, `Appointment`, `CartItem`, `Transaction`, `OutletSettings`, `Outlet`, `RoleCommission`, `DashboardStats`, etc. |
| **metadata.json** | App metadata: name "ZenFlow Spa Manager", short description, requestFramePermissions. |

---

### Firebase & Firestore

| File | Purpose |
|------|--------|
| **firebase.ts** | Firebase init (app, Auth, Firestore, Analytics in browser). Typed collection refs (`outletsCol`, `staffCol`, `clientsCol`, etc.), `createOutletQuery`, `OutletQueries` helpers, and `ensureOutletID` for multi-tenant writes. |
| **firebase.json** | Firebase project config: hosting from `dist` with SPA rewrites and cache headers; Firestore rules/indexes paths and region. |
| **.firebaserc** | Firebase project alias: default project id (e.g. razak-residence-2026). |
| **firestore.rules** | Security rules: auth required; users read/write own `users/{userId}`; outlets read all, write admin; staff, clients, appointments, transactions, services, products, packages, rewards scoped with outletID and auth. |
| **firestore.indexes.json** | Firestore composite indexes (empty by default; add indexes here when needed for queries). |
| **firestore-schema.ts** | Documentation of Firestore collections structure (outlets, staff, clients, appointments, transactions, services, products, packages, rewards): fields, indexes, multi-tenant usage. Not executed at runtime. |
| **storage-cors.json** | CORS config for Firebase Storage (used so image uploads from the web app are allowed). See [STORAGE_CORS_SETUP.md](STORAGE_CORS_SETUP.md). |
| **.firebase/** | Firebase CLI cache (e.g. hosting cache); do not edit manually. |

---

### Components (`components/`)

| File | Purpose |
|------|--------|
| **ErrorBoundary.tsx** | React error boundary: catches JS errors in children, shows fallback UI with message and "Refresh Page" button; optional expandable error details. |
| **Layout.tsx** | Main shell: sidebar nav (all tabs), mobile top nav and profile menu, header with active tab title and desktop profile dropdown (Settings, Sign Out). Displays shop name and user initials/role. |
| **ProtectedRoute.tsx** | Guard wrapper: shows loading while auth/user-data load; if not authenticated renders Login; if no `outletId` shows "Unauthorized" message; otherwise renders children. |
| **Toast.tsx** | Toast notification: success/error/info/warning styles, auto-dismiss after duration, close button, used for login/forgot-password feedback. |

---

### Contexts (`contexts/`)

| File | Purpose |
|------|--------|
| **UserContext.tsx** | Provides current user’s Firestore profile: `outletId`, `outletName`, `role`, loading, error. Fetches `users/{uid}` and optionally outlet doc. Logs out and shows message if user has no outletId. Exposes `refreshUserData`. |

---

### Hooks (`hooks/`)

| File | Purpose |
|------|--------|
| **useAuth.ts** | Auth state hook: `user`, `loading`, `isAuthenticated`, `logout`; subscribes to Firebase auth state. |
| **useFirestoreData.ts** | Single hook for all outlet data: clients, staff, appointments, transactions, services, products, packages, rewards. Syncs with Firestore (load + optional listeners), exposes CRUD handlers (add/update/delete) for each entity, all scoped by `outletID`. |

---

### Services (`services/`)

| File | Purpose |
|------|--------|
| **authService.ts** | Firebase Auth: `login`, `logout`, `resetPassword`, `getCurrentUser`, `onAuthStateChange`; maps Firebase error codes to user-friendly messages. |
| **firestoreService.ts** | Firestore CRUD layer: `clientService`, `staffService`, `appointmentService`, `transactionService`, `serviceService`, `productService`, `packageService`, `rewardService`. Each has get/add/update/delete methods scoped by outletID. Also `setCurrentOutletID` / `getCurrentOutletID`. |
| **geminiService.ts** | Gemini AI: `getBusinessInsights(transactions)` for spa business insights; `generateReminderMessage(...)` for appointment reminders (Email/SMS/Both). Uses `GEMINI_API_KEY`. |

---

### Pages (`pages/`)

| File | Purpose |
|------|--------|
| **Login.tsx** | Login screen: email/password form, "Forgot password" flow, toast notifications, branding; calls `authService.login` / `resetPassword`. |
| **Dashboard.tsx** | Home: revenue/expenses/profit/client stats, revenue chart (Recharts), today’s appointments, AI insights button (Gemini), pending appointment reminders with "Send reminder" (marks reminder sent). |
| **POS.tsx** | Point of Sale: cart (services/products/packages), staff assignment and commission, client selection, payment method, complete sale; supports "sale from appointment" flow. |
| **CRM.tsx** | Client management: client list, add/edit client, points, transaction history, rewards program (update redemption costs). Optional export (lockable by feature). |
| **Staff.tsx** | Staff roster: list, add/edit/delete staff, role commissions config, ties to transactions/commissions. Feature lock for manage-staff. |
| **Services.tsx** | Service catalog: services, products, packages; categories; add/edit/delete for each. Feature lock for edit-service. |
| **AppointmentsCalendar.tsx** | Appointments calendar: view by day, add appointment, update status (e.g. complete → opens POS), send reminder, outlet reminder settings. |
| **Transactions.tsx** | Transaction list: filter view, edit/delete (with optional delete lock). |
| **SalesReports.tsx** | Sales reports: breakdown by staff, category, etc. (uses transactions + staff + categories). |
| **Finance.tsx** | Expense tracking: add/delete transactions (expenses), expense categories; optional feature lock. |
| **Settings.tsx** | Outlet settings: shop name, outlet mode, admin/auth, locked features, payment methods, reminder (on/off, timing, channel). |

---

### Config & Misc (root)

| File | Purpose |
|------|--------|
| **.gitignore** | Ignores logs, node_modules, dist, *.local, .vscode, .idea, common editor/OS files. |
| **.npmrc** | NPM config (if present; e.g. registry or engine settings). |
| **LOCALHOST_CREDENTIALS.txt** | Local/dev credentials reference (keep out of version control in production). |
| **AUTHENTICATION_SETUP.md** | Docs: how to set up Firebase Authentication. |
| **BLANK_PAGE_FIX.md** | Docs: troubleshooting blank page issues. |
| **DEFAULT_USER_CREDENTIALS.md** | Docs: default test user for development. |
| **DEPLOY_FIRESTORE.md** | How to deploy Firestore (rules/indexes). |
| **DEPLOY_FIX.md** | Deployment troubleshooting. |
| **DEPLOYMENT_GUIDE.md** | Full deployment steps (hosting + Firestore). |
| **FIRESTORE_*.md** | Firestore setup, integration, rules fixes, schema overview, setup completion notes. |
| **LOGIN_FIX_CHECKLIST.md** | Login troubleshooting checklist. |
| **QUICK_START.md** | Short quick-start instructions. |
| **SETUP_USER_EXAMPLE.md** | Example for creating/setup users. |
| **TROUBLESHOOTING_LOGIN.md** | Login-specific troubleshooting. |
| **USER_SETUP_GUIDE.md** | User account and outlet assignment guide. |

---

### Nested Project

| Path | Purpose |
|------|--------|
| **Spa-system-2026/** | Separate smaller app (own package.json, Vite, App, types): likely an earlier or alternate build; not part of the main ZenFlow 2.0 app runtime. |

---

## Summary

- **Entry:** `index.html` → `index.tsx` → `App.tsx` (with ProtectedRoute and Firestore data).
- **Auth:** Firebase Auth + `authService` + `useAuth`; user profile and outlet from Firestore via **UserContext**.
- **Data:** All business data lives in Firestore; **firestoreService** does CRUD; **useFirestoreData** exposes state and handlers to the app.
- **UI:** **Layout** (sidebar + header) and **pages/** for each section; **ErrorBoundary** and **Toast** for robustness and feedback.
- **Config:** `firebase.ts`, `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` define backend and security; `constants.tsx` and `types.ts` centralize shared data and types.

For first-time setup, use **QUICK_START.md**, **AUTHENTICATION_SETUP.md**, and **USER_SETUP_GUIDE.md**. For deployment, use **DEPLOYMENT_GUIDE.md** and **DEPLOY_FIRESTORE.md**.
