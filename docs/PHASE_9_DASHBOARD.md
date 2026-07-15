# Phase 9 — Dashboard / Today

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/Dashboard.tsx`

## Locked (unchanged)

- `dashboardData` useMemo (revenue, expenses, profit, week chart, category, top selling, visitors, payment)
- Recent sales filter / sort
- Quick calendar slots and appointment matching
- Navigation callbacks (`/pos`, `/schedule`, `/member`, `/finance`, `/sales-reports`)
- `onMarkReminderSent` prop contract (reminders remain on Schedule)
- No new derived metrics beyond surfacing existing outstanding / profit / empty-day signals in attention UI

## Decision layout

| # | Section | Component |
|---|---------|-----------|
| 1 | Today | `TodayHeader`, `TodaySummary` (hero revenue; secondary metrics compact) |
| 2 | Needs attention | `AttentionList` (outstanding, negative profit, empty day — existing values only) |
| 3 | Next appointments | `UpcomingAppointments` |
| 4 | Sales snapshot | `SalesSnapshot` (category + recent sales) |
| 5 | Customer activity | `CustomerActivity` |
| 6 | Staff / operational | `OperationalStatus` (quick actions + Quick Calendar) |
| 7 | Secondary charts / trends | `DashboardChartSection`, Top Selling, Payment |

## Presentational additions

`apps/merchant-portal/components/dashboard/`

| Component | Role |
|-----------|------|
| TodayHeader | Date / title |
| TodaySummary | Dominant hero + compact metric strip |
| AttentionList | Actionable alerts |
| UpcomingAppointments | Today’s bookings |
| SalesSnapshot | Category + recent sales |
| CustomerActivity | Visitor list |
| OperationalStatus | Quick actions + calendar shell |
| DashboardChartSection | Week bars below daily work |
| DashboardEmptyState | Explicit empty charts / lists |

## Layout outcomes

- First viewport: what is happening now (today + attention + appointments)
- Charts and top-selling sit below daily work
- Empty week chart uses `DashboardEmptyState`
- Mobile cards stay compact; actions preserved

## Verification

- `npm run build:merchant` — PASS

## Next

**Phase 10 — Customer Site**
