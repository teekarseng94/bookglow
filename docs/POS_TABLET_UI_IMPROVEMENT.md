# Merchant POS tablet UI improvement

**Scope:** Merchant Portal → POS (`apps/merchant-portal/pages/POS.tsx` and presentational `components/pos/*`).  
**Updated:** 21 September 2026  
**Deployed to production:** No

This work redesigns the POS **layout** for tablet / iPad Mini. Sale creation, customers, services, pricing, discounts, commissions, staff assignment, payment methods, and backend behaviour are unchanged.

Design direction: [UI UX Pro Max](../.cursor/skills/ui-ux-pro-max/SKILL.md) (44px touch targets, chip overflow nowrap, focus not obscured, breakpoint testing) and [design-system/bookglow](../design-system/bookglow/README.md) / [pages/pos.md](../design-system/bookglow/pages/pos.md).

---

## Current 768×1024 problems

The previous POS treated iPad Mini portrait as a squeezed desktop/mobile hybrid:

- The split pane activated at Tailwind `sm` (640px) with **horizontal** service cards in two columns.
- The cart used `sm:w-[min(40%,340px)]` with a ~280px minimum, so at 768px both columns were too narrow.
- Service names wrapped aggressively; prices and metadata competed for the same row.
- Order Summary was a thin sidebar, not a checkout workspace.
- Checkout could sit below the bottom navigation because the workspace height followed catalogue content instead of the visible shell.
- Tailwind `flex` on `.m-pos-workspace` overrode later `display: grid` rules (mobile-tokens is imported **before** `@tailwind utilities`).

The result was cramped cards, a weak hierarchy, and unused tablet canvas.

---

## UI UX Pro Max research used

| Topic | Guidance applied |
| --- | --- |
| Touch-first POS | Minimum **44×44px** add, qty, remove, search, payment, and checkout controls |
| Tablet split-pane | Dedicated 720–1199 range; not a stretched phone and not desktop-at-1024 |
| Information-dense catalogue | Compact vertical tiles, 2-line `line-clamp` names, scan-many-services |
| Chip / filter overflow | Single-row chips with horizontal scroll; selected chip stays filled brand |
| Checkout accessibility | Totals + CTA stay in a sticky rail footer; cart body scrolls independently |
| Focus | Existing `focus-visible:shadow-ui-focus-strong`; destructive remove uses danger hover |
| Visual language | BookGlow purple, Inter, existing tokens; no Soft UI Evolution / spa-gradient restyle |

Beauty/spa “Soft UI Evolution” palettes from the skill were **rejected** so POS stays on BookGlow tokens.

---

## Responsive architecture before / after

| Width | Before | After |
| --- | --- | --- |
| &lt; 720px | Phone rows + sticky cart + sheet | Unchanged phone pattern |
| 640–1199 | Early `sm` split, 2-col horizontal cards, ~40% cart | **720–1199 tablet mode** (see below) |
| 1024 (`lg`) | App sidebar appears; POS could flip toward desktop | POS **stays tablet tiles** until 1200px |
| ≥ 1200 (`posd`) | Desktop list + 360px Order Summary | Same desktop list + 360px rail, without tablet/phone leaks |

---

## Tablet breakpoint strategy

```
phone     < 720px
tablet    720px–1199.98px   /* iPad Mini portrait + landscape, Galaxy Tab, etc. */
desktop   ≥ 1200px          /* posd — approved list layout */
```

`tailwind.config.js` adds `post: 720px` beside existing `posd: 1200px`. Critical show/hide and grid rules are also unlayered CSS **after** `@tailwind utilities` in `index.css`, because `post:` utilities are not always present in a reused Vite dev server and `.flex` otherwise wins.

Workspace columns:

```css
grid-template-columns: minmax(0, 1fr) minmax(300px, 320px);
```

Catalogue ~58–60% / Order Summary ~40–42% at 768px, with the rail never below 300px.

---

## iPad Mini portrait result (768×1024)

- Two-pane POS: 3 compact vertical service tiles, 320px Order Summary.
- Search + filter button on one row; category chips scroll horizontally (Nails is off-canvas until scrolled).
- Empty cart is a small icon + two lines, not a large decorative block.
- Payment, totals, and **Proceed to Payment** sit in the rail footer **above** Today / Schedule / POS / Members / More.
- Safe-area: shell `bookglow-main-scroll` padding already clears `--safe-top` / `--safe-bottom`; tablet POS fills that padded pane and does not scroll the page behind the nav.
- Adding a service updates the rail in place (no phone sheet). Qty (44px) and staff select stay usable.

Screenshot: `apps/merchant-portal/test/visual/artifacts/pos-layout-768x1024.png`  
With item: `pos-layout-768x1024-with-item.png`  
24px root font: `pos-layout-768x1024-font-24.png`

---

## iPad Mini landscape result (1024×768)

- Still **tablet** POS (tiles + rail), not the 1200px desktop list.
- Merchant shell shows the **desktop sidebar** at `lg` (1024). That is app chrome, not a POS layout switch.
- Catalogue stays 3-up because the remaining width after sidebar + 320px rail is below the 560px container-query threshold for 4 columns. Forcing 4-up would drop card width under the 118px readability floor.

Screenshot: `pos-layout-1024x768.png`

Other tablet sizes: `pos-layout-820x1180.png`, `pos-layout-1180x820.png`.

---

## Service-grid changes

- Phone: full-width horizontal row (`m-pos-mobile-card`).
- Tablet: vertical scan tile (`m-pos-tablet-card`) — image, 2-line name, duration/points, `MoneyAmount` price, 44px brand add.
- Desktop 1200+: compact list row (`m-pos-desktop-row`).
- Grid: 3 columns; **4 columns** only when the catalogue container is ≥560px (content-driven, not viewport-forced).

---

## Order Summary improvements

- Persistent rail from 720px (no sticky “View order” bar on tablet).
- Header: Order Summary + clock/date; phone BookGlow/close chrome is hidden.
- Customer search + New Customer (existing handlers).
- Items scroll in `.m-pos-cart-body`; payment + totals stay in `.m-pos-cart-footer`.
- Lightweight empty state.
- Tablet cart rows drop the extra thumb so staff select can show “Staff” instead of clipping to “S..”.

---

## Files changed

| File | Change |
| --- | --- |
| `apps/merchant-portal/pages/POS.tsx` | Tablet workspace overflow; compact empty order |
| `apps/merchant-portal/components/pos/POSItemCard.tsx` | Phone / tablet / desktop variants |
| `apps/merchant-portal/components/pos/POSCartSheet.tsx` | Persistent rail; phone vs tablet vs desktop headers |
| `apps/merchant-portal/components/pos/POSCartItem.tsx` | 44px qty/remove; tablet control wrapping |
| `apps/merchant-portal/components/pos/POSCatalogueList.tsx` | `.m-pos-catalogue-grid` |
| `apps/merchant-portal/components/pos/POSCatalogueToolbar.tsx` | Compact search + chip row |
| `apps/merchant-portal/components/pos/POSPageHeader.tsx` | Compact tablet intro |
| `apps/merchant-portal/components/pos/POSPaymentSection.tsx` | Stacked 44px tablet payment |
| `apps/merchant-portal/components/pos/POSStickyCartAction.tsx` | Phone-only (`post:hidden` + CSS) |
| `apps/merchant-portal/components/pos/POSTotals.tsx` | `MoneyAmount`; 44px checkout |
| `apps/merchant-portal/components/pos/POSMemberSummary.tsx` | Tablet customer field |
| `apps/merchant-portal/styles/mobile-tokens.css` | 720–1199 POS density |
| `apps/merchant-portal/index.css` | Unlayered tablet/desktop POS layout (beats Tailwind `.flex`) |
| `apps/merchant-portal/tailwind.config.js` | `post: 720px` |
| `design-system/bookglow/pages/pos.md` | Tablet POS spec |

---

## Tests added / updated

| File | Role |
| --- | --- |
| `apps/merchant-portal/test/visual/pos-layout.spec.ts` | Viewport geometry, overflow, 44px add, checkout above nav, 24px font |
| `apps/merchant-portal/test/visual/pos-layout-harness.html` / `.tsx` | Layout harness (no live merchant data) |
| `apps/merchant-portal/components/pos/POSItemCard.test.tsx` | Renders all three card variants + `MoneyAmount` |
| `apps/merchant-portal/playwright.config.ts` | `layout-harness` project matches `pos-layout` |

Viewports: 320, 375, 390, 768×1024, 1024×768, 820×1180, 1180×820, 1280, 1440, 1920.

---

## Screenshots

Saved under `apps/merchant-portal/test/visual/artifacts/`:

- `pos-layout-320x640.png`
- `pos-layout-375x812.png`
- `pos-layout-390x844.png`
- `pos-layout-768x1024.png`
- `pos-layout-768x1024-with-item.png`
- `pos-layout-768x1024-font-24.png`
- `pos-layout-1024x768.png`
- `pos-layout-820x1180.png`
- `pos-layout-1180x820.png`
- `pos-layout-1280x800.png`
- `pos-layout-1440x1000.png`
- `pos-layout-1920x1080.png`

---

## Verification

| Check | Result |
| --- | --- |
| `npm --prefix apps/merchant-portal run typecheck` | Pass |
| `npm --prefix apps/merchant-portal test` (Vitest) | **52 files, 181 tests** pass |
| `npx playwright test test/visual/pos-layout.spec.ts --project=layout-harness` | **3 passed** |
| `npm --prefix apps/merchant-portal run build` | Pass (Vite 6.4.3, 2554 modules, ~10s) |

Authenticated live POS (cloud merchant session, sale completion, void, outlet permissions) was **not** re-run in this pass. Layout harness uses fixture services only.

---

## Remaining issues

1. **4-up catalogue at 1024×768** is intentionally not forced. The merchant sidebar at `lg` leaves too little catalogue width; 3-up stays above the 118px card floor. 4-up appears when the catalogue container is ≥560px (e.g. a wider tablet without a 240px sidebar).
2. **Category chips** on 768 portrait scroll horizontally (Nails is one swipe away). That is preferred over wrapping into extra rows.
3. **Last catalogue row** can sit under the fold; the catalogue pane scrolls. Checkout never sits behind the bottom nav.
4. **Custom `post:` Tailwind screen** is not always emitted by a long-lived Vite process. Unlayered CSS in `index.css` is the source of truth for tablet/desktop show-hide. Restarting `npm run dev` after `tailwind.config.js` changes is still recommended.
5. Layout tests do not exercise live sale completion, voucher redemption, or void. Those flows were not modified.

---

## Deployment readiness

- UI-only. No schema, RPC, or payment-logic change.
- Typecheck, Vitest, Playwright layout harness, and production build pass.
- **Do not deploy automatically.** Staging visual QA on a real iPad Mini (portrait + landscape) is still recommended before production.
