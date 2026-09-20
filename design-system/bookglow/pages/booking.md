# Customer booking page

> Overrides `pages/customer-booking.md` for the live `/book/:bookingPath` journey.

**Files:** `apps/customer-site/apps/booking/*`, `components/booking/*`, `.bookglow-booking` in `utilities.css`

## Flow (unchanged)

Service → staff → date/time → details → confirm.

Visual hierarchy:

1. Merchant identity (mark + name)
2. Current step content
3. Persistent CTA (`BookingStickyAction`)

## Selection

Use pressed semantics, not colour-only:

```html
<button type="button" aria-pressed="true">Thai massage · 60 min</button>
```

Selected: `--brand-soft` background, `--brand` border, `--brand-deep` text.  
Unavailable: 0.55 opacity, `disabled`, not a third palette.

## Sticky dock

- Reserve `padding-bottom: calc(7.5rem + env(safe-area-inset-bottom))` (already on `.bookglow-booking`)
- Primary CTA: `--brand`, min-height 48px
- Price/meta: `--text-secondary`, tabular nums

## Confirmation

Success uses `--success` / `--success-soft`. Do not switch to skill “trust blue”.

## Do not

- Change `bookingApi`, availability, or payment redirects
- Add Lora/Raleway to this page
