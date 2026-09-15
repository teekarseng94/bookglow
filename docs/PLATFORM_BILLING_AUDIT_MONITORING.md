# Platform billing, audit, and monitoring

Bookglow uses HitPay for platform SaaS subscription billing and Supabase for
the server-side integration. HitPay API keys and webhook salts never belong in
the Vite application.

This charges BookGlow merchants. It does not collect customer payments at POS
or public booking.

## Components

- `billing-admin`: authenticated platform-admin Edge Function that creates
  HitPay recurring-billing checkout URLs for the RM20 monthly plan and cancels
  an outlet subscription with HitPay `DELETE /v1/recurring-billing/{id}`.
- `hitpay-webhook`: public Edge Function that verifies `Hitpay-Signature`
  (HMAC-SHA256 of the raw JSON body with the dashboard salt), stores idempotent
  billing events, and synchronizes `outlet_subscriptions`.
- `platform_audit_events`: append-only administrative history.
- `platform_monitoring_events`: append-only backend warning/error history.
- `billing_events`: append-only, idempotent provider event receipt history.

HitPay has no hosted billing portal. Superadmin can start a subscription and
cancel it from BookGlow. Card updates still happen in the HitPay dashboard.

## Apply the database migration

Apply:

`migration/supabase/migrations/20260915140000_hitpay_platform_billing.sql`

Use your normal reviewed migration process. Do not paste a service-role key into
the browser or commit it.

## Configure Supabase Edge Function secrets

```powershell
npx supabase secrets set HITPAY_API_KEY=your_key --project-ref YOUR_PROJECT_REF
npx supabase secrets set HITPAY_WEBHOOK_SALT=your_salt --project-ref YOUR_PROJECT_REF
npx supabase secrets set HITPAY_API_BASE=https://api.hit-pay.com --project-ref YOUR_PROJECT_REF
npx supabase secrets set DASHBOARD_APP_URL=https://bookglow-merchant.vercel.app --project-ref YOUR_PROJECT_REF
```

Optional, if you created a HitPay subscription plan in the dashboard:

```powershell
npx supabase secrets set HITPAY_PLAN_ID=plan_uuid --project-ref YOUR_PROJECT_REF
```

Without `HITPAY_PLAN_ID`, checkout creates an ad-hoc monthly RM20 recurring
billing request (`name`, `amount`, `cycle`, `currency`).

For local development, use HitPay sandbox values (`https://api.sandbox.hit-pay.com`)
and a gitignored Edge Function environment file. Do not commit keys.

## Deploy functions

```powershell
npx supabase functions deploy billing-admin --project-ref YOUR_PROJECT_REF
npx supabase functions deploy hitpay-webhook --no-verify-jwt --project-ref YOUR_PROJECT_REF
```

Configure the HitPay webhook endpoint as:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/hitpay-webhook`

Subscribe at minimum to:

- `recurring_billing.subscription_updated`
- `charge.created`

## Security properties

- Platform-admin authorization is checked inside `billing-admin`.
- HitPay webhook requests are accepted only after HMAC signature verification.
- Provider event IDs provide idempotency.
- Billing, audit, and monitoring tables use row-level security.
- Event records reject update and delete operations at the database trigger
  level, including privileged accidental mutations.
- Webhook payload persistence is intentionally minimized to identifiers and
  status fields instead of storing full customer payloads.

## Rollout checks

1. Apply the HitPay migration in staging or production.
2. Deploy both functions with secrets set in the dashboard, not git.
3. Create a test subscription from Super Admin.
4. Confirm the subscription appears after webhook delivery.
5. Confirm billing and audit events are present.
6. Send an invalid webhook signature and confirm a monitoring warning.
7. Confirm there is no Manage-billing portal action.
