# BookGlow Design System

Documentation only. These files do **not** change production pages, routing, authentication, payments, tenant isolation, or database behaviour.

## How to retrieve

When building or reviewing a page:

1. Read [`MASTER.md`](./MASTER.md) first.
2. Check `pages/[name].md` for the application or page.
3. If a page file exists, its rules **override** Master. Otherwise use Master exclusively.
4. Use [`tokens.md`](./tokens.md) and [`components.md`](./components.md) for implementation specs.
5. Use [`REPORT.md`](./REPORT.md) for current-vs-proposed comparison and affected areas.

| File | Purpose |
|------|---------|
| `MASTER.md` | Global source of truth |
| `tokens.md` | Primitive → semantic → component tokens |
| `components.md` | Shared component specs and UI examples |
| `REPORT.md` | Research decisions, comparison, reuse, inconsistencies |
| `pages/merchant-portal.md` | Dense operational dashboard / POS / schedule |
| `pages/dashboard.md` | Merchant Today dashboard layout and KPI presentation |
| `pages/customer-booking.md` | Public site and booking journey |
| `pages/superadmin.md` | Platform operations console |
| `pages/android-webview.md` | Merchant Android WebView, status bar, safe areas |
| `pages/pos.md` | POS density and checkout actions |
| `pages/responsive.md` | Merchant drawers, tabs, forms, tables |
| `pages/schedule.md` | Calendar and appointment cards |
| `pages/booking.md` | Customer appointment selection and confirmation |

## Stack

Reuse the existing frontend:

- React 19 + Vite 6 + TypeScript
- Tailwind CSS (merchant v3, customer v4)
- Existing CSS variables and `apps/merchant-portal/components/ui/`
- `lucide-react` icons (already installed)

Do **not** add shadcn, Phosphor, GSAP, Lora/Raleway, or a new BookGlow V2 app.
