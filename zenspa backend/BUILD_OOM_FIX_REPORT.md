# Build OOM – Barrel Imports & Circular Dependency Scan

## Scope
- **index.tsx** (entry)
- **AppBootstrap.tsx**
- **authService.ts**
- **UserContext.tsx**

## 1. Barrel imports (folder-only imports)

**Result: None found.**

- **index.tsx**  
  - `./index.css`  
  - `./components/ErrorBoundary`  
  - `./AppBootstrap` (lazy)  
  All are **direct file** imports (no `./services` or `./contexts`).

- **AppBootstrap.tsx**  
  - `./contexts/UserContext`  
  - `./services/authService`  
  Both are **direct file** imports (specific files, not folders).

- No `services/index.*` or `contexts/index.*` barrel files exist in the project.
- Grep for `from './services'` / `from './contexts'` (folder-only) found **no matches** in `.ts`/`.tsx` files.

**No barrel imports were changed** because there were none.

---

## 2. Circular dependency (AppBootstrap / index)

**Result: No circle.**

- **authService.ts**  
  Imports: `firebase/auth`, `../firebase`  
  Does **not** import AppBootstrap or index.

- **UserContext.tsx**  
  Imports: `react`, `firebase/auth`, `firebase/firestore`, `../firebase`, `../services/authService`  
  Does **not** import AppBootstrap or index.

So **neither authService nor UserContext** import from AppBootstrap or index. There is no cycle involving the entry or AppBootstrap.

**No shared items were moved to constants** because there is no circular dependency to break.

---

## 3. If OOM persists

The heap crash is likely from **bundle size / transform memory**, not a dependency loop. Recommended next steps:

1. **Vite config**  
   Keep `sourcemap: false`, `minify: 'esbuild'`, `manualChunks`, and `optimizeDeps.include` as already set.

2. **Node memory**  
   Use a larger heap, e.g. in `package.json`:  
   `"build": "cross-env NODE_OPTIONS=--max-old-space-size=16384 vite build"`

3. **Lighter entry**  
   Consider a minimal JS entry (e.g. `entry.js`) that only imports CSS and dynamically imports the main app so the first file Rollup transforms is as small as possible.
