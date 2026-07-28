# Platform billing, audit, and monitoring

Bookglow uses Stripe for subscription billing and Supabase for the server-side
integration. Stripe secret keys never belong in the Vite application.

## Components

- `billing-admin`: authenticated platform-admin Edge Function that creates
  Stripe Checkout and Billing Portal sessions.
- `stripe-webhook`: public Edge Function that verifies Stripe signatures,
  stores idempotent billing events, synchronizes subscriptions, and emits audit
  or monitoring records.
- `platform_audit_events`: append-only administrative history.
- `platform_monitoring_events`: append-only backend warning/error history.
- `billing_events`: append-only, idempotent Stripe event receipt history.

## Apply the database migration

Apply:

`migration/supabase/migrations/20260729010000_platform_billing_audit_monitoring.sql`

Use your normal reviewed migration process. Do not paste a service-role key into
the browser or commit it.

## Configure Supabase Edge Function secrets

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_live_or_test_value
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_value
supabase secrets set STRIPE_DEFAULT_PRICE_ID=price_value
supabase secrets set DASHBOARD_APP_URL=https://your-dashboard-domain
```

For local development, use Stripe test-mode values and a gitignored Edge
Function environment file.

## Deploy functions

```powershell
supabase functions deploy billing-admin
supabase functions deploy stripe-webhook --no-verify-jwt
```

Configure the Stripe webhook endpoint as:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

Subscribe at minimum to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.payment_failed`
- `invoice.paid`

## Configure the portal

Set the public Stripe Price identifier in the merchant portal environment:

```env
VITE_STRIPE_PRICE_ID=price_value
```

This value is only an identifier. Stripe secret and webhook signing keys remain
server-side.

## Security properties

- Platform-admin authorization is checked inside `billing-admin`.
- Stripe webhook requests are accepted only after signature verification.
- Stripe event IDs provide idempotency.
- Billing, audit, and monitoring tables use row-level security.
- Event records reject update and delete operations at the database trigger
  level, including privileged accidental mutations.
- Webhook payload persistence is intentionally minimized to identifiers and
  status fields instead of storing full customer payloads.

## Rollout checks

1. Apply the migration in staging.
2. Deploy both functions with Stripe test-mode secrets.
3. Create a test subscription from Super Admin.
4. Confirm the subscription appears after webhook delivery.
5. Confirm billing and audit events are present.
6. Send an invalid webhook signature and confirm a monitoring warning.
7. Test Billing Portal access.
8. Repeat with production secrets only after staging succeeds.
