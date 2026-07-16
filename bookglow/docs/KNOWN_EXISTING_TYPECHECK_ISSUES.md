# Known Existing Merchant TypeScript Issues

The production Vite build passes. A strict `tsc --noEmit` run still reports errors that were already present outside the UI retrofit scope.

Affected legacy areas include:

- `components/ErrorBoundary.tsx`
- `hooks/useFirestoreData.ts`
- `lib/supabase.ts`
- `pages/AppointmentsCalendar.tsx`
- `pages/Marketing.tsx`
- `pages/ReportPage.tsx`
- `pages/SalesReports.tsx`
- `services/setmoreSyncService.ts`

The redesigned files `components/Layout.tsx` and `pages/Login.tsx` do not appear in the TypeScript error output.

These issues were not changed because this delivery is intentionally restricted to layout, visual structure and responsive behavior. Fixing them should be a separate logic-safe maintenance phase.
