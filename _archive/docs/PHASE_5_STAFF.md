# Phase 5 — Staff & Team

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/Staff.tsx`

## Locked (unchanged)

- Staff create / update / delete handlers (`onAddStaff`, `onUpdateStaff`, `onDeleteStaff`)
- Photo upload path, size/type validation, Storage rules error messaging
- `profilePicture` / `photoURL` write-through after upload
- Qualified services select / clear / search
- Role commission rates add / edit / delete (`onUpdateRoleCommissions`)
- Performance period filters and commission stats math (voided sales excluded)
- `isLocked` gates
- Dirty-form discard confirm (`window.confirm` before close)
- No new Staff schema fields (no invented schedules / per-staff permissions)

## Presentational additions

`apps/merchant-portal/components/staff/`

| Component | Role |
|-----------|------|
| StaffPageHeader | Compact header; **Add Staff** primary; Role Rates secondary; period controls slot |
| StaffRoster | Compact scrollable roster shell |
| StaffCard | Dense card: photo/initials, name, role, status, services/earnings context |
| StaffStatusBadge | Active / Earning / No sales |
| StaffEditor | Full-width mobile / centered desktop editor; sticky Save Changes |
| StaffProfileSection | Photo + identity fields chrome |
| StaffServicesSection | Qualified services chrome |
| StaffScheduleSection | Outlet-hours guidance (no new schedule fields) |
| StaffPermissionSection | Role-based access note (no new permission fields) |
| StaffCommissionSection | Role rate display + Role Rates entry |
| StaffSaveBar | Sticky Cancel + **Save Changes** (close does not save) |

## Layout outcomes

- Desktop: header + compact roster + performance detail panel
- Mobile: dense roster cards; editor as focused full-height panel with sticky save
- Delete uses `ConfirmationDialog` with existing impact copy (history retained; removed from active lists)
- Upload progress and validation errors remain visible in the editor

## Verification

- `npm run build:merchant` — PASS (2026-07-15)
- Behavioral parity: add/edit/delete, photos, qualified services, role rates, period stats

## Phases 0–5

Foundation through Staff presentational retrofit is complete for this directive track.
