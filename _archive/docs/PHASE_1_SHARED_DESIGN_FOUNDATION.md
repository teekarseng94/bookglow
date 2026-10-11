# Phase 1 — Shared Design Foundation

**Status:** Complete  
**Date:** 2026-07-15  
**Production page behavior:** Unchanged (primitives not wired into operational pages yet)

## What was done

### Tokens (merchant + customer)

Completed / aligned:

- Semantic colour (surfaces, text, brand, status + soft variants)
- Typography tokens
- 4px spacing rhythm (`--space-1` … `--space-16`)
- Radius, border, elevation
- Focus-ring tokens (`--focus-ring`, `--focus-ring-strong`)
- Safe-area tokens
- Breakpoint references (`--bp-sm` … `--bp-xl`)
- Reduced-motion (already present; retained)
- Login CSS aliases (`--ink`, `--paper`, `--bg-page`, `--muted`, etc.) so login styles resolve

### Tailwind (`apps/merchant-portal/tailwind.config.js`)

- Opt-in `ui-*` spacing / radius / shadow utilities
- `brand` / surface colour aliases via CSS variables
- Explicit screens 640 / 768 / 1024 / 1280
- Existing `teal → brand` remap preserved (no global visibility remaps)

### Presentational primitives

New module: `apps/merchant-portal/components/ui/`

| Primitive | Notes |
|-----------|--------|
| PageHeader, SectionHeader, FilterToolbar, DenseEntityRow | Layout only |
| Button, IconButton | Values + callbacks |
| Field, SelectField | Controlled by parent |
| StatusBadge, Alert, EmptyState, ErrorState, LoadingSkeleton | Feedback |
| SaveStatus | Displays provided status enum |
| Sheet, Modal, ConfirmationDialog | Open/close owned by parent |
| StickyActionBar | Mobile sticky actions |

Rules respected: no Firestore, no business state, no price/availability/permission math.

### Reused (not duplicated)

- `components/Toast.tsx` — left as-is (existing toast primitive)
- Customer `components/Button.tsx` — marketing CTA unchanged
- Shell `Layout.tsx` / booking styles — not rewritten

### Customer styles

- `src/styles/tokens.css` — spacing, safe-area, status softs, focus strong, aliases
- `src/styles/reset.css` — focus-visible uses focus-ring token

## Verification

- `npm run build` — required gate for Phase 1 stop

## Explicit non-changes

- No route changes
- No Firebase Auth / Firestore edits
- No page handler changes
- No wiring of new primitives into Schedule / Menu / Settings / Staff (Phases 2–5)

## Next

**Phase 2 — Schedule page** (`AppointmentsCalendar.tsx`) using these primitives for presentation only.
