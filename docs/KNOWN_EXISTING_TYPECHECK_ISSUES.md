# Known Merchant TypeScript Issues

**Status:** Cleared as of 2026-07-16 type-safety stabilization.

Merchant `npm run typecheck` (`tsc --noEmit`) now exits **0**.

Previously documented legacy errors (ErrorBoundary without `@types/react`, missing domain fields, prop mismatches, etc.) were repaired as compile-contract fixes only — no Firestore or business-logic changes.
