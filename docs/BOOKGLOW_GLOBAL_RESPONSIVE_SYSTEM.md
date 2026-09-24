# BookGlow global responsive system

**Runtime source:** `apps/merchant-portal/index.css` tokens, `apps/merchant-portal/styles/responsive-system.css`, `apps/merchant-portal/components/ui/`.  
**Brand:** Unchanged. See `design-system/bookglow/MASTER.md`.

This system is additive. Existing Tailwind `sm` / `md` / `lg` / `post` / `posd` stay. New work should prefer tokens, container queries, and the shared components below.

---

## 1. Breakpoint strategy

| Band | Width | Shell | Overlay default |
|------|-------|-------|-----------------|
| Phone | 320–599 | Mobile header + bottom nav | Editor drawer full-screen |
| Tablet portrait | 600–899 | Still mobile chrome (`Layout` switches at 1024) | Editor drawer inset-stretched (`inset-inline-start: 2rem`) |
| Tablet landscape / compact desktop | 900–1023 | Still mobile chrome | Same inset-stretched editor |
| Desktop | 1024+ | Sidebar | Editor drawer fixed `52rem` rail (10-inch landscape included) |
| Large desktop | 1440+ | Sidebar | Same editor width; page grids may add columns |

Keep using:

- `sm` 640, `md` 768, `lg` 1024, `xl` 1280 for existing utilities
- `post` 720 / `posd` 1200 for POS only
- New optional Tailwind screens: `tab` 600, `compact` 900

Do not drive overlay form columns from viewport `md`. Drive them from the **drawer/modal container**.

---

## 2. Global design tokens

Added on `:root` (index.css):

| Token | Role |
|-------|------|
| `--bp-phone-max` … `--bp-desktop` | Documentation + future queries |
| `--page-pad-x` / `--page-pad-y` | Content frame padding |
| `--section-gap`, `--card-pad`, `--form-gap`, `--toolbar-gap` | Rhythm |
| `--drawer-pad-x`, `--modal-pad-x`, `--table-cell-x/y` | Overlay and table padding |
| `--touch-min` 44px, `--touch-gap` 8px | Touch |
| `--drawer-size-sm\|md\|lg\|xl\|editor` | Overlay widths |
| `--drawer-chrome-top` | 4.5rem under desktop utility bar |

`.bookglow-content-frame` is a named container: `container-name: page`.

---

## 3. Reusable layout components

| Component | File | Use |
|-----------|------|-----|
| `AppDrawer` | `components/ui/AppDrawer.tsx` | `variant`, `size: sm\|md\|lg\|xl\|editor` |
| `OverlayTabs` | `components/ui/OverlayTabs.tsx` | Scrollable underline or segmented tabs, 44px, arrow keys |
| `FormGrid` | `components/ui/FormGrid.tsx` | 1 column until the container is ≥28rem |
| `ScrollTable` | `components/ui/ScrollTable.tsx` | Horizontal table region; does not hide columns |
| `PageHeader`, `FilterToolbar`, `StickyActionBar` | existing | Filter toolbar now rows from `compact` 900px |
| `InventoryEditPanel` | inventory | Menu editor chrome (`size="editor"`) |

Do not create extra wrappers that force POS, Schedule, and Finance into one page template.

---

## 4. Drawer and modal standards

**Editor drawers** (`size="editor"`):

- Phone: full viewport
- Tablet (600–1023, including 7-inch ~811 CSS px): inset-stretched overlay, not a 32rem rail. Do not put `min()` + `vw` in `:root` custom properties; Android WebView drops those.
- Desktop / 10-inch landscape (~1463 CSS px): plain `52rem` right rail below the utility bar. Do not use `min()` + `%` on the rail width.
- Sticky header, scroll body, sticky footer with safe-area padding
- Parent still owns save / cancel / unsaved rules

**Default drawers** (`size="md"`, 32rem): schedule details, marketing, existing right rails.

**Modals:** keep `AppModal` sizes. Complex staff forms use `size="xl"` + `mobileFullscreen` on phones.

---

## 5. Tab and form standards

- Labels stay on one line (`white-space: nowrap`)
- Overflow scrolls inside the tablist; the **page** must not scroll horizontally
- Minimum tab height `--touch-min`
- Keyboard: Left/Right/Home/End
- Forms: `FormGrid` for pairs of fields. Do not use `md:grid-cols-2` inside overlays

---

## 6. Responsive table patterns

| Context | Pattern |
|---------|---------|
| Phone | Existing entity cards (Menu, Members, POS, Finance) |
| Tablet+ dense catalog / history | `ScrollTable` (or existing overflow region) |
| Financial values | Remain visible; tabular wrapping via existing money helpers where present |

Do not drop columns to “make it fit”.

---

## 7. Container-query strategy

| Container | Name | Consumers |
|-----------|------|-----------|
| Page frame | `page` | `FormGrid` on-page |
| Drawer panel | `drawer` | `FormGrid`, `OverlayTabs` flex, `m-icon-grid` |
| Modal panel | `overlay` | `FormGrid` inside dialogs |
| POS catalogue | `pos-catalogue` | Existing POS cards (unchanged) |

Nested UI must listen to its overlay width, not the 1024px viewport that includes the sidebar.

---

## 8. Mobile and Android safe-area rules

Unchanged and still required:

- `viewport-fit=cover`
- `--safe-top/right/bottom/left`
- Bottom nav and sticky footers include `safe-bottom`
- Editor footers use `ModalFooter` padding `pb-[max(0.75rem,env(safe-area-inset-bottom))]`

---

## 9. Migration approach

1. Tokens + `responsive-system.css`
2. Shared drawer/tabs/forms/tables
3. Menu & Inventory as the first editor
4. Staff tabs + Settings tablet nav
5. Remaining pages: switch overlays to `size` tokens when they show the 420px/wrapping-tab failure
6. Keep POS/Schedule/Dashboard page-specific CSS

---

## 10. Usage examples

```tsx
<AppDrawer open={open} onClose={onClose} title="Edit Service" variant="right" size="editor" footer={footer}>
  <OverlayTabs ariaLabel="Edit sections" value={tab} onChange={setTab} items={EDIT_TABS} />
  <FormGrid>
    <Field id="name" label="Name">{/* input */}</Field>
    <Field id="price" label="Price">{/* input */}</Field>
  </FormGrid>
</AppDrawer>
```

```tsx
<ScrollTable label="Catalog items">
  <table>{/* all columns */}</table>
</ScrollTable>
```

---

## 11. Responsive test matrix

Harness: `apps/merchant-portal/test/visual/merchant-responsive.spec.ts`  
Viewports: 320×700, 375×812, 390×844, 600×960, 768×1024, 811×1444 (7-inch), 820×1180, 1024×768, 1180×820, 1280×800, 1440×900, 1463×823 (10-inch), 1920×1080, plus 375 and 768 at 24px root font.

Checks: no page overflow, drawer not overflowing, tabs not wrapping, save visible, phone drawer full-width, tablet 600–1023 drawer near-full (`viewport − 40px`), desktop/10-inch rail ~52rem with 2-column pricing.

POS and Dashboard keep their own harnesses.

---

## 12. Visual regression

Artifacts: `apps/merchant-portal/test/visual/artifacts/merchant-responsive-*.png`  
Run:

```bash
npx playwright test test/visual/merchant-responsive.spec.ts --project=layout-harness
```

Do not treat a new screenshot as correct without inspecting it. Authenticated live-route captures still use `auth-setup` and a completed merchant fixture (`VISUAL_TESTING.md`).
