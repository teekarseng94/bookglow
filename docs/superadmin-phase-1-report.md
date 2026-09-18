# Superadmin UX/UI Phase 1 Implementation Report

**Date:** 18 September 2026  
**Project:** Bookglow merchant portal  
**Scope:** Global superadmin search, reusable outlet inspector, navigation/route integration, focused tests, and documentation only.

## 1. Scope implemented

### Implemented

- Added a compact global platform search to the shared superadmin header, with a desktop field and mobile expansion panel.
- Added a server-bounded, platform-admin-only search RPC with per-entity result limits.
- Added one reusable outlet inspector, backed by shared URL state, and removed the incompatible page-local Outlets & Access detail drawer.
- Added Summary, Onboarding, Accounts, Billing, Integrations, Support, and Audit inspector tabs.
- Reused existing Step 1 and Step 2 services for remote access, outlet suspension/restoration, account administration, ownership transfer, billing readiness, onboarding, support, integrations/jobs, and audit history.
- Added deep-link routing for outlet/tab selection and selected support, operation, and audit records.
- Added validated booking/sale navigation: remote access is established by the existing server RPC before the merchant detail route opens.
- Added isolated component and browser coverage, including 320 px, 390 px, 768 px, and 1440 px viewports.

### Not implemented

- No Phase 2–8 work was started.
- No general superadmin redesign was performed.
- No checkout, cancellation, retry, or other new billing/job mutation was added.
- No production migration, deployment, or production data mutation was performed.

## 2. Files created and modified

### Created

- `apps/merchant-portal/components/admin/GlobalSuperAdminSearch.tsx`
- `apps/merchant-portal/components/admin/GlobalSuperAdminSearch.test.tsx`
- `apps/merchant-portal/components/admin/OutletInspector.tsx`
- `apps/merchant-portal/components/admin/OutletInspector.test.tsx`
- `apps/merchant-portal/components/admin/OutletInspectorContext.tsx`
- `apps/merchant-portal/components/admin/OutletInspectorContext.test.tsx`
- `apps/merchant-portal/services/superAdminPhase1Service.ts`
- `apps/merchant-portal/services/superAdminPhase1Service.test.ts`
- `apps/merchant-portal/test/visual/superadmin-phase1-harness.html`
- `apps/merchant-portal/test/visual/superadmin-phase1-harness.tsx`
- `apps/merchant-portal/test/visual/superadmin-phase1.spec.ts`
- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-search-mobile-390x844.png`
- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-inspector-mobile-390x844.png`
- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-inspector-desktop-1440x1000.png`
- `migration/supabase/migrations/20260918010000_superadmin_phase1_search_inspector.sql`
- `docs/superadmin-phase-1-report.md`

### Modified

- `apps/merchant-portal/components/SuperAdminLayout.tsx`
- `apps/merchant-portal/pages/AppointmentsCalendar.tsx`
- `apps/merchant-portal/pages/SuperAdminAudit.tsx`
- `apps/merchant-portal/pages/SuperAdminDashboard.tsx`
- `apps/merchant-portal/pages/SuperAdminIntegrationsJobs.tsx`
- `apps/merchant-portal/pages/SuperAdminOnboarding.tsx`
- `apps/merchant-portal/pages/SuperAdminSubscribers.tsx`
- `apps/merchant-portal/pages/SuperAdminSupport.tsx`
- `apps/merchant-portal/pages/Transactions.tsx`
- `apps/merchant-portal/services/auditService.ts`
- `apps/merchant-portal/services/superadminMigration.test.ts`

`apps/merchant-portal/App.tsx`, the Step 1/Step 2 migrations and services, shared auth/database packages, and existing remote-access routing were reviewed but were not changed unless listed above.

## 3. Search entity types and authoritative sources

All large-data search runs in `platform_global_search`; the browser never downloads booking, sale, membership, monitoring, support, or audit tables for suggestion filtering. Queries are trimmed to 120 characters, debounced by 300 ms, LIKE metacharacters are escaped, and results are capped at 1–10 per entity group (the UI requests five).

| Entity type | Authoritative source | Match behavior | Destination |
| --- | --- | --- | --- |
| Outlet name / ID | `public.outlets` | Name contains; ID contains/prefix ranked | Shared inspector, Summary |
| Merchant email / user name | `public.outlet_members`, `public.users`, `public.outlets`, `public.platform_account_controls` | Email/name contains; exact/prefix email ranked | Shared inspector, Accounts |
| Booking reference | `public.appointments` | Reference prefix | Existing Schedule detail after validated remote access |
| Sale/transaction reference | `public.transactions` | Reference prefix | Existing Transactions detail after validated remote access |
| Support case number | `public.platform_support_cases` | Case UUID prefix | Support workspace with selected case |
| Operation/correlation ID | `public.platform_admin_operations`, `public.platform_monitoring_events` | Operation UUID or correlation prefix | Integrations & Jobs with record/date/outlet filters |
| Audit ID / operation ID | `public.platform_audit_events` | Audit UUID or operation UUID prefix | Audit page with exact event/outlet filter |

No requested entity type was implemented with a browser full-table scan. Search suggestions expose only type, identifier/title, matched text, outlet, status, and timestamp. Support descriptions, internal notes, customer details, billing payloads, secrets, tokens, passwords, and payment data are not selected.

## 4. Outlet inspector tabs and entry points

### Tabs

- **Summary:** outlet identity, portal/onboarding state, primary owner, merchant contact, booking path, timezone, business-hours evidence, active-user count, subscription state, and recent server-backed activity.
- **Onboarding:** the existing Step 2 readiness model, missing requirements, activation/booking verification evidence, and a link to the full tracker.
- **Accounts:** membership/account/invitation state, last sign-in, secure invitations, role/membership/global-account actions, ownership transfer, recovery, session blocking, and existing registered-account linking.
- **Billing:** provider/readiness state, subscription state, explicit trial state, current period, and MRR only when recurring source metadata is marked reliable. The tab is read-only.
- **Integrations:** configured/verified evidence, sanitized latest error, and related job/operation records.
- **Support:** open/recent outlet cases, priority, status, assignee, last activity, and create-case navigation.
- **Audit:** recent server-backed outlet events with action, actor, timestamp, outcome, and reason, plus a filtered full-log link.

### Entry points

- Operations Overview attention rows
- Outlets & Access directory
- Onboarding readiness rows
- Support case detail
- Integrations & Jobs rows
- Global search outlet results
- Global search user results (opens Accounts)
- Direct URL state: `inspectOutlet=<id>&inspectTab=<tab>`

The selected outlet and tab live in router query state, not local storage. Opening pushes navigable state; closing clears it with a replace; browser back and refresh therefore retain predictable behavior. A request generation guard prevents an older outlet response from replacing a newly selected outlet.

## 5. Authorization and privacy safeguards

- Both new RPCs are `SECURITY DEFINER` with fixed search paths and begin with `public.is_platform_admin()` authorization.
- Execute privileges are revoked from `PUBLIC` and `anon`; only `authenticated` can invoke, and the RPC performs the platform-admin decision server-side.
- Search queries are not written to audit or monitoring records.
- Search and inspector browser mappers use explicit field allow-lists and discard unknown fields.
- Account actions continue through existing platform RPCs or the existing `account-admin` Edge Function; mutation logic was not reimplemented in the inspector.
- Outlet suspension/restoration, ownership transfer, global/member account changes, session blocking, and outlet deletion retain existing server validation and operator confirmation/reason requirements.
- Booking and sale navigation waits for the existing `platform_remote_access` validation/audit flow before opening a merchant route.
- The existing `RemoteAccessBanner` remains rendered from the validated remote-access context in `App.tsx`; it was not moved or weakened.
- Public booking is opened only when both a configured customer-site origin and booking slug are available.
- Integration evidence continues to use the existing sanitized Step 2 read model. Provider payloads and credentials are not exposed.
- Privileged decisions are not stored in `localStorage`. URL outlet IDs are navigation state only and never authorization evidence.

## 6. Responsive and accessibility checks

The isolated Playwright harness checked the search/results panel and open inspector at:

- 320 × 568
- 390 × 844
- 768 × 1024
- 1440 × 1000

At each viewport, `document.documentElement.scrollWidth <= clientWidth` passed before and after opening the inspector. Mobile uses a compact Search button and a bounded expansion panel; the inspector becomes a full-width, full-height sheet. Desktop uses a right-side drawer. Inspector tabs scroll inside their own strip without causing page-level overflow.

The shared `AppDrawer`/`AppModal` interaction layer provides focus trapping, focus restoration, Escape close, labelled dialogs, and busy-state close protection. Search supports focus, Arrow Up/Down, Enter, Escape, labelled controls, loading status, empty/no-result/error states, and keyboard-selected results.

## 7. Tests executed and exact results

### Tested locally

1. Focused Phase 1 unit/component/static migration tests:

   ```text
   npx vitest run components/admin/GlobalSuperAdminSearch.test.tsx components/admin/OutletInspectorContext.test.tsx components/admin/OutletInspector.test.tsx services/superAdminPhase1Service.test.ts services/superadminMigration.test.ts
   Test Files  5 passed (5)
   Tests       32 passed (32)
   ```

   Coverage includes debounce, loading/empty/error/grouped search results, keyboard behavior, result routing, validated remote-access ordering, result redaction, platform-admin SQL contracts, shared inspector entry points, outlet/tab URL state, close/back behavior, scoped loading, stale-response prevention, Escape close, and the remote-access banner contract.

2. Full merchant portal Vitest suite:

   ```text
   npm test
   Test Files  46 passed (46)
   Tests       169 passed (169)
   ```

3. Isolated Playwright Phase 1 browser tests:

   ```text
   npx playwright test test/visual/superadmin-phase1.spec.ts --project=desktop
   3 passed
   ```

   This comprises one no-op auth setup (the existing local state file was present) plus two isolated Phase 1 tests. The harness replaces backend methods with local deterministic data and does not contact or mutate production.

### Requires isolated database verification

- Applying the new migration to an isolated Supabase database.
- Executing both new RPCs as a platform administrator and as a non-admin to verify positive and denied paths against migrated data.
- Verifying query plans and representative result quality/latency with production-like, non-production data volumes.
- Verifying booking, sale, support, operation, and audit deep links with realistic isolated records.
- Exercising Step 1/Step 2 privileged mutations end to end against isolated Edge Functions and database policies. Local tests verify contracts/mocks; they do not prove deployed infrastructure behavior.

## 8. Build and typecheck results

### Production build

```text
npm run build
2549 modules transformed
Build succeeded in 28.93s
```

### Typecheck

```text
npm run typecheck
Exit code: 1
```

No Phase 1 file reports a TypeScript error. The command remains blocked by two shared-package errors in `packages/supabase/src/client.ts`:

- line 71: Supabase client schema generic is not assignable to `BookglowSupabaseClient`
- line 72: auth lock returns `Promise<unknown>` instead of generic `Promise<R>`

These errors existed before the Phase 1 changes and were not altered because changing shared client typing is outside this phase. The successful Vite production build does not replace the failed standalone typecheck; both outcomes are reported separately.

### Repository checks

```text
git diff --check
Exit code: 0

git status --short
Only the Phase 1 files listed in this report are modified or untracked.
```

Git emitted Windows line-ending and inaccessible global-ignore warnings, but no whitespace error was reported.

## 9. Visual artifacts

- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-search-mobile-390x844.png`
- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-inspector-mobile-390x844.png`
- `apps/merchant-portal/test/visual/artifacts/superadmin-phase1-inspector-desktop-1440x1000.png`

The artifacts use isolated deterministic data and contain no production or customer records.

## 10. Known limitations

- The migration has been statically tested but not applied to an isolated database in this worktree.
- Search result quality and index performance have not been measured with production-scale data.
- Booking and sale “reference” currently means the authoritative appointment/transaction ID because no separate canonical reference-number column exists in the inspected schema.
- Support case “number” currently means the authoritative support case UUID.
- MRR stays unavailable unless the latest subscription row explicitly marks recurring metadata as reliable.
- Integration delivery and scheduler states retain the evidence limitations documented by Step 2; the inspector does not infer success where durable evidence is absent.
- Browser visual verification uses a deterministic harness. It verifies responsive component behavior but is not a logged-in end-to-end test against a migrated database.
- The standalone typecheck is blocked by the two shared Supabase client typing errors listed above.

## 11. Required migration and Edge Functions

### Migration required

`migration/supabase/migrations/20260918010000_superadmin_phase1_search_inspector.sql`

It adds:

- `pg_trgm` if not already installed
- search indexes for outlet/user text and reference/correlation prefixes
- `public.platform_global_search(text, integer)`
- `public.platform_outlet_inspector(text)`
- explicit function privilege grants/revocations

### Edge Functions

No new Edge Function is required. Existing remote-access/platform RPCs plus the existing `account-admin` and `billing-admin` functions are reused.

## 12. Deployment prerequisites

1. Resolve or explicitly accept the shared Supabase client typecheck blocker.
2. Apply the Phase 1 migration to an isolated environment and complete the database verification listed above.
3. Confirm `pg_trgm` can be installed in the target Supabase project.
4. Confirm the existing Step 1/Step 2 migrations, `account-admin`, and `billing-admin` functions are deployed and configured.
5. Confirm platform administrators are present in the existing authoritative admin model.
6. Confirm customer-site origin configuration before enabling the inspector’s public booking link.
7. Run a logged-in staging smoke test for all search destinations, inspector tabs, remote-access banner persistence, and privileged confirmations.
8. Apply the migration before deploying the frontend that calls the new RPCs.

## 13. Final confirmations

- Phases 2–8 were not started.
- Production was not queried for verification, mutated, migrated, deployed, or otherwise changed.
- No code was pushed and no external messages were sent.
- No live billing action was executed.
- All screenshots and automated browser data were generated locally from isolated fixtures.
