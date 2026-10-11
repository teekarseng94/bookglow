# POS

> Overrides `pages/merchant-portal.md` for the point-of-sale catalogue and cart. Phone composition also follows `pages/phone-patterns.md`.

**Page:** `apps/merchant-portal/pages/POS.tsx`  
**Density:** 8  
**Breakpoints:** mobile compact rows < 720px; tablet split 720–1199 with vertical scan tiles; desktop list from `posd` (1200px)

## Layout

- Catalogue + cart; phone cart is a sheet + sticky bar above bottom nav
- Phone catalogue rows **56–64px** (40px thumb, 14px title, 44px add)
- Phone sheet: scrollable lines + order details; **Proceed to Payment pinned** in `.m-sheet-footer`
- Line items: name/price on the first row; qty + staff on **one** compact row
- Tablet (iPad Mini): two-pane workspace `minmax(0,1fr) minmax(300px,320px)`; catalogue grid is 3 columns, 4 when the catalogue is ≥560px
- Sticky checkout must clear `--mobile-bottom-nav-height` and `--safe-bottom`
- Keep existing `.m-pos-*` class grammar
- Do not switch POS to the desktop list layout at 1024px (`lg`) — desktop catalogue starts at 1200px

## Controls

- Search 44px
- Category chips 36px height, 8px gap, horizontally scrollable
- Add-to-cart control: **44×44px** on phone and tablet
- Checkout button: 44px minimum, `--brand`
- Qty steppers: 44px on phone and tablet

## Feedback

- Live badge uses `--success`, not a new colour
- Totals: tabular numbers, `--text-primary`
- Success total may use the 26px mobile page-title size
- Do not change tender, rounding, or inventory maths when applying visuals
