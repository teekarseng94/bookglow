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

Verification additions: `migration/validate/superadmin-phase1-local.mjs`, `apps/merchant-portal/playwright.local-phase1.config.mjs`, `apps/merchant-portal/test/visual/superadmin-phase1.local.spec.mjs`, and `apps/merchant-portal/services/sharedSupabaseClient.test.ts`. The shared typing repair is in `packages/supabase/src/client.ts`; the customer change is test cleanup only in `apps/customer-site/src/legal/privacyPolicy.test.tsx`.

`apps/merchant-portal/App.tsx`, Step 1/Step 2 migrations and services, generated database schema types, and existing remote-access authorization were not changed.

## 3. Search entity types and authoritative sources

All large-data search runs in `platform_global_search`; the browser never downloads booking, sale, membership, monitoring, support, or audit tables for suggestion filtering. Queries are trimmed to 120 characters, debounced by 300 ms, LIKE metacharacters are escaped, and results are capped at 1–10 per entity group (the UI requests five).

| Entity type | Authoritative source | Match behavior | Destination |
| --- | --- | --- | --- |
| Outlet name / ID | `public.outlets` | Name contains; ID contains/prefix ranked | Shared inspector, Summary |
| Merchant email / user name | `public.outlet_members`, `public.users`, `public.outlets`, `public.platform_account_controls` | Email/name contains; exact/prefix email ranked | Shared inspector, Accounts |
| Booking identifier | `public.appointments` | Identifier prefix | Existing Schedule detail after validated remote access |
| Sale/transaction identifier | `public.transactions` | Identifier prefix | Existing Transactions detail after validated remote access |
| Support case identifier | `public.platform_support_cases` | Case UUID prefix | Support workspace with selected case |
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

## 6. Hardening completed on 18 September 2026

- **Shared Supabase typing:** replaced the hand-written `Promise<unknown>` lock signature with the SDK's generic `LockFunc`. A lock must return the same `R` supplied by its callback. The incompatible lock also caused cascading `createClient<Database>` schema/nullability diagnostics. Using the SDK contract resolves all of them without casts, schema regeneration, dependency changes, or runtime changes. Persistence, PKCE, URL detection and native storage behavior are unchanged. A new compile-checked regression test covers number/string results and rejected callbacks.
- **Search:** invalidates an old request immediately when the query changes (including the debounce interval); keyboard order matches rendered entity-group order; mobile search uses the shared focus trap and a persistent restoration target. Operation deep links use the same local calendar day as the Jobs date inputs.
- **Inspector:** a zero-minimum grid column prevents 320px content/header overflow; long titles and identifiers wrap; narrow headers retain visible actions. Confirmation dialogs prevent the underlying inspector from closing while a privileged action is pending.
- **Legacy outlet URLs:** consume the old `outlet` parameter into canonical inspector parameters once, preventing a closed inspector from reopening on refresh.
- **Sale deep links:** do not mount the mobile detail sheet on desktop. Previously its hidden panel left a visible backdrop which intercepted the remote-access exit button.
- **Validation-only customer repair:** the full customer suite exposed three accumulated Privacy Policy links, although the file passed in isolation. Added explicit Testing Library cleanup after each privacy-policy test. No customer product code was changed.

The initial implementation and some early repairs were included by the intervening existing commit `374ea36`. That commit was preserved, not amended. This follow-up contains only verification/hardening changes and this report.

## 7. Verified against the isolated database

### Target and safety

Docker Desktop reported a **Linux** engine. All database work used `supabase_db_bookglow-local`, API `http://127.0.0.1:55431`, database `127.0.0.1:55432`, Studio `http://127.0.0.1:55433`.

Before applying migrations, existing auth identities were checked: all seven used `example.test`. Existing outlets were the local authorization fixtures and the existing Phase 4 test-script fixture; client/appointment records were local fixtures. No production data was found. No reset, volume deletion, remote SQL editor, or linked-project migration command was used.

The repeatable verifier additionally rejects any API/DB endpoint other than the expected loopback ports and refuses databases containing non-test-domain identities. It creates randomly namespaced local fixtures and four separately authenticated identities: platform administrator, merchant owner, manager, and customer. Test credentials remain in process memory; they are not committed. Fixtures are deliberately retained only in the disposable local database for diagnosis.

### Migration execution and recorded history

Commands run from the repository root:

```powershell
docker info --format '{{.OSType}}'
& node_modules/@supabase/cli-windows-x64/bin/supabase.exe migration up --help
& node_modules/@supabase/cli-windows-x64/bin/supabase.exe migration up --local --workdir migration
docker exec supabase_db_bookglow-local psql -U postgres -d postgres -c "select version,name from supabase_migrations.schema_migrations where version >= '20260913165153' order by version;"
```

Step 1 and Step 2 were already genuinely recorded. The CLI applied all four pending migrations in chronological order, without manually marking anything applied.

| Version | Migration | Result |
| --- | --- | --- |
| 20260913165153 | superadmin_step1_reliability | Already applied; history verified |
| 20260913185856 | superadmin_step2_operations | Already applied; history verified |
| 20260914104830 | monitoring_read_sanitization | Already applied; history verified |
| 20260914110322 | edge_function_service_role_grants | Already applied; history verified |
| 20260915140000 | hitpay_platform_billing | Applied successfully |
| 20260915170000 | platform_delete_outlet | Applied successfully |
| 20260915180000 | merchant_auto_workspace_onboarding | Applied successfully |
| 20260918010000 | superadmin_phase1_search_inspector | Applied successfully |

### Actual authorization results

```powershell
node migration/validate/superadmin-phase1-local.mjs
# PASS: 98 real local database authorization assertions
```

These are real password-authenticated REST/RPC requests, not mocked migration contracts. Service-role access is confined to creating local test identities; the tested authorization requests use each identity's own session.

Verified:

- Admin search/inspector success, exact entity/outlet associations, outlet-scoped accounts and authoritative subscription data.
- Search field allow-list and omission of private support descriptions, provider identifiers and private operation/audit metadata.
- Owner, manager, customer and anonymous rejection for search, inspector, support reads/mutations, overview/onboarding/integration/job administration, outlet suspension and remote access.
- Private account-control, operation, audit, support/history and billing-event table reads denied/empty for unauthorized identities.
- Search minimum length, escaped LIKE metacharacters, lower per-group limit and upper clamp.
- Six search indexes exist and are valid/ready. A diagnostic EXPLAIN with sequential scans disabled demonstrates that the booking-prefix predicate can use its index. This is **index eligibility**, not a production-scale performance benchmark.
- Admin outlet suspension persists and is observed by the owner's existing session; the fixture is restored afterward.
- Missing-outlet remote selection and cross-outlet support references are rejected.
- Unauthorized audit updates cannot alter the persisted audit record.

This suite is Phase 1 authorization regression coverage, not a claim that every pre-existing Step 1/2 Edge Function mutation has been re-certified.

## 8. Verified through authenticated UI

```powershell
cd apps/merchant-portal
node node_modules/@playwright/test/cli.js test --config playwright.local-phase1.config.mjs
# 7 passed (1.2m)
```

The dedicated configuration uses port 5187, a fresh browser context and a disposable platform-admin login through the real login form. It never reuses `test/.auth/merchant.json`. Vite receives only the local URL and local anon key. Browser requests to non-loopback hosts are blocked. The backend is not replaced with harness data.

| Viewport | Authenticated result |
| --- | --- |
| 320 × 568 | Passed: mobile search and full-height inspector |
| 390 × 844 | Passed: mobile search and full-height inspector |
| 768 × 1024 | Passed: responsive search and right-side inspector |
| 1440 × 1000 | Passed: desktop search and right-side drawer |

Verified on real local responses:

- Header search, outlet/account grouping, outlet selection and user-to-Accounts navigation.
- All seven inspector tabs, page/dialog overflow checks, refresh and selected URL state.
- Support case selection, exact operation/date/outlet selection and audit event navigation.
- Outlet switching, browser back, empty evidence and missing-outlet errors.
- Booking and sale identifiers route to the correct merchant screens after validated remote access; sale detail shows the exact transaction ID.
- Correct remote banner and working exit with session selection cleared.
- Escape, focus containment/restoration, mobile search error recovery, loading state and a real suspension confirmation that cannot close while busy.
- Legacy outlet URLs stay closed after closing/reloading the inspector.

Loading/busy tests delay and then continue actual local requests. The error test aborts a local search request; it does not fabricate a successful backend response. The suspension affects only the new local fixture and is restored.

Screenshots were captured in ignored `apps/merchant-portal/test-results/` directories. Mobile search/inspector and tablet/desktop inspector screenshots were visually inspected. No page-level or inspector horizontal overflow was detected. Long metadata may use deliberate ellipsis; tab strips scroll internally rather than overflowing the page.

## 9. Static/harness-only verification

The existing deterministic harness and its three checked-in images remain supplemental. Its previously reported run comprised two harness tests plus a no-op auth setup; it was **not** an authenticated database test. It was not used as evidence for the authenticated results above.

The focused unit suite covers debounce/stale responses, keyboard ordering, mapping redaction, URL state, stale inspector responses and SQL migration contracts. Such tests supplement, not replace, the real local database and UI runs.

## 10. Final validation results

Runtime: **Node 22.23.2**, matching the repository's Node 22 declaration. The available Node 22 executable directory was prepended to PATH so npm subprocesses also used Node 22:

```powershell
$env:PATH='D:\npm-cache\_npx\52027bd8fc0022aa\node_modules\node\bin;'+$env:PATH
node --version
npm run typecheck
npm --prefix apps/merchant-portal test -- --reporter=dot
npm --prefix apps/customer-site test -- --reporter=dot
npm --prefix apps/merchant-portal test -- components/admin/GlobalSuperAdminSearch.test.tsx components/admin/OutletInspector.test.tsx components/admin/OutletInspectorContext.test.tsx services/superAdminPhase1Service.test.ts services/superadminMigration.test.ts services/sharedSupabaseClient.test.ts --reporter=dot
npm run build
git diff --check
git status --short
```

| Check | Final result |
| --- | --- |
| All four shared-package typechecks | Passed |
| Merchant typecheck | Passed |
| Customer typecheck | Passed |
| Full merchant tests | 47 files, 172 tests passed |
| Full customer tests | 10 files, 71 tests passed |
| Focused Phase 1/shared-client tests | 6 files, 35 tests passed (subset of merchant total) |
| Real local DB verifier | 98 assertions passed |
| Authenticated local Playwright | 7 tests passed |
| Merchant production build | Passed, 15.99s |
| Customer production build | Passed, 3.93s |
| Whitespace check | Passed |

The earlier customer-suite failure and test-only import/locator mistakes were corrected and rerun; the table reports final results. Existing lockfiles and dependency versions were not changed.

Non-blocking warnings: aged Browserslist data, customer bundle over Vite's 500 kB advisory threshold, Windows line endings, and output directories outside the app root not automatically emptied. No broad dependency upgrade or destructive output cleanup was performed. Release packaging should build in a clean checkout/output directory.

## 11. Readiness, limits and remaining production prerequisites

**Phase 1 local acceptance: passed.** The typing, isolated migration, authorization and authenticated responsive-UI blockers are resolved. This is ready for staging/release review, not a claim that production infrastructure was verified or permission to deploy.

Remaining prerequisites:

1. Verify the existing `account-admin` and `billing-admin` functions and their environment in the explicitly approved staging/deployment target. They were not served end-to-end in this local run. Billing provider readiness correctly remains unavailable when that endpoint is unavailable; database subscription data is still shown.
2. Exercise existing account invitation/recovery/global-account/ownership actions in isolated staging with safe mail/provider configuration before production sign-off. No real mail or billing action was performed here.
3. Validate search quality/latency with representative non-production volumes. Index existence/eligibility is not proof of production-scale performance.
4. Confirm the deployed frontend's public Supabase URL/anon key and customer-site origin. No deployment-platform secret/configuration state was inspected or changed in this Phase 1 run.

Booking/sale references are authoritative record identifiers, and support cases use UUID identifiers. There is no newly invented human-readable numbering system and no schema change to add one. MRR, integrations and scheduler state retain the existing evidence-quality limitations; unavailable information is not represented as success.

The temporary approval-service usage-limit interruption was cleared when work resumed. It is not a remaining Docker or database blocker.

## 12. Ordered deployment checklist (not executed)

1. Complete the staging prerequisites above, review the intended commit, and confirm the approved target and a backup/recovery plan. Do not reuse these local fixture credentials or copy production secrets into tests.
2. Compare the target's genuine migration history. Apply all pending repository migrations chronologically through `20260918010000_superadmin_phase1_search_inspector.sql`, including Step 1/2 and intervening dependencies where absent. Confirm `pg_trgm` availability and function grants, then rerun authorization checks against isolated staging before production approval.
3. No new Phase 1 Edge Function is introduced. Ensure the existing `account-admin` and `billing-admin` deployments match repository code; deploy those only if missing/outdated. Keep service credentials server-side. Their server environment uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; billing additionally reads the existing HitPay configuration (`HITPAY_API_KEY`, `HITPAY_WEBHOOK_SALT`, `HITPAY_PLAN_ID`, optional provider/plan settings and `DASHBOARD_APP_URL`). These names are not a claim that production values were checked.
4. Verify merchant frontend `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy anon alias), and `VITE_CUSTOMER_SITE_URL` in the deployment platform. An `.env.production` file is not inherently required. Never put a service-role/provider secret in a Vite variable.
5. Build with Node 22 in a clean release checkout and deploy the merchant frontend **after** its database prerequisites. No customer product change requires deployment for this follow-up; the customer production build was a regression check.
6. With explicit deployment authorization, smoke-test admin search/inspector/deep links and remote exit in the approved target. Preserve a frontend rollback path; do not remove audit history to roll back UI code.

## 13. Final confirmations

- Phase 2–8 were not started.
- Production was not used for verification, mutated, migrated, deployed, or queried through the SQL editor.
- No push, external message, live billing action, new signing key or Android release work was performed.
- No environment file, secret, keystore, production record, generated log or new screenshot artifact belongs in the follow-up commit.
- Existing work and the intervening commit were preserved.
