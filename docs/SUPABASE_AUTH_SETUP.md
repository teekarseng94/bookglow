# Supabase authentication setup

Repository code cannot enable OAuth providers, create Google credentials, configure hosted redirect allow-lists, deliver email, or deploy production database changes. Complete these dashboard and deployment steps explicitly.

## Google provider

1. In Google Cloud, create an OAuth 2.0 Web client.
2. Add `https://uecphpjymbgtttrizhgy.supabase.co/auth/v1/callback` as an authorized redirect URI.
3. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Client ID and Client Secret.
4. Never place the Google secret or a Supabase service-role key in `VITE_*` variables.

Facebook is optional and follows the same rule: leave `VITE_AUTH_FACEBOOK_ENABLED=false` until its provider and callback are configured and tested.

## Supabase URL configuration

In Authentication → URL Configuration:

- Set the Site URL to the intended primary production origin.
- Add `https://bookglow-83fb3.web.app/auth/callback/customer`.
- Add `http://localhost:5174/auth/callback/customer`.
- Add `https://bookglow-83fb3-dashboard.web.app/auth/callback/merchant`.
- Add `http://localhost:5173/auth/callback/merchant`.

Set application variables per environment:

```text
VITE_SUPABASE_URL=https://uecphpjymbgtttrizhgy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_AUTH_GOOGLE_ENABLED=true
VITE_AUTH_FACEBOOK_ENABLED=false
VITE_CUSTOMER_AUTH_CALLBACK_URL=<customer origin>/auth/callback/customer
VITE_MERCHANT_AUTH_CALLBACK_URL=<merchant origin>/auth/callback/merchant
```

## Email and invitations

Configure Supabase Auth SMTP and invitation templates before enabling Team & Access. Invitation success is only reported after `auth.admin.inviteUserByEmail` accepts the delivery request. Test delivery, expiry, and redirect behavior with a non-production mailbox.

The `invite-outlet-member` function requires its standard protected function environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. These must remain Edge Function secrets and must never enter either browser app.

## Apply to a local or test project

```powershell
npx supabase start
npx supabase db reset
npm run supabase:types
npx supabase functions serve invite-outlet-member --no-verify-jwt
```

Deploy only after reviewing the linked project:

```powershell
npx supabase db push --linked
npx supabase functions deploy invite-outlet-member
```

Do not run those production commands without confirming the target project and a rollback window.

## Verification

Run `npx supabase test db` for database tests when the local stack is available, then verify:

- a customer can only read their profile and linked bookings;
- outlet members cannot read another outlet;
- direct inserts/updates to `outlet_members`, `platform_admins`, and `audit_logs` fail for browser roles;
- a fourth active member is rejected at the default limit of three;
- owner-only mutations fail for admin/manager/cashier as applicable;
- the built JavaScript contains no `service_role`, `sb_secret_`, Google client secret, or OAuth client secret.

## Legacy identity migration

Firebase identities are not deleted or automatically merged. Export a verification-only inventory containing Firebase UID, normalized email, target Supabase UUID, and match status. Reject duplicate normalized emails for manual review. Back up the mapping, migrate a test cohort, verify sign-in and access, and retain the old mapping so the membership backfill can be rolled back without deleting Auth users.
