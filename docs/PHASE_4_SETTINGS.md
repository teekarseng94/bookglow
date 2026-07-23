# Phase 4 — Settings

**Status:** Complete  
**Date:** 2026-07-15  
**Primary target:** `apps/merchant-portal/pages/Settings.tsx`

## Locked (unchanged)

- Firestore field names and outlet document writes (`handleSaveBookingInfo`)
- Booking slug generation / validation (`shopNameToBookingSlug`, `isValidBookingSlug`)
- Booking URL + QR presentation values
- Reminder settings (`reminderEnabled`, `reminderChannel`, `reminderTiming`) via `onUpdateSettings`
- Payment methods add / edit / remove
- Receipt layout fields (`receiptHeaderTitle`, `receiptCompanyName`, `receiptPhone`, `receiptAddress`, `receiptFooterNote`)
- Outlet mode, admin simulate, feature locks
- Voucher redemption PIN (`voucherRedemptionPin`)
- API key generate / regenerate / hash-only storage / copy / modal (never store raw key)
- Chatbot API modal entry (`Settings` integrations section)

## Presentational additions

`apps/merchant-portal/components/settings/`

| Component | Role |
|-----------|------|
| SettingsPageHeader | Compact page header + shortcut actions |
| SettingsNavigation | Desktop sticky nav for 8 sections |
| SettingsSection | Section chrome; mobile accordion, desktop open |
| SettingsMobileSection | Alias for accordion-first section |
| OperatingHoursRow | One-line day \| open–close \| Open/Closed |
| SettingsSaveBar | Explicit **Save Changes** (no auto-save) |
| SettingsSaveStatus | idle / saving / saved / failed |

## Eight sections

| # | Nav id | Content |
|---|--------|---------|
| 1 | `business-profile` | Shop name |
| 2 | `booking-page` | Slug, public URL, QR, address, phone |
| 3 | `operating-hours` | Seven `OperatingHoursRow`s + Save Changes → `handleSaveBookingInfo` |
| 4 | `notifications` | Reminder enable / channel / timing |
| 5 | `receipt-payment` | Payment methods + receipt layout + preview |
| 6 | `access-permissions` | Outlet mode, admin simulate, feature locks |
| 7 | `integrations` | Chatbot API modal entry |
| 8 | `advanced` | Voucher redemption PIN |

## Layout outcomes

- Desktop: left sticky section nav + single content column
- Mobile: nav hidden; sections accordion via `SettingsSection`
- Operating hours: explicit Save Changes; close/navigate without save does not write hours/address/phone/slug
- API key UI remains modal; raw key shown only after generate

## Verification

- `npm run build:merchant` — PASS (2026-07-15)
- Behavioral parity: booking save, reminders, payment/receipt, locks, API modal, voucher PIN

## Next

Phases 0–5 complete. See `docs/PHASE_5_STAFF.md`.
