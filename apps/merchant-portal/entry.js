/**
 * Minimal build entry: no static imports (no CSS, no React, no JSX).
 * Only a dynamic import of main so the first file Vite transforms is trivial
 * and the build does not get stuck in a circular dependency loop at entry.js.
 */
import('./src/native/androidShell')
  .then(function (shell) { return shell.initAndroidShell(); })
  .catch(function (error) { console.error('[BookGlow Auth] Android shell initialization failed.', error); });
import('./main').then(function (m) { m.mount(); });
