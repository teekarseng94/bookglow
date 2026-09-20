# POS

> Overrides `pages/merchant-portal.md` for the point-of-sale catalogue and cart.

**Page:** `apps/merchant-portal/pages/POS.tsx`  
**Density:** 8  
**Breakpoints:** mobile card rows < 640px; split 640–1199; desktop list from `posd` (1200px)

## Layout

- Catalogue + cart; mobile cart is a sheet + sticky bar above bottom nav
- Sticky checkout must clear `--mobile-bottom-nav-height` and `--safe-bottom`
- Keep existing `.m-pos-*` class grammar

## Controls

- Search 44px
- Category chips 36px height, 8px gap, horizontally scrollable
- Add-to-cart control: **44×44px** (today some are 38–40px)
- Checkout button: 44px minimum, `--brand`
- Qty steppers: 44px on mobile even if the visual minus/plus is smaller

## Feedback

- Live badge uses `--success`, not a new colour
- Totals: tabular numbers, `--text-primary`
- Success total may use the 26px mobile page-title size
- Do not change tender, rounding, or inventory maths when applying visuals
