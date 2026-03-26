# Circular Dependency & Barrel File Scan

**Scope:** `AppBootstrap.tsx` and all its imports; entry `index.tsx`.

## Result: No circular dependency found

Tracing the import graph from `index.tsx` and `AppBootstrap.tsx`:

- **index.tsx** → `index.css`, `react`, `react-dom/client`, `react-router-dom` (HashRouter), `./components/ErrorBoundary`, `./AppBootstrap` (lazy)
- **AppBootstrap** → `./contexts/UserContext`, `./services/authService`, `./RootRoutes` (lazy)
- **UserContext** → `react`, `firebase/auth`, `firebase/firestore`, `../firebase` (db), `../services/authService` (logout)
- **authService** → `firebase/auth`, `../firebase` (auth)
- **firebase** → `firebase/*`, `./types`
- **RootRoutes** → `react-router-dom`, `./hooks/useAuth`, `./pages/Login`, `./App` (lazy)
- **useAuth** → `../services/authService`
- **App** → `react-router-dom`, `./types`, `./constants`, `./components/Layout`, `./hooks/useAuth`, `./hooks/useFirestoreData`, `./contexts/UserContext`, `./components/ProtectedRoute`, `./services/firestoreService`, `./services/setmoreSyncService`, lazy pages
- **useFirestoreData** → `../firebase`, `../services/firestoreService`, `../services/pointTransactionService`, `../types`
- **firestoreService** → `../firebase`, `../types`
- **constants** → `./types`
- **types** → (no local imports)

No file in this tree imports `AppBootstrap` or `index.tsx` (except `index.tsx` itself importing `AppBootstrap` via lazy). So there is **no cycle** back to the entry or AppBootstrap.

## Barrel files

- No app-level **index.ts** barrel files that re-export everything were found (only root `index.tsx` and `Spa-system-2026/index.tsx` as entry points).
- Barrel-style `export * from` only appears in `node_modules`, not in your source.

## Broken imports (fixed separately)

- **pages/POS.tsx**, **pages/MemberDetails.tsx**, **pages/Settings.tsx** import from `../lib/hashRouter`, but there is no `lib` folder in the project. That can cause resolve errors or odd build behavior when those chunks are built. They were updated to use `react-router-dom` instead so the build does not depend on a missing module.

---

**Conclusion:** The build hang at "transforming (1) index.tsx" is not caused by a circular dependency or barrel-file loop. Likely causes are memory pressure when transforming the entry plus heavy deps (e.g. `react-router-dom`), or Vite/Rollup configuration. The config changes (sourcemap: false, manualChunks, optimizeDeps) and fixing the missing `lib/hashRouter` imports are the recommended next steps.
