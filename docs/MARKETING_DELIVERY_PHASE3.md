# Marketing delivery — Phase 3

Phase 3 adds consent-safe campaign delivery through a server-side queue.

## Providers

- Email: Resend
- SMS: Twilio Messaging Service
- WhatsApp: Twilio WhatsApp sender
- Share link: manual distribution; no provider credentials required

Provider secrets are read only by the `marketing-dispatch` Supabase Edge Function.

## Required secrets

```powershell
npx supabase secrets set RESEND_API_KEY=...
npx supabase secrets set MARKETING_EMAIL_FROM="Bookglow <marketing@your-domain.com>"
npx supabase secrets set TWILIO_ACCOUNT_SID=...
npx supabase secrets set TWILIO_AUTH_TOKEN=...
npx supabase secrets set TWILIO_MESSAGING_SERVICE_SID=...
npx supabase secrets set TWILIO_WHATSAPP_FROM=...
```

Only configure the providers the business intends to use. An unconfigured provider fails safely and records the delivery error.

## Deploy

```powershell
npx supabase db push
npx supabase functions deploy marketing-dispatch
```

The deployment applies:

- `20260729020000_marketing_audiences_campaigns.sql`
- `20260729030000_marketing_delivery_queue.sql`

## Scheduled campaign worker

Invoke `marketing-dispatch` every minute with:

```json
{ "action": "process_due" }
```

The scheduled request must use the Supabase service-role bearer token. Store the project URL and token in Supabase Vault and use `pg_cron` plus `pg_net`; never place the token directly in a migration or frontend environment.

## Delivery guarantees

- A unique database constraint prevents duplicate campaign/customer/channel queue records.
- Resend requests use a delivery-specific idempotency key.
- Workers claim only rows still in `queued` state.
- Raw recipient values are not copied into the delivery table; only masked values are retained.
- Provider credentials never reach the browser.
- Customers are excluded unless the specific channel has explicit consent.
- A global unsubscribe timestamp overrides every channel consent.
- Provider errors are retained on the delivery and also sent to platform monitoring.

## Operational checks

1. Add a test customer and explicitly enable one marketing channel.
2. Create a matching audience.
3. Create a draft campaign for that channel.
4. Select **Send now**.
5. Confirm the delivery summary changes to sent or failed.
6. Disable consent and confirm a new campaign skips that customer.
7. Retry the same campaign and confirm no duplicate delivery is created.
8. Schedule a campaign and confirm the worker processes it after its scheduled time.

