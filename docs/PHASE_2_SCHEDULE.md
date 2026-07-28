# Phase 2 — Schedule Page

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/AppointmentsCalendar.tsx`

## Locked (unchanged)

- Appointment data loading / Firestore subscriptions (parent + listeners)
- Calendar slot calculations (`hours`, `isAppointmentInTimeSlot`, week/month helpers)
- Date selection (`selectedDate`, `goToDate`, `navigate`, `setToday`)
- Appointment create / edit status / cancel / delete handlers
- Reminder send (`handleSendManualReminder`)
<<<<<<< HEAD
- Setmore sync on open (`onSyncSetmore`)
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
- `onStartPOSSale(selectedAppointment)` via `handleCollectPayment` — same argument
- Role permissions (page has none beyond parent props)

## Presentational components added

`apps/merchant-portal/components/schedule/`

| Component | Role |
|-----------|------|
| SchedulePageHeader | Compact desktop title + primary **New Booking** |
| ScheduleToolbar | Day/Week/Month + prev/today/next + date picker in one bar |
| ScheduleDateStrip | Sticky mobile week strip + month picker entry |
| ScheduleBookingList / ScheduleBookingCard | Dense 2–3 row cards (time, status, customer, service, staff) |
<<<<<<< HEAD
| ScheduleEmptyState / ScheduleLoadingState | Empty + Setmore sync banner |
=======
| ScheduleEmptyState / ScheduleLoadingState | Empty + loading banner |
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
| ScheduleBookingDetailPanel | Full-width mobile detail + explicit status/destructive actions |

## Layout outcomes

**Desktop (≥768):** page header, toolbar, full-width day workspace (staff columns). Week/Month show empty guidance back to Day (no new calendar math).

**Mobile:** sticky date strip while list scrolls; month sheet retained; booking cards denser; detail panel + actions sheet; no primary day horizontal scroll; FAB New Booking preserved.

## Verification

- `npm run build` must pass
- Spot-check widths: 360, 375, 768, 1280 (Day view + New Booking + open detail)

## Next

**Phase 3 — Menu and Inventory** (`Services.tsx`)
