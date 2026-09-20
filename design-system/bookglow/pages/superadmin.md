# Superadmin portal

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/bookglow/MASTER.md`).

**App surface:** `apps/merchant-portal` routes under `/admin/*`  
**Shell:** `SuperAdminLayout.tsx`  
**Density:** 8 (platform operations)

## Visual split

Merchant and customer stay light. Superadmin is the only surface with a **dark rail**:

| Part | Treatment |
|------|-----------|
| Sidebar | `--platform-surface` (replace hardcoded `#171322`) |
| Nav active | `bg-white/12` |
| Accent | `--platform-accent` for health/live, not mint as a second brand |
| Workspace | Light Master canvas (`--bg-canvas`) |
| Cards / tables | Master light cards |

This is a chrome theme, not product-wide dark mode.

## Layout

- Fixed 16rem rail from `lg`
- Global search stays in the header
- Outlet inspector remains an overlay, not a third nav
- Mobile: stack header + content; do not reuse merchant bottom tabs (platform tasks are not a 5-tab workday)

## Components

Reuse merchant `ui/` primitives (`Button`, `PageHeader`, `StatusBadge`, `AppModal`, `PlatformMetricCard`). Tables may be denser (40–48px rows). Use `tabular-nums` for money and counts.

Do not fabricate metrics. Empty and “unavailable” states stay honest (existing billing reliability rules).

## Accessibility

- Contrast on the dark rail: white/65 hover is acceptable for secondary nav; active labels are white
- Icon + text in nav; icons `aria-hidden`
- Destructive tools (account deletions) use `--danger` + confirmation

## Do not

- Mix merchant bottom navigation into platform ops
- Recolour the rail with `--brand` purple fills (keep it operational/neutral)
- Change access-control or audit behaviour when applying visuals
