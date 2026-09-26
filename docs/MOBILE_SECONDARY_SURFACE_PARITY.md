# Mobile secondary-surface parity

Date: 2026-09-26  
App: BookGlow Merchant  
Companion: `docs/ANDROID_COMPACT_DENSITY_SYSTEM.md` §17

Chrome F12 mobile is the density baseline. Android uses the same BookGlow Mobile UI. This note covers **overlays** (editors, drawers, dialogs, sheets, sticky editor footers), not the main tab shell.

## 1. Secondary surfaces discovered

All of these compose `AppDrawer` / `AppModal` / `AppSheet` → `ModalParts` (and often `OverlayTabs`, `Field`, `m-settings-control`).

| Surface | Component | Used by | Portal |
| --- | --- | --- | --- |
| Catalog editor | `InventoryEditPanel` → `AppDrawer` size=editor | Menu & Inventory Add/Edit | yes |
| Overlay tabs | `OverlayTabs` | Inventory, reports, settings-adjacent | in overlay |
| Staff editor | `StaffDialogShell` → `AppModal` | Staff & Team | yes |
| Staff roles | `StaffRolesModal` | Staff | yes |
| Booking detail | `ScheduleBookingDetailPanel` | Schedule | yes |
| Appointment create | `AppModal` / `AppDrawer` | AppointmentsCalendar | yes |
| Member filter / renew | `MemberFilterSheet`, `RenewMembershipModal` | Members | yes |
| Member CRM dialogs | `AppModal` | CRM / Member Details | yes |
| Finance expense sheet | `ExpenseDetailsSheet`, `MobileFinanceOverview` filter sheet | Finance | yes |
| Report sheets | `ReportFilterSheet`, `ReportDetailSheet` | Sales reports | yes |
| Transaction / points / wallet / outstanding | `*Modal.tsx` | POS, members, sales | yes |
| Marketing drawers | `MarketingGrowthWorkspace`, `Marketing.tsx` | Marketing | yes |
| Settings delete-account | `DeleteAccountSection` `AppModal` | Settings | yes |
| Integrations | `GoogleBusinessSelectorDialog` | Google Reviews | yes |
| Inventory filter/sort | `InventoryFiltersSheet`, `InventorySortSheet` | Menu | yes |
| Confirmation | `ConfirmationDialog` → `Modal` | many | yes |
| Super-admin drawers | Outlet inspector, support, deletions | platform | yes |
| Account Setup | `OnboardingShell` (page, not portal) | already tokenized | no |
| Auth dialogs | login/error `AppModal` if present | auth | yes |

## 2. Inconsistent components (before)

- `ModalParts`: Tailwind `px-4 py-4 space-y-4 text-base sm:text-lg` plus duplicate safe-area on the footer.
- `OverlayTabs`: `min-height: var(--touch-min)` (44px) + `font-size: 0.875rem` stacked on 16px body padding.
- Inventory form: `space-y-6`, `FormGrid gap-6`, `text-lg` title/price, `min-h-[12rem]` textarea, `p-4` commission/redeem cards, custom `p-4` redeem input.
- `mobile-tokens.css` modal rules lost to Tailwind (tokens imported **before** `@tailwind utilities`).

## 3. Root-cause categories

1. **Cascade** — Tailwind utilities on shared overlay chrome beat earlier token CSS.
2. **Editor forms** — page-level `gap-6` / `space-y-6` ignored `--form-gap`.
3. **Not a Portal inheritance bug** — `:root` density tokens already reach `document.body`.
4. **Not a stale APK** — build parity already proven; this is presentation CSS.

## 4. Components standardized

- Tokens: `--editor-*`, `--modal-padding`, `--drawer-padding`, `--sheet-padding` (aliases).
- CSS: `density-system.css` overlay chrome (loads last).
- `ModalParts` structural classes only.
- Inventory editor consumes `.m-editor-form`, `.m-editor-card`, `.m-editor-heading`, `.m-editor-textarea`.
- Every other overlay inherits compact header/body/footer/tabs/controls.

## 5. Add New Service before / after

| Region | Before (APK) | After (shared tokens) |
| --- | --- | --- |
| Eyebrow | 11px (ok) | `--font-label` |
| Untitled | `text-lg` (18px) | `--editor-title-size` 16px |
| Tabs | 44px + 14px + extra margin | 40px / `--font-body` |
| Inputs | `m-settings-control` plus body `py-4` | 40px control, 12px pad |
| Description | `min-h-[12rem]` | `--editor-textarea-min-height` 6rem |
| Commission / Redeem cards | `p-4` + 24px grid gap | `.m-editor-card` + `--editor-field-gap` |
| Footer | 12px + extra safe-area utilities | 8px + safe-bottom once, 40px buttons |

## 6. Parity matrix

Compare F12 vs APK at 360 / 375 / 390 / 412 / 427. Goal: same hierarchy and control class, not pixel-perfect.

| # | Surface | Chrome | Notes |
| --- | --- | --- | --- |
| 1 | Add Service Details | shared editor | textarea still taller |
| 2 | Add Service Pricing | shared + `.m-editor-card` | |
| 3 | Add Service Availability | shared card | |
| 4 | Add Service Media | shared card | preview box exception |
| 5 | Edit Service | same panel | |
| 6 | Member overlay | AppModal chrome | |
| 7 | Staff editor | AppModal chrome | |
| 8 | Schedule booking editor | AppDrawer chrome | |
| 9 | Settings modal | AppModal chrome | |
| 10 | Account Setup | OnboardingShell tokens | not a drawer |
| 11 | Finance / marketing / report sheets | AppSheet chrome | |

## 7. Tests

- `test/visual/merchant-editor-parity.spec.ts` — Details/Pricing/Availability/Media at 375, 390, 412, 427. Range asserts for title, tab, input, button, footer, padding, overflow, footer overlap. Enlarged root font at 375.
- Existing `merchant-responsive.spec.ts` still covers drawer width across phone/tablet/desktop.

## 8. Remaining exceptions

- 44px close button.
- Native Android select chrome on Category.
- POS sticky cart height.
- Super-admin inspector dense tables (desktop-first).
- Package builder “Add service” rows keep list padding for drag handles.

## 9. Fresh APK

Built 2026-09-26 6:40 PM local with `npm run android:debug:fresh`.

- Path: `D:\GitHub\bookglow\apps\merchant-portal\android\app\build\outputs\apk\debug\app-debug.apk`
- Timestamp: 26/9/2026 6:40:14 PM
- Size: 5,223,751 bytes
- Fingerprint: `commit: c3df753`, `built: 2026-09-26T10:38:02.495Z`, `density: v4`
