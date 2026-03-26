# Build Troubleshooting – If `npm run build` Hangs or Never Ends

This project is set up to avoid memory crashes and endless builds on Windows. If the build starts hanging again, use this checklist.

---

## 1. Tailwind content (most common cause of “never ends”)

**Symptom:** Build runs for a long time or never finishes; Tailwind warns about matching `node_modules`.

**Fix:** In `tailwind.config.js`, keep `content` limited to your app only. **Do not** use `./**/*.ts` or `./**/*.{js,ts,jsx,tsx}` (that scans `node_modules`).

**Correct pattern:**

```js
content: [
  './index.html',
  './*.{js,ts,jsx,tsx}',
  './components/**/*.{js,ts,jsx,tsx}',
  './contexts/**/*.{js,ts,jsx,tsx}',
  './hooks/**/*.{js,ts,jsx,tsx}',
  './pages/**/*.{js,ts,jsx,tsx}',
  './services/**/*.{js,ts,jsx,tsx}',
],
```

If you add new app folders (e.g. `./lib/`), add them here. Never point `content` at `node_modules`.

---

## 2. Build stuck at “transforming (N) main.js” or “transforming mount.js”

**Symptom:** Build stops at “transforming (6) main.js” or similar and doesn’t progress.

**What’s in place:**

- **vite.config.ts**
  - `build.sourcemap: false` – reduces memory.
  - `build.rollupOptions.external` – React/react-dom/react-router-dom are external (loaded via import map), so they aren’t transformed/bundled.
  - `build.rollupOptions.maxParallelFileOps: 1` – processes one file at a time to limit peak memory.
  - `manualChunks` – entry.js → `entry`, main.js → `loader`, mount.js → `mount` so the entry chain stays in small chunks.

**If it happens again:**

1. Fix Tailwind `content` (see §1).
2. Run with a clean cache:  
   `npm run build:no-cache`
3. If it still hangs, try increasing Node heap in `package.json`:  
   `"build": "cross-env NODE_OPTIONS=--max-old-space-size=24576 vite build"` (24 GB).

---

## 3. “Circular chunk” warning (recharts-vendor / main)

**Symptom:**  
`Circular chunk: recharts-vendor -> main -> recharts-vendor. Please adjust the manual chunk logic.`

**Fix:** The chunk that contains `main.js` is named `loader` (not `main`) in `vite.config.ts` to avoid this cycle. If you change `manualChunks`, don’t use the name `main` for that chunk.

---

## 4. JavaScript heap out of memory

**Symptom:** Build fails with “JavaScript heap out of memory”.

**Fixes:**

1. In `package.json`, increase heap, e.g.:  
   `"build": "cross-env NODE_OPTIONS=--max-old-space-size=20480 vite build"`  
   (20 GB; raise to 24576 if you have the RAM.)
2. Close other apps to free memory.
3. Run `npm run build:no-cache` to clear Vite cache and retry.

---

## 5. Quick checklist if the build hangs again

1. **Tailwind** – In `tailwind.config.js`, ensure `content` only lists your app paths (no `./**` that can hit `node_modules`).
2. **Cache** – Run `npm run build:no-cache`.
3. **Memory** – Increase `NODE_OPTIONS=--max-old-space-size=...` in the build script if needed.
4. **Config** – Don’t remove `sourcemap: false`, `external` for react/react-dom/react-router-dom, or the entry `manualChunks` (entry / loader / mount) without good reason.

Keeping Tailwind scoped to your app and the current Vite/Rollup settings should prevent the build from hanging or never ending.
