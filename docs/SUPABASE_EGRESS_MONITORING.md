# Supabase egress monitoring (Bookglow)

This document explains how to measure and inspect Supabase network egress for the Bookglow monorepo. Application code cannot retrieve billing analytics automatically unless an approved Supabase management API integration exists.

## Development telemetry (merchant portal)

Enabled automatically in Vite `DEV`, or with:

```bash
VITE_EGRESS_TELEMETRY=true
```

Disable explicitly:

```bash
VITE_EGRESS_TELEMETRY=false
```

In the browser console (merchant portal):

```js
window.__bookglowQueryMetrics.summary()
window.__bookglowQueryMetrics.dump()
window.__bookglowQueryMetrics.clear()
window.__bookglowQueryMetrics.setTrigger('manual_refresh')
```

Telemetry records only:

- query name, route, table/RPC
- duration, row count, approximate JSON payload bytes
- cache hit/miss, trigger, optional channel name

It never logs tokens, emails, phones, notes, SQL parameters with PII, or row content.

## Supabase Dashboard checks

1. **Usage → Egress**  
   Billing-cycle database/storage/egress totals. Cumulative for the cycle; already-used bytes do not decrease after optimization.

2. **API Gateway / network traffic** (project settings or reports, depending on plan)  
   Look for high request volume to REST (`/rest/v1/*`) versus Realtime.

3. **Logs Explorer**  
   Filter API requests; sort by frequent paths such as:
   - `/rest/v1/transactions`
   - `/rest/v1/clients`
   - `/rest/v1/appointments`

4. **Database → Query Performance**  
   Identify frequently executed statements and sequential scans on large tables.

## Interpreting Bookglow patterns

| Signal | Likely cause |
|--------|----------------|
| High DB egress, low Realtime message count | Full-table REST refetches after each Realtime event |
| High egress, low Edge Function count | Browser/service `select` volume, not functions |
| Egress ≫ database size | Repeated downloads of the same tables |

## Multi-tab note

Each open merchant-portal tab creates its own session and subscriptions. Fix code-level duplication first; multiple development tabs will still multiply traffic.

## After deploying optimizations

Monitor Usage → Egress for **new** daily growth over 7–14 days. Do not expect the current billing-cycle total to drop.

## Phase 5 — aggregate RPCs

Apply migration `migration/supabase/migrations/20260806140000_merchant_dashboard_aggregates.sql` before relying on RPC paths.

| RPC | Used by |
|-----|---------|
| `merchant_dashboard_aggregates` | Dashboard KPIs / week chart / periods |
| `merchant_monthly_report_summary` | ReportPage financial totals |

If the RPC is missing, the UI falls back to in-memory transaction aggregation. Dashboard no longer loads the full `transactions` domain; reports still load a bounded transactions window for staff/top-service item breakdowns.
