# Dashboard

> ⚠️ **IMPORTANT:** Rules in this file **override** `pages/merchant-portal.md` for the Today dashboard only.

**Page:** `apps/merchant-portal/pages/Dashboard.tsx`  
**Density:** 7  
**Data:** Existing `dashboardData` memo + RPC aggregates. Do not replace with sample figures.

## Layout

1. Greeting / date / New Booking (greeting is visible on mobile as well as desktop)
2. Quick actions (mobile) — Lucide icons, 2×2 then 4-up from `sm`
3. KPI cards — 2×2 / 4-up, wrapping monetary values
4. Appointments | Attention | Sales snapshot
5. Customer activity | Booking link (`lg+` two-up)
6. Week chart (all breakpoints)
7. Quick calendar, top selling, top customers, payment (`lg+`)

Primary appointments / attention / sales sit in **one column below 1280px** so monetary values and attention copy stay readable, then three columns from `xl`.

## Presentation

- KPI values use `overflow-wrap: anywhere` and must not `nowrap`
- Appointment times keep `HH:MM`
- Status chips stay one line with an accessible label
- Charts expose a text `aria-label`; today is marked by colour **and** bold day label
- Primary actions and attention buttons are at least 44px
