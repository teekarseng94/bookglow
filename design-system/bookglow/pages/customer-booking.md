# Customer booking website

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/bookglow/MASTER.md`).

**App:** `apps/customer-site`  
**Surfaces:** Marketing landing, pricing, legal, merchant onboarding, live booking  
**Density:** 4–5 (more spacious than merchant)

## Shared identity

Keep Master purple/rose. Customer tokens already include `--rose`. Booking marks use `linear-gradient(145deg, var(--brand), var(--rose))`.

Larger marketing radii are allowed on **surfaces** (`--radius-md` 18px, `--radius-lg` 26px in `tokens.css`). **Controls** (inputs, buttons, slots) still use Master 10–12px so booking feels like the same product as the merchant portal.

## Landing / marketing

UI UX Pro Max landing pattern (Hero → problem → solution → social proof → CTA) matches the existing landing sections. When testimonials rotate: pause, previous/next, stop on hover/focus/reduced motion.

Primary marketing CTA: `--brand`, not a green button. `PRIMARY_GREEN` is a misnamed alias of `#7656D6` — new code must use `var(--brand)`.

Legacy `components/Button.tsx` uses slate utilities and an inline hex. Do not expand its usage. Prefer token classes already used in pricing/landing.

## Booking journey

Existing composition in `utilities.css` (`.bookglow-booking`) and `components/booking/*`:

1. Merchant header
2. Service discovery
3. Staff preference
4. Date/time sheet
5. Sticky mobile dock
6. Confirmation

Overrides:

- Sticky dock must clear `safe-area-inset-bottom`
- Selected service/staff/slot: `--brand-soft` fill + `--brand` border + `aria-pressed` / `aria-current`
- Available slots: surface + strong text; booked/unavailable: muted, not a third accent
- Confirmation uses `--success`, not a new green
- Desktop: summary rail; mobile: one decision column (see `docs/UI_STRUCTURE.md`)

## Type

- Marketing heroes may exceed 32px
- Booking body 15–16px; sticky CTA ≥ 16px / 44px height
- Inter only (no Lora/Raleway)

## Accessibility

- Section tabs are buttons or links with a current state
- Booking sheets use the same focus-trap behaviour as merchant dialogs where JS already does
- Google review and brand logos: meaningful images need `alt`; decorative marks `aria-hidden`

## Do not

- Restyle tenant booking data, payments, or availability logic
- Introduce a customer-only colour system
- Shrink the desktop summary into a scaled-down three-column grid on phones
