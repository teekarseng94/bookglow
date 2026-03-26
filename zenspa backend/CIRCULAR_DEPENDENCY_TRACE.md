# Circular Dependency Trace: main.tsx & AppBootstrap.tsx

## 1. main.tsx – every file it imports

| Import | Type |
|--------|------|
| `./index.css` | CSS |
| `react` | node_modules |
| `react-dom/client` | node_modules |
| `react-router-dom` (HashRouter) | node_modules |
| `./components/ErrorBoundary` | **ErrorBoundary.tsx** |
| `./AppBootstrap` | lazy (dynamic import) |

---

## 2. AppBootstrap.tsx – every file it imports

| Import | Type |
|--------|------|
| `react` | node_modules |
| `./contexts/UserContext` | **UserContext.tsx** |
| `./services/authService` | **authService.ts** |
| `./RootRoutes` | lazy (dynamic import) |

---

## 3. “Lower” files – what they import (and do they import main/AppBootstrap?)

### From main.tsx

- **components/ErrorBoundary.tsx**  
  Imports: `react` only.  
  Does **not** import main.tsx or AppBootstrap.tsx.

### From AppBootstrap.tsx

- **contexts/UserContext.tsx**  
  Imports: `react`, `firebase/auth`, `firebase/firestore`, `../firebase`, `../services/authService`.  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **services/authService.ts**  
  Imports: `firebase/auth`, `../firebase`.  
  Does **not** import main.tsx or AppBootstrap.tsx.

### Transitive (RootRoutes and its dependencies)

- **RootRoutes.tsx**  
  Imports: `react`, `react-router-dom`, `./hooks/useAuth`, `./pages/Login`, `./App` (lazy).  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **hooks/useAuth.ts**  
  Imports: `react`, `firebase/auth`, `../services/authService`.  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **pages/Login.tsx**  
  Imports: `react`, `../services/authService`.  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **firebase.ts** (used by UserContext and authService)  
  Imports: `firebase/*`, `./types`.  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **types.ts**  
  No local imports (only exports).  
  Does **not** import main.tsx or AppBootstrap.tsx.

- **App.tsx** (lazy from RootRoutes)  
  Imports: `react`, `react-router-dom`, `./types`, `./constants`, `./components/Layout`, `./hooks/useAuth`, `./hooks/useFirestoreData`, `./contexts/UserContext`, `./components/ProtectedRoute`, `./services/firestoreService`, `./services/setmoreSyncService`, lazy pages.  
  Does **not** import main.tsx or AppBootstrap.tsx.

---

## 4. Grep check

- Searched **contexts/**, **services/**, **components/**, **hooks/**, **pages/** for `AppBootstrap` or imports of `main`.
- **Result:** No file in those folders imports main.tsx or AppBootstrap.tsx. (The only hit was `</main>` in Layout.tsx – an HTML tag, not an import.)

---

## 5. Conclusion

**No circular dependency found.**

- main.tsx and AppBootstrap.tsx only import “lower” modules (ErrorBoundary, UserContext, authService, RootRoutes, etc.).
- None of those modules (or their transitive dependencies) import main.tsx or AppBootstrap.tsx back.

**No change is required** (no code moved to `src/shared`). If the build still fails, the cause is likely memory or transform order, not a dependency loop between main/AppBootstrap and contexts/services.
