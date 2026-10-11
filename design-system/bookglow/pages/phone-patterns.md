# Phone operational patterns

> Shared phone composition for the merchant app. Page files override this only when the job requires it (calendar, POS tablet rail).

**Applies below:** 720px for POS catalogue/cart; 600px for shell density; bottom nav until 1024px.

**UX system:** `apps/merchant-portal/docs/BOOKGLOW_UI_SYSTEM.md`. Visual height ≠ touch target. Use `MobilePageActions`, `MetricRail`, and `FilterChipRow` instead of per-page hero buttons, stacked KPI cards, or wrapping chips.

## Three surfaces

| Surface | Content |
|---------|---------|
| Phone | Compact **list rows**, sheets with **sticky footer**, one primary CTA above the tab bar |
| Tablet | Two-pane when the job is scan+act (POS). Same mobile chrome until 1024 |
| Desktop | Sidebar + tables / split panes |

## List row

Use `.m-list-row` / `DenseEntityRow` / page `.m-*-card` tokens:

- Height **56–64px** (not 96px)
- Leading 40px thumb/avatar (optional)
- Title 14px, one meta line 12px, trailing action ≥44px hit
- Title `line-clamp-1` or `truncate`
- Shared by POS catalogue, inventory, members, staff, reports, schedule cards, Today attention/appointments, marketing lists, member history, and finance history

## Sheet

`AppSheet` and POS cart:

- Header / **scroll body** / **`.m-sheet-footer`**
- Primary action stays in the footer (visible while the body scrolls)
- Phone sheet height: `100dvh − bottom nav − safe-area` (do not use `92vh` plus a nav margin)

## Sticky CTA

`StickyActionBar` / POS sticky cart sit **above** `--mobile-bottom-nav-height` + `--safe-bottom`.

## Do not

- Stack a desktop rail vertically on phone
- Change auth, payments, or assignment rules while applying density
- Add shadcn, Phosphor, or a new palette
