# BookGlow tokens

Three-layer token architecture. Values below are the **proposed canonical set**. They reuse existing BookGlow hex values; they are not yet a new runtime CSS file.

```
Primitive  →  Semantic  →  Component
```

Components should consume semantic or component tokens, never raw hex.

## Primitive

```css
:root {
  /* Brand primitives */
  --color-purple-500: #7656d6;
  --color-purple-600: #6244bd;
  --color-purple-800: #3e2b7d;
  --color-purple-50:  #f0ebff;
  --color-purple-200: #d8cdf9;
  --color-rose-500:   #c84d78;

  /* Neutral primitives */
  --color-ink-950: #19161d;
  --color-ink-800: #332d37;
  --color-ink-600: #615a66;
  --color-ink-500: #6f6873; /* proposed readable muted */
  --color-ink-400: #89818c; /* disabled only */
  --color-canvas:  #f7f4f6;
  --color-paper:   #fffdfb;
  --color-white:   #ffffff;
  --color-soft:    #fbf8fa;
  --color-line:    #e9e2e8;
  --color-line-2:  #d9cfd9;

  /* Status primitives */
  --color-green-700: #16735d;
  --color-green-50:  #e9f6f1;
  --color-amber-800: #96620a;
  --color-amber-50:  #fff6dd;
  --color-red-700:   #a43b50;
  --color-red-50:    #fff0f3;
  --color-blue-800:  #3d5a80;
  --color-blue-50:   #eef3f8;

  /* Platform primitives */
  --color-slate-950: #111827;
  --color-slate-800: #263244;
  --color-mint-300:  #7de2be;

  /* Space (4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Type */
  --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-size-page: 1.5rem;
  --font-size-section: 1rem;
  --font-size-body: 0.9375rem;
  --font-size-label: 0.6875rem;
  --font-size-caption: 0.75rem;

  /* Radius / shadow / time */
  --radius-xs: 8px;
  --radius-sm: 10px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --duration-fast: 150ms;
  --duration: 200ms;
}
```

## Semantic

Map existing BookGlow aliases onto primitives. Keep current names so production CSS can migrate without a rewrite.

```css
:root {
  --bg-canvas: var(--color-canvas);
  --bg-paper: var(--color-paper);
  --bg-surface: var(--color-white);
  --bg-soft: var(--color-soft);
  --bg-selection: var(--color-purple-50);

  --text-primary: var(--color-ink-950);
  --text-secondary: var(--color-ink-600);
  --text-muted: var(--color-ink-500);
  --text-on-brand: var(--color-white);

  --brand: var(--color-purple-500);
  --brand-hover: var(--color-purple-600);
  --brand-deep: var(--color-purple-800);
  --brand-soft: var(--color-purple-50);
  --brand-border: var(--color-purple-200);
  --rose: var(--color-rose-500);

  --line: var(--color-line);
  --line-strong: var(--color-line-2);

  --success: var(--color-green-700);
  --warning: var(--color-amber-800);
  --danger: var(--color-red-700);
  --info: var(--color-blue-800);

  --focus-ring: 0 0 0 3px rgba(118, 86, 214, 0.16);
  --focus-ring-strong: 0 0 0 3px rgba(118, 86, 214, 0.28);

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);

  --touch-min: 44px;
}
```

Existing `--color-action-primary` aliases stay as compatibility shims.

## Component

```css
:root {
  --button-bg: var(--brand);
  --button-fg: var(--text-on-brand);
  --button-bg-hover: var(--brand-hover);
  --button-radius: var(--radius-sm);
  --button-height-md: 40px;
  --button-height-lg: 48px;

  --input-bg: var(--bg-surface);
  --input-border: var(--line-strong);
  --input-radius: var(--radius-sm);
  --input-height: 40px;
  --input-focus-border: var(--brand);

  --card-bg: var(--bg-surface);
  --card-border: var(--line);
  --card-radius: var(--radius-md);
  --card-shadow: var(--shadow-xs);
  --card-padding: var(--space-4);

  --modal-overlay: rgba(25, 22, 29, 0.42);
  --modal-radius: var(--radius-lg);

  --nav-active-bg: var(--brand-soft);
  --nav-active-fg: var(--brand-deep);
}
```

## Density overrides

| App | Density | Spacing character |
|-----|---------|-------------------|
| Master | 6 / Standard | 4–24px rhythm |
| Merchant portal | 7–8 | Compact headers, 12–16px card padding |
| POS / schedule | 8 | Tight rows, sticky actions |
| Customer booking | 4–5 | Larger type, 16–24px section gaps |
| Superadmin | 8 | Dense tables, 40px rows |

## Tailwind mapping (merchant)

Already present — keep using these instead of new colour names:

- `bg-brand`, `text-brand`, `border-brand`
- `rounded-ui-sm|md|lg`
- `shadow-ui-xs|sm|md|lg|focus-strong`
- `space-ui-*`, `safe-t/r/b/l`
- `text-app-page|section|body|label`

Legacy `teal-*` utilities already resolve to the purple family. New code must use `brand` / CSS variables, not `teal-600`.

## Do not introduce

- A second token file that diverges hex values
- HSL-only tokens that ignore current CSS variables
- Dark semantic overrides for merchant or customer in this phase
