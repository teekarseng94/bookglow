# BookGlow Merchant — Pre-production audit

Audit date: 10 October 2026  
Branch: `audit/pre-production-2026-10-10` (local only; not pushed, not deployed)  
Production project: `uecphpjymbgtttrizhgy` (BookGlow, `ap-northeast-1`, Postgres 17.6, `ACTIVE_HEALTHY`)  
Production website: `https://bookglow.my`  
Android application id: `com.bookglow.merchant`  
Version inspected in source: versionName `1.0.11`, versionCode `13`, targetSdk `36`

The audit did not modify production merchant, customer, appointment, or transaction rows, and it did not reset Supabase, delete accounts, or deploy the website or Android app. On 10 October 2026 the follow-up applied non-destructive schema changes: an insert-only overlap trigger, Malaysia date bounds on the dashboard and monthly report functions, outlet-scoped staff and voucher reads, revoked anonymous execute on the merchant financial RPCs, and a session ban when an account-deletion request is marked completed. Those changes do not rewrite the 777 existing overlaps and do not delete financial rows.

## A. Executive summary

**Recommendation: NO-GO**

The merchant app can build a signed Play artifact in principle (`targetSdk` 36, cleartext off, `INTERNET` only), and the client fixes on this branch correct several money and reporting bugs. The database gates below are updated from production checks after the schema changes. Release is still blocked because the website and Android app have not been shipped with those client fixes, historical overlaps remain, and device and backup checks were not run.

- Two outlets already have more than 500 transactions in the rolling 62-day ledger (maximum **1,604**). The client now pages through them. That client is **not deployed**, so Finance and Transactions on the live site can still stop at the first page.
- **777** overlapping active staff/time appointment pairs remain. New inserts are rejected by a `BEFORE INSERT` trigger. Existing rows were not rewritten, and updates of those rows are still allowed.
- Staff and voucher reads are outlet-scoped for signed-in users. Anonymous booking can select public staff columns and cannot select `email`, `phone`, or voucher `secret_code`.
- Dashboard and monthly-report SQL now bucket dates in `Asia/Kuala_Lumpur`. The live website still sends UTC date bounds until the client on this branch is deployed.
- Completing an account-deletion request now bans the Auth user and deletes their sessions and refresh tokens. It does not delete outlet financial rows. An access token already issued can remain valid until it expires.
- `billing-admin` and `marketing-dispatch` source now use `platform_admins`. Those edge functions are **not deployed**.
- No release AAB was built, and no physical Android device was tested.

## B. Audit coverage

| Area | What was reviewed | Result |
| --- | --- | --- |
| Apps | `apps/merchant-portal` (Vite/React merchant + Capacitor), `apps/customer-site` (public booking, onboarding, legal) | Reviewed |
| Packages | `packages/auth-contracts`, `database-contracts`, `shared-types`, `supabase` | Reviewed |
| Android | `apps/merchant-portal/android`, `capacitor.config.ts` | Source reviewed. Release AAB **NOT TESTED** |
| Database | 44 local migrations under `migration/supabase/migrations`; live RLS, policies, RPCs, advisors | Read-only production queries |
| Edge Functions | `google-business`, `billing-admin`, `hitpay-webhook`, `stripe-webhook`, `account-admin`, `marketing-dispatch`, `invite-outlet-member`, `chatbot-webhook` | Source reviewed. Live calls **NOT TESTED** |
| CI | No `.github/workflows` | Gap |
| Tests | Merchant Vitest, customer Vitest, merchant `tsc` | Executed. See section H |
| Live integrations | Google login, Places reviews, HitPay | **NOT TESTED** live |
| Physical Android | — | **NOT TESTED** |
| Backup restore | — | **NOT TESTED**. PITR not visible from the project API used here |

Production snapshot used only as aggregates: 9 outlets, 780 clients, 5,158 transactions (2,714 sales, 153 voided), 2,342 appointments, 18 staff (2 with email or phone), 0 vouchers currently holding a secret code.

## C. Issues found

### P0 — Ledger totals stop at 500 rows

- **Module:** Finance, Transactions, Sales Reports
- **Description:** `transactionService.getInDateRange` is called with `limit: 500`. Two outlets have more than 500 rows in the last 62 days (max 1,604). Those screens sum the loaded page.
- **Root cause:** Pagination exists on the query, and the callers request a single page.
- **Files:** `apps/merchant-portal/hooks/useFirestoreData.ts`, `apps/merchant-portal/pages/SalesReports.tsx`
- **Evidence:** Read-only SQL on 10 Oct 2026: `max_txns_62d = 1604`, `outlets_over_500_in_62d = 2`. Busiest calendar month of `SALE` rows was 444, so a one-month sales report may still fit; a longer sales range will not.
- **Risk:** Understated collection, expenses, and net figures for busy outlets, including current merchants.
- **Fix status:** Fixed in the client on this branch (`collectPages` walks pages and throws if 20,000 rows is exceeded). **Not deployed.**

### P0 — Dashboard month window uses UTC dates

- **Module:** Dashboard
- **Description:** Current-month bounds were `toISOString().slice(0, 10)`. In Malaysia that turns 1 Oct 00:00 into 30 Sep and 31 Oct 00:00 into 30 Oct. SQL then filters `(timezone('UTC', t.date))::date`.
- **Root cause:** Local calendar instants were converted to UTC date strings, and the RPC compares UTC dates.
- **Files:** `apps/merchant-portal/pages/Dashboard.tsx`, `migration/supabase/migrations/20260806140000_merchant_dashboard_aggregates.sql`
- **Evidence:** Before the fix, the production functions contained `timezone('UTC', t.date)` and `make_timestamptz(..., 'UTC')`. After the fix, those three functions contain `Asia/Kuala_Lumpur` and no `timezone('UTC'`.
- **Risk:** Sales between local midnight and 08:00, and the first/last local day of the month, land in the wrong dashboard period when the bounds are UTC.
- **Fix status:** SQL applied in production on 10 Oct 2026. Client bounds on this branch use local `YYYY-MM-DD`. **Client not deployed.** The live site still passes UTC bounds into the Malaysia-time RPC until that build ships.

### P0 — Public booking can double-book

- **Module:** Appointments
- **Description:** `create_public_booking` inserts a row and does not check overlap. Merchant schedule create also omitted `end_time`.
- **Root cause:** No exclusion constraint, advisory lock, or trigger.
- **Files:** `migration/supabase/migrations/20260722030000_public_create_booking.sql`, `apps/merchant-portal/pages/AppointmentsCalendar.tsx`
- **Evidence:** Production `create_public_booking` definition does not mention overlap. Read-only count of overlapping non-cancelled staff pairs: **777**.
- **Risk:** Two customers can hold the same staff and time. Historical overlaps remain.
- **Fix status:** Client pre-check plus `end_time` on merchant create. Production trigger `appointments_reject_staff_overlap` is `BEFORE INSERT` only, so existing rows can still be edited. Verified present on 10 Oct 2026. The 777 historical pairs were not deleted. The client check only sees appointments already loaded in the browser.

### P0 — Staff and voucher policies are not tenant-safe

- **Module:** RLS
- **Description:** Live policies `staff_public_select` and `vouchers_public_select` are `USING (true AND is_current_account_enabled())` for `anon` and `authenticated`. `is_current_account_enabled()` is `auth.uid() IS NOT NULL AND NOT suspended`.
- **Root cause:** A suspension guard was ANDed onto policies that were originally public `USING (true)`.
- **Files:** `migration/supabase/migrations/20260722010000_public_staff.sql`, `20260722080000_merchant_portal_phase4_vouchers_storage.sql`, live `pg_policy`
- **Evidence:** Policy expressions read from production on 10 Oct 2026. Function body confirmed.
- **Risk:** Anonymous booking cannot list staff. Any signed-in user can read every outlet's staff email/phone and every voucher `secret_code`. No voucher currently has a code stored (count 0); the column is still granted.
- **Fix status:** Applied in production on 10 Oct 2026. Anonymous `SELECT` is limited to booking columns (`staff` has no `email` or `phone`; `vouchers` has no `secret_code` or `redemption_id`). Authenticated `SELECT` requires an enabled account and outlet membership, the current portal outlet, or platform admin.

### P0 — Anonymous execute on merchant RPCs

- **Module:** Database privileges
- **Description:** `anon` can execute `complete_pos_sale`, `void_sale_and_remove_linked_appointments`, `delete_appointment_and_linked_sale`, `merchant_dashboard_aggregates`, `_merchant_revenue_between`, and `append_platform_audit_event`.
- **Root cause:** Grants in production are wider than the `REVOKE` statements in the local migrations.
- **Evidence:** Before the fix, `has_function_privilege('anon', ..., 'EXECUTE')` was true for these merchant RPCs. After the fix it is false for all six, and true for `authenticated`. `create_public_booking` stays executable by `anon`.
- **Risk:** Other `SECURITY DEFINER` functions can still be executed by `anon`. The advisor count of 59 was taken before this revoke.
- **Fix status:** Applied in production on 10 Oct 2026 for the six merchant RPCs named above. Public booking RPCs stay executable by anon.

### P0 — Account deletion does not delete the account

- **Module:** Auth / Play compliance
- **Description:** `platform_update_account_deletion_request` used to update status and notes only. It did not ban the Auth user or revoke sessions.
- **Root cause:** The flow is a review queue. Completion was not wired to the Auth user.
- **File:** `migration/supabase/migrations/20261010140000_account_deletion_ends_session.sql`
- **Evidence:** The live function now sets `auth.users.banned_until` to `infinity` and deletes `auth.sessions` and `auth.refresh_tokens` when status first becomes `completed` and `requesting_user_uid` is set. It does not delete transactions or outlets.
- **Risk:** Financial records remain, which is required for invoices. An access token already issued stays valid until it expires. Google Play also expects associated personal data to be deleted or exported, which this change does not do. Policy: [User Data](https://support.google.com/googleplay/android-developer/answer/10144311), [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).
- **Fix status:** Session ban applied in production on 10 Oct 2026. Outlet financial rows are kept. A data-deletion runbook is still required before Play treats the account as deleted.

### P0 — Release artifact and device checks were not run

- **Module:** Android
- **Description:** Source is a release-shaped config. This audit did not produce a signed AAB and did not install it.
- **Evidence:** `apps/merchant-portal/android/app/build.gradle` versionCode 13 / versionName 1.0.11; `variables.gradle` targetSdk 36; manifest `usesCleartextTraffic="false"`; permission `INTERNET` only. `keystore.properties` is gitignored. No Play Console upload was performed.
- **Fix status:** **NOT TESTED.** Manual steps are in section F.

### P1 — Mixed points cart was stored as Redemption

- **Module:** POS / Dashboard revenue
- **Description:** Any cart with a points line set `category: 'Redemption'`. Dashboard revenue excludes that category even when `amount > 0`.
- **File:** `apps/merchant-portal/pages/POS.tsx`
- **Fix status:** Fixed in the client. Category is `Redemption` only for a voucher sale or a zero-amount points sale. **Not deployed.**

### P1 — Loyalty points skipped when commission was absent

- **Module:** POS
- **Description:** `return id` inside the commission block ran before the points update, including when there were zero commission lines.
- **File:** `apps/merchant-portal/hooks/useFirestoreData.ts` (previously around the `commissionByKey.size === 0` return)
- **Fix status:** Fixed in the client. Points use `shouldAwardLoyaltyPoints` and skip redeemed lines. **Not deployed.**

### P1 — Dashboard client count can fall back to the first page

- **Module:** Members / Dashboard
- **Description:** CRM total uses `clientService.count`. The dashboard fallback used `clients.length`. The in-memory client cache is the first page (`DEFAULT_LIST_PAGE_SIZE` 50). "New today" still scans that page.
- **File:** `apps/merchant-portal/pages/Dashboard.tsx`
- **Fix status:** Fallback now calls `clientService.count`. New-today still uses the loaded page. **Partial.**

### P1 — Checkout id was `txn_${Date.now()}` on every click

- **Module:** POS
- **Description:** `complete_pos_sale` is idempotent for the same id (`SELECT … FOR UPDATE`, insert only if missing). A timeout after server success plus a second tap minted a new id and could create a second sale.
- **Fix status:** The same cart fingerprint reuses the id until success. **Not deployed.** Rapid double-click was already blocked by `isProcessing`.

### P1 — Schedule "This week's income" is catalog price

- **Module:** Appointments
- **Description:** The mobile bar sums current `service.price` for non-cancelled appointments, including scheduled and no-show. It is not linked sales.
- **File:** `apps/merchant-portal/pages/AppointmentsCalendar.tsx` around `thisWeekIncome`
- **Fix status:** Fixed in the client. The bar sums non-void `SALE` amounts for the outlet in the local week, excluding `Voucher` and `Redemption`, and shows an em dash when the query fails. **Not deployed.** Bookings that were never checked out stay out of the total.

### P1 — Member voucher count is read-modify-write

- **Module:** Packages
- **Description:** Package sales increment `voucher_count`, and voucher checkout decrements it, in separate client calls after the sale is saved. A failure logs a warning.
- **Files:** `useFirestoreData.ts`, `supabaseMerchant.ts` `redeemVoucher`
- **Fix status:** **Not fixed.** Needs a single RPC. Not applied, to avoid a production balance migration in this pass.

### P1 — Edge admin checks disagree

- **Module:** Super admin
- **Description:** `account-admin` checks `platform_admins`. `billing-admin` and `marketing-dispatch` used to check `users.role`.
- **Fix status:** Source now requires `platform_admins.status = 'active'` for billing. Marketing still allows an outlet `admin` for that outlet, and uses `platform_admins` for cross-outlet access. **Edge functions not deployed.**

### P1 — Android OAuth depends on the Supabase redirect allowlist

- **Module:** Auth
- **Description:** Native redirect is `com.bookglow.merchant://auth/callback/merchant`. If that URL is missing from the Supabase allowlist, GoTrue falls back to the Site URL. Code comments name the marketing homepage as that failure.
- **Fix status:** **NOT TESTED** on a device. Confirm the allowlist in the Supabase Auth dashboard.

### P2 — Product fixed commission ignores quantity

- **Module:** Commission
- **Description:** Service commission is `price × qty × roleRate / 100`. Product commission is `fixedCommissionAmount` once per line.
- **Fix status:** **Not changed.** The field name does not say whether the amount is per unit or per line. Do not change it until you confirm the rule.

### P2 — Percentage and fixed order discounts are not implemented

- **Module:** POS
- **Description:** The totals label hard-codes discount `RM 0.00`. There is no tax, tender, change, or split tender.
- **Fix status:** Documented. Not built. The RM100 + RM50 with 10% example therefore stays RM150.00.

### P2 — Other

- Sales report collection ignores the staff/category filter while the list respects it.
- Point-redemption lines previously kept catalog `price` on the saved item. The client now stores `price: 0` and `originalPrice`.
- `npm audit`: 4 critical, 16 high, 17 moderate. Critical packages in the tree: `shell-quote`, `concurrently`, `proxy-addr`, `tar` (largely dev / Firebase CLI transitive). Not upgraded in this pass.
- No GitHub Actions.
- Leaked-password protection is disabled (Supabase auth advisor).
- 27 unindexed foreign keys (performance advisor, INFO).
- `play-store-assets` docs still mention versionName 1.0.8 / versionCode 10.

## D. Financial reconciliation

Money rule after this branch: line totals are integer cents, `Math.round((abs(major) + 1e-8) * 100)`, then divided back to RM for storage. There is no tax. Historical `transactions.amount` and `items` are the snapshot taken at checkout. Later catalog price edits do not rewrite them.

Void rule: `void_sale_and_remove_linked_appointments` sets `status = voided` and `voided = true`, deletes the commission expense, and deletes linked appointments. Reports and dashboard revenue exclude voided sales. There is no separate refund document. A void is not a negative refund row.

| Scenario | Expected under the product's rules | Result |
| --- | --- | --- |
| Service A RM100.00 + Service B RM50.00 | Subtotal RM150.00. No discount engine, so payable RM150.00. The 10% example (RM135.00) does not apply until a discount feature exists. | Unit test `posMoney.test.ts` expects 15000 cents. **PASS** |
| RM99.90 × 3 | RM299.70 exactly (29970 cents) | Unit test **PASS** |
| RM100.00 sale voided in full | Removed from net sales and dashboard revenue. Commission child removed. Not reported as a refund total, because refunds are not a ledger type. | Rule confirmed in `void_sale_and_remove_linked_appointments`. Live replay against Sohokaki / Bali Wellness **NOT TESTED** (would be a write). |
| Voucher redemption | Amount 0, category `Redemption`, excluded from dashboard revenue | Code + `saleCategory` test **PASS** |
| Paid lines plus a points line | Payable amount is the paid lines only. Category `Sales`, so dashboard revenue keeps the paid amount. | Unit test **PASS**. Production rows already saved as `Redemption` are unchanged. |
| Expenses | Finance sums expenses. They are not added to sales collection. Dashboard profit = revenue − expenses, including commission expenses. | Selectors covered by existing `financeSelectors.test.ts` |
| Pending appointments | Not `SALE` rows. They do not increase completed sales. The schedule income bar on this branch sums collected non-void sales for the local week. | Client code. **Not deployed.** |

POS, Transactions, Sales Reports, Finance, and Dashboard are not the same number on purpose:

| Surface | What it sums |
| --- | --- |
| POS total | Payable now, excluding voucher and points lines |
| Sales Reports collection | Non-void `SALE.amount` in the range, all categories, by payment method |
| Dashboard revenue | Non-void `SALE` excluding categories `Voucher` and `Redemption` |
| Dashboard profit | That revenue minus all expenses |
| Transactions net | Filtered sales minus filtered expenses |
| Finance | Expenses only |

Until the pagination fix is deployed, Sales Reports, Finance, and Transactions can also disagree with the database simply because they never loaded the rest of the rows.

## E. Supabase security

RLS is enabled on every `public` table checked (clients, transactions, appointments, staff, vouchers, outlets, and the platform tables). Merchant policies on `clients` use `is_outlet_member`. Appointments and transactions use `current_portal_outlet_id()` plus `is_current_account_enabled()`. Spoofing `outlet_id` in a filter does not bypass those policies.

Staff and voucher `SELECT` policies were replaced on 10 Oct 2026. Anonymous callers get booking columns only. Signed-in callers must belong to the outlet, match `current_portal_outlet_id()`, or be a platform admin.

`user_metadata` is not used for authorization. Platform admin is `platform_admins` / `is_platform_admin()` for RPCs and `account-admin`. `billing-admin` and `marketing-dispatch` source now reads `platform_admins` as well. Those two functions are not deployed, so production edge traffic still has the previous check until a deploy.

`complete_pos_sale` is one transaction for the sale insert and appointment link. Commission, loyalty points, and member voucher counts are later client calls and can diverge if the network fails after the sale.

Migration history on the server uses different timestamps than the filenames in git. The critical functions (`complete_pos_sale`, `merchant_dashboard_aggregates`, `create_public_booking`, `ensure_merchant_workspace`) are present. Treat git as the desired next migrations; do not assume every local file was applied under the same version number.

### Advisors (live, 10 Oct 2026)

- Security WARN: anon and authenticated can execute many `SECURITY DEFINER` functions ([lint 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)); mutable `search_path`; extension in `public`; leaked password protection disabled.
- Performance WARN: auth RLS initplan on six policies; multiple permissive policies on outlets, services, users, and marketing tables.
- Performance INFO: 27 unindexed foreign keys; 18 unused indexes.

### Backup and disaster recovery

Point-in-time recovery and backup retention were **not** returned by the project API. A restore was **not** performed. Do not treat recovery as verified.

Procedure before any production schema change:

1. In the Supabase dashboard for `uecphpjymbgtttrizhgy`, confirm the plan includes daily backups and, if purchased, point-in-time recovery. Record the retention. This audit could not see that setting.
2. The following migrations were applied to production on 10 Oct 2026 after approval. They do not delete merchant rows:
   - `prevent_overlapping_staff_appointments`
   - `dashboard_dates_asia_kuala_lumpur` (live function bodies: `timezone('UTC'` replaced with `Asia/Kuala_Lumpur`, and the monthly report `make_timestamptz` zone changed the same way)
   - `public_staff_voucher_outlet_hardening`
   - `revoke_anon_execute_merchant_rpcs`
   - `account_deletion_ends_session`
3. Do not run `supabase db reset` against this project. Do not delete clients, appointments, transactions, or outlets as a rollback.
4. Rollback for these migrations is a forward SQL script that drops the trigger or restores the previous function body from git history. Restoring data requires a backup, which was not tested here.
5. The overlap trigger does not delete or rewrite the 777 existing overlaps. Clean those up only with an explicit, reviewed data fix.

## F. Android readiness

| Check | Source result | Executed? |
| --- | --- | --- |
| applicationId | `com.bookglow.merchant` | Source PASS |
| versionName / versionCode | 1.0.11 / 13 | Source PASS |
| minSdk / targetSdk / compileSdk | 23 / 36 / 36 | Source PASS |
| Cleartext | `false` | Source PASS |
| debuggable in source | Not set (release default false) | Source PASS |
| Permissions | `INTERNET` | Source PASS |
| Deep link | `com.bookglow.merchant` auth callback | Source PASS. Device **NOT TESTED** |
| Signed release AAB | Signing config reads gitignored `keystore.properties` | **NOT TESTED** |
| Bundle contains no service-role key | Client factory rejects `service_role` / `sb_secret_` | Code PASS. Built artifact **NOT TESTED** |
| `google-services.json` | Absent. Push is not configured | N/A if FCM is unused |

Play target API: as of 31 August 2026, new apps and updates must target Android 16 / API 36 ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878)). This source already targets 36. Today's date is after that deadline.

### Physical device plan (all NOT TESTED)

1. Install the signed AAB via Play internal testing, not a debug APK.
2. First launch, Google login for an existing merchant, and a new Google account through onboarding.
3. Cold start, background for 10 minutes, resume, and process death.
4. Airplane mode during POS checkout. Confirm the sale does not vanish and a retry does not duplicate it.
5. Back button on POS, schedule, and a modal.
6. Small phone, large phone, keyboard open, and system font scale.
7. Confirm the status bar and gesture insets do not cover the checkout button.

## G. Google Play readiness

| Item | Status |
| --- | --- |
| Package `com.bookglow.merchant` | Source matches |
| Version code 13, higher than the stale docs (10) | Confirm in Play Console that 13 is unused. **Manual** |
| Target API 36 | Source meets the current phone/tablet rule |
| AAB and Play App Signing | **Manual.** Not built here |
| Privacy policy URL | `https://bookglow.my/privacy` is routed. Live HTTP check **NOT TESTED** in this pass |
| Account deletion URL | `https://bookglow.my/account-deletion` is routed |
| In-app deletion | Settings `DeleteAccountSection` submits a request. Completion does not delete data (P0) |
| Data safety form | **Manual.** Must match Supabase auth data, profile, phone, bookings, sales, and Google sign-in. Do not copy an old form |
| Advertising ID | No ad SDK found in the merchant manifest. Declare "not used" only after you confirm the Play Console questionnaire. **Manual** |
| Financial features | The app records merchant sales. Answer the financial-features form from the real POS behavior, not from this report |
| Login for reviewers | Provide a demo merchant. Do not use Sohokaki or Bali Wellness production data |
| Screenshots | `play-store-assets` version text is stale (1.0.8). **Manual** |
| Closed testing / production access | **Manual** in Play Console |

## H. Tests executed

| Command | Result |
| --- | --- |
| Merchant Vitest before fixes | **FAIL** 263 passed, 1 failed (`integrations/registry.test.ts` expected the words "currently unavailable"; the safe copy is "could not be reached") |
| Merchant Vitest after fixes | **PASS** 76 files, 281 tests |
| Merchant `tsc` and Vitest after the schedule, billing, and marketing edits | **PASS** 76 files, 281 tests |
| Merchant `tsc --noEmit` before the test-type cast | **FAIL** `androidShell.test.ts` mock tuple types (pre-existing) |
| Merchant `tsc --noEmit` after the cast | **PASS** |
| Customer-site Vitest | **PASS** 15 files, 104 tests. Customer source was not changed |
| `npm audit` (repo) | **FAIL** 4 critical, 16 high, 17 moderate |
| Production SQL (read-only) | Executed. Counts in sections A, C, and E |
| Supabase security and performance advisors | Executed |
| Release AAB / `bundleRelease` | **NOT TESTED** |
| Physical Android | **NOT TESTED** |
| Live Google login, Places, HitPay | **NOT TESTED** |
| Database restore | **NOT TESTED** |
| Playwright visual suite | **NOT TESTED** in this pass |
| Load test | **NOT RUN** (must not hit production) |

New unit tests cover cents arithmetic, sale category, checkout id reuse, loyalty after a no-commission sale, local month bounds, exact client count versus a 50-row page, full page collection, and staff overlap.

## I. Remaining actions

1. Review the 777 existing overlaps and decide which rows to move or cancel. The new trigger will not repair them.
2. Ship a new merchant web build and a signed versionCode 14 AAB after the client fixes. Version 13 in source does not contain this branch until you build it. Deploy `billing-admin` and `marketing-dispatch` with that release if you want the admin check to match production RPCs.
3. Write the account-deletion runbook for personal data. Completing a request now bans the user and deletes sessions. It keeps invoices and other outlet financial rows. Existing access tokens last until expiry.
4. Confirm the Supabase redirect allowlist contains `com.bookglow.merchant://auth/callback/merchant`.
5. Turn on leaked-password protection.
6. Move voucher balance changes into the sale RPC.
7. Confirm whether product `fixedCommissionAmount` is per unit. It is currently once per line.
8. Complete Play Console Data safety, account deletion, screenshots, and a reviewer login that is not a live merchant.
9. Run the physical Android list in section F.
10. Triage `npm audit` criticals (`shell-quote`, `tar`, `proxy-addr`, `concurrently`) and add CI for typecheck and Vitest.

## J. Release recommendation

**NO-GO**

Mandatory gates that are not passed:

- The live website and the version 13 Android app do not yet contain the client fixes. Finance and Transactions can still omit rows past 500, and the dashboard page still sends UTC date bounds.
- 777 overlapping staff appointments already exist. New inserts are blocked; those rows were not repaired.
- Completing account deletion bans the user and deletes sessions. It does not delete personal data or financial rows, and an existing access token lasts until expiry.
- `billing-admin` and `marketing-dispatch` source is updated and not deployed.
- No signed release AAB was produced or installed.
- Backup restore was not tested.

Ship the client, deploy the two edge functions, decide the remaining deletion and overlap cleanup, and pass the device list before Play production. Then re-run this checklist.
