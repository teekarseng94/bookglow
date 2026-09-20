# Schedule

> Overrides `pages/merchant-portal.md` for calendar and appointment lists.

**Page:** `apps/merchant-portal/pages/AppointmentsCalendar.tsx`  
**Density:** 8  
**Layout:** Full-bleed (`bookglow-content-frame--schedule`); mobile date strip is sticky under the shell header

## Visual language

| State | Treatment |
|-------|-----------|
| Available slot | Surface + secondary text |
| Booked | `--bg-soft` + `--text-secondary` |
| Selected day | `--brand-soft` fill, `--brand` text |
| Confirmed | `--success` |
| Pending | `--warning` |
| Cancelled / no-show | `--danger` |

Date cells stay 40px (`--mobile-date-cell`) with a 44px hit area.

## Chrome

- Mobile income bar sits above bottom nav + safe-area (already implemented)
- FAB 56px, brand fill, label via `aria-label`
- Appointment cards min-height 72px
- Detail sheets use `AppSheet` / `AppModal`, not a new overlay

## Do not

- Alter slot calculation, staff filters, or booking writes
- Use colour as the only status cue — keep labels
