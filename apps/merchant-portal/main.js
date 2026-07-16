/**
 * Zero static imports. Only dynamically loads mount.tsx so that when Vite
 * transforms this file it does not pull in React or any app code (avoids OOM).
 */
export function mount() {
  import('./mount').then(function (m) {
    m.mount();
  });
}
