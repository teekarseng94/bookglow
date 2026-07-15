# ZenFlow Project Master Map (Routes)

Single source of truth for all active routes after migration.

## Domains

- Booking + marketing site: `https://bookglow-83fb3.web.app`
- Merchant dashboard site: `https://bookglow-83fb3-dashboard.web.app`

## A) Booking Site Routes (`zenspa Frontend/index.tsx`)

| Route | Type | Behavior / Destination |
|---|---|---|
| `/book/:outletId` | Public | Customer booking page (`BookingPage`). |
| `/book/:outletId/auth` | Public | Customer register/login page (`BookingAuth`). |
| `/signup` | Public | Signup page (`SignUp`). |
| `/login` | Redirect | Redirects to merchant login URL on dashboard site. |
| `/loginbackend` | Redirect | Redirects to `/login` (legacy compatibility). |
| `/admin/*` | Redirect | Redirects to `/login` (legacy compatibility). |
| `*` | Public | Marketing/landing app (`App`). |

### Legacy hash compatibility on booking site

- `/#/login` -> `/login`
- `/#/loginbackend` -> `/login`
- `/#/dashboard` -> `/login`

## B) Merchant Dashboard Site Routes (`zenspa backend/RootRoutes.tsx` + `zenspa backend/App.tsx`)

### Root router

| Route | Auth | Behavior |
|---|---|---|
| `/book/:id` | Public | Public booking page in dashboard app (`PublicBookingPage`). |
| `/` | Public | Redirects to `/login`. |
| `/login` | Public/Auth-aware | Shows `Login` if logged out; redirects to `/dashboard` if logged in. |
| `*` | Protected app shell | Loads `App` (contains dashboard feature routes). |

### In-app routes handled by `App.tsx`

| Route | Purpose |
|---|---|
| `/dashboard` | Dashboard tab/home. |
| `/pos` | POS tab. |
| `/appointments` | Appointments calendar tab. |
| `/member` | CRM/member tab. |
| `/menu` | Services/menu tab. |
| `/sales-reports` | Sales reports tab. |
| `/transactions` | Transactions tab. |
| `/finance` | Finance tab. |
| `/staff` | Staff tab. |
| `/settings` | Settings tab. |
| `/settings/integrations` | External integrations page. |
| `/member-details/:id` | Member details page. |
| `/` (inside app) | Redirects to `/dashboard`. |
| `*` (inside app) | Falls back to tab rendering based on first path segment. |

## C) Notes

- Legacy frontend admin pages were removed from `zenspa Frontend/apps/admin`.
- Merchant entry on booking domain is intentionally a redirect to dashboard domain login.
- If you change merchant login URL, update `MERCHANT_LOGIN_URL` in `zenspa Frontend/index.tsx`.
