# Phase 5: merchant onboarding release

Phase 5 promotes the verified merchant onboarding workflow from local development to staging and then production. Production changes must be performed in this order so the browser applications never ship before their database contract exists.

## 1. Prepare environment files

Create uncommitted `apps/customer-site/.env.production` and `apps/merchant-portal/.env.production` files from their `.env.example` templates. Both apps must use the same Supabase project.

Customer site requirements:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MERCHANT_PORTAL_URL`
- `VITE_GOOGLE_AUTH_ENABLED` and `VITE_FACEBOOK_AUTH_ENABLED`

Merchant portal requirements:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CUSTOMER_SITE_URL`

Never place a Supabase service-role key, Stripe secret, private key, or other server credential in a `VITE_*` variable.

Run `npm run release:check` before every staging or production build. Override the file locations with `BOOKGLOW_CUSTOMER_ENV` and `BOOKGLOW_MERCHANT_ENV` when validating staging files.

## 2. Configure Supabase Auth

Set the customer site as the Auth site URL. Add the exact customer `/signup` URL and merchant `/login` URL to the allowed redirect list. Configure email templates and SMTP, then test confirmation and password recovery using a real mailbox.

Only set an OAuth flag to `true` after its Supabase provider has valid provider credentials and the provider callback/redirect URLs have been allowlisted.

## 3. Promote the database first

1. Take a restorable database backup or confirm point-in-time recovery.
2. Link the CLI to the staging Supabase project.
3. Inspect pending migrations with `npx supabase --workdir migration migration list`.
4. Apply migrations to staging with `npx supabase --workdir migration db push --dry-run`, review the output, then run the same command without `--dry-run`.
5. Execute the onboarding validation suite against an isolated staging test tenant.
6. Repeat the reviewed migration process for production only after staging acceptance.

Do not run `db reset` against staging or production.

## 4. Build and deploy applications

Run `npm run release:build`, then deploy both Firebase Hosting targets. The current targets are `booking-site` and `dashboard-site`. Verify SPA rewrites and `Cache-Control: no-store` on each `index.html` after deployment.

## 5. Acceptance checks

- Email merchant signup, confirmation, sign-in, and password recovery
- Save-and-exit followed by resume on a second browser session
- New-business completion creates one outlet and one administrator mapping
- Invitation acceptance uses the server-selected outlet and role and cannot be reused
- Merchant login reaches the correct outlet dashboard
- Settings shows onboarding values and persists edits
- Public booking link loads the new outlet
- Mobile widths 360, 375, 390, and 430 pixels have no horizontal overflow
- Existing customer booking authentication still works

## 6. Rollback and monitoring

Keep the previous Firebase Hosting release available for immediate rollback. Database rollback should use a reviewed forward-fix migration; do not destructively reverse a migration after merchants have created records. Monitor Supabase Auth failures, RPC errors, RLS denials, onboarding completion rate, duplicate outlet attempts, and frontend error reporting during the release window.
