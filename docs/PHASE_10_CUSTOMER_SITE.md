# Phase 10 — Current Customer Site and Booking Experience

**Status:** Complete  
**Date:** 2026-07-15  

## Targets

| File | Status |
|------|--------|
| `apps/customer-site/apps/booking/BookingPage.tsx` | Complete |
| `apps/customer-site/apps/booking/BookingAuth.tsx` | Already aligned (kept) |
| `apps/customer-site/apps/booking/SignUp.tsx` | Already aligned (kept) |
| `apps/customer-site/App.tsx` | Marketing visuals / copy |
| `apps/customer-site/components/FloatingScreens.tsx` | Product UI previews |
| `apps/customer-site/services/authService.ts` | Friendly auth errors |

**Not touched:** `booking-v2` (experimental; not live). No new booking implementation.

---

## Locked (unchanged)

- Routes `/book/:bookingPath`, `/book/:bookingPath/auth`, `/signup`
- Path resolution, merchant loading, service / date / time / contact flow ownership
- Availability requests, booking submission, confirmation state
- Auth redirects and registration handlers
- State and route ownership remain in `App.tsx` / `BookingPage.tsx`

## Presentational additions

`apps/customer-site/components/booking/`

| Component | Role |
|-----------|------|
| BookingMerchantHeader | Compact merchant identity + share / login |
| BookingServiceCard | Name, duration, price |
| BookingStickyAction | One mobile sticky continue action |
| BookingStateScreen | Loading / unavailable chrome |
| BookingEmptyState | Empty services / no availability |
| `ANY_AVAILABLE_STAFF` + `friendlyBookingError` | Optional staff + calm errors |

## Booking outcomes

- Merchant name visible immediately in compact nav
- Service discovery early; cards show name / duration / price
- **Any available** where `staffId` is optional on `createPublicBooking`
- Explicit loading / empty slot states
- Submit errors sanitized (no raw Firebase messages)
- Success remains calm and information-led

## Marketing outcomes

- Stock Unsplash / Picsum imagery replaced with product-interface panels
- Testimonials describe actual Bookglow capabilities (booking, POS, reports, schedule)
- CTA destinations and routes preserved
- No ZenFlow / ZenSpa presentation copy introduced

## Verification

- `npm run build:customer` — PASS

## Next

**Phase 11 — Super Admin and Secondary Surfaces** — see `docs/PHASE_11_SUPER_ADMIN.md`
