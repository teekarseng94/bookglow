# BookGlow component specifications

Presentational only. Parents own data, permissions, prices, and submissions.

Reuse `apps/merchant-portal/components/ui/` unless a page file says otherwise.

## Buttons

Existing: `Button` variants `primary | secondary | ghost | danger | outline`; sizes `sm | md | lg`.

| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| primary | `--brand` | white | none | One primary action per view |
| secondary | `--bg-soft` | `--text-primary` | `--line` | Alternate action |
| outline | `--bg-surface` | `--text-primary` | `--line-strong` | Tertiary |
| ghost | transparent | `--text-secondary` | none | Inline / header |
| danger | `--danger` | white | none | Destructive, always confirm |

| Size | Height | Padding | Type |
|------|--------|---------|------|
| sm | 32px desktop / 44px mobile hit area | 12px | 14px |
| md | 40px / 44px mobile | 16px | 15px |
| lg | 48px | 20px | 16px |

States: hover uses `--brand-hover` (not opacity-only); disabled `opacity: 0.5` + `pointer-events: none`; loading keeps width; `:focus-visible` uses `--focus-ring-strong`.

```tsx
<Button variant="primary" size="md">Save appointment</Button>
<Button variant="secondary">Cancel</Button>
<IconButton aria-label="Close" size="md">{/* lucide X, aria-hidden */}</IconButton>
```

Do not use `translateY(-1px)` on primary actions inside POS or Android WebView (layout shift). Marketing login may keep the existing 1px lift.

## Inputs

Use `Field` + `fieldControlClassName` or `.m-settings-control`.

| Size | Height | Radius |
|------|--------|--------|
| compact | 36px | `--radius-sm` |
| default | 40px (44px below 768px) | `--radius-sm` |
| large | 48–56px (onboarding / booking) | `--radius-md` |

| State | Border | Ring |
|-------|--------|------|
| rest | `--line-strong` | none |
| hover | `--line-strong` | none |
| focus | `--brand` | `--focus-ring-strong` |
| error | `--danger` | danger 16% |
| disabled | `--line` | `--bg-soft` |

Always associate label (`htmlFor`) and error (`aria-describedby`, `role="alert"`). Placeholder is not a label. Placeholder colour: `--text-muted`, not hardcoded `#9a929d`.

```tsx
<Field id="phone" label="Phone" required error={phoneError}>
  <input id="phone" className={fieldControlClassName} aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? 'phone-error' : undefined} />
</Field>
```

After a failed submit: focus a summary (`tabIndex={-1}`) and keep inline errors.

## Cards

Operational card:

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  padding: var(--space-4);
}
```

Interactive rows use `.m-card-interactive` / `.m-entity-row`. Hover: border/background only. Active (mobile): `scale(0.99)`. Disabled: 0.6 opacity, no pointer events.

List rows: min-height 72–80px on mobile; desktop tables keep header `--bg-soft`.

## Tables

- Header: `--bg-soft`, `--text-secondary`, 12px uppercase optional
- Rows: `--bg-surface`, divider `--line`
- Numeric columns: `font-variant-numeric: tabular-nums`
- Mobile: replace wide tables with entity cards (already used for members, inventory, POS)

Do not introduce a new table library.

## Modals, sheets, drawers

Canonical dialog: `AppModal` (sticky header, scroll body, sticky footer).

| Size | Max width |
|------|-----------|
| sm | 28rem |
| md | 32rem |
| lg | 42rem |
| xl | 56rem |
| editor (drawer) | full-screen <600px; near-full tablet; 42rem desktop |

`AppDrawer` sizes: `sm` 24rem, `md` 32rem, `lg` 40rem, `xl` 48rem, `editor` (token `--drawer-size-editor`). Use `OverlayTabs` + `FormGrid` inside editors. See `pages/responsive.md`.

Rules:

- Overlay `.bg-ui-overlay`
- Escape and backdrop close unless `busy`
- Focus trap + restore (`useDialogInteraction`)
- Safe-area padding on overlay
- Mobile complex forms: `mobileFullscreen`
- Bottom sheets: `--radius-lg` top corners, handle 36×4px
- Confirmation of destructive actions: `ConfirmationDialog`

Prefer `AppModal` over older `Modal.tsx` for new UI. Do not add Radix.

## Navigation

Desktop merchant: 240px sidebar / 72px collapsed rail; active item `--brand-soft` + inset `--brand` bar.

Mobile merchant: 72px bottom nav + safe-area; max 5 destinations including More.

Icon-only collapsed nav: tooltip + `aria-label`.

## Feedback

| Component | Role |
|-----------|------|
| `StatusBadge` | Compact status (`success | warning | danger | info | brand | neutral`) |
| `Alert` | Persistent inline message; `danger` → `role="alert"` |
| `EmptyState` | No data + optional action |
| `ErrorState` | Recoverable failure |
| `LoadingSkeleton` | `.ui-skeleton` shimmer; static fill if reduced motion |
| `SaveStatus` | Unsaved / saving / saved |
| `Toast` | Transient; restyle off Tailwind green/red/blue onto status tokens |

Toasts must not be the only error channel for forms.

## Charts

Keep `recharts`.

- Trends: line or area, `--brand` stroke, 20% fill
- Comparison: grouped bar
- KPIs: number + caption, not a gauge
- Multiple series: colour **and** dash/pattern
- Provide a text summary or table for assistive tech

## Icons

- Library: `lucide-react` (already installed)
- Default size: 20px in buttons, 24px in mobile nav
- Stroke: 2
- Decorative: `aria-hidden`
- Do not install Phosphor
- Do not use emoji as navigation or status

## UI examples (token-only)

```html
<!-- Primary CTA -->
<button class="inline-flex h-10 min-h-11 items-center rounded-[10px] bg-[var(--brand)] px-4 font-semibold text-white shadow-[var(--shadow-xs)] hover:bg-[var(--brand-hover)] focus-visible:shadow-[var(--focus-ring-strong)]">
  Confirm booking
</button>

<!-- Status -->
<span class="inline-flex rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--success)]">Confirmed</span>

<!-- Booking slot -->
<button class="min-h-11 rounded-[10px] border border-[var(--line)] bg-[var(--bg-surface)] px-3 text-sm font-semibold text-[var(--text-primary)] aria-pressed:border-[var(--brand)] aria-pressed:bg-[var(--brand-soft)] aria-pressed:text-[var(--brand-deep)]">
  14:30
</button>
```
