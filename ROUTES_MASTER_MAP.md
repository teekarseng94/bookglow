# ZenFlow Routes Master Map

Canonical route reference for customer booking flow and merchant flow.

## Domains

- Public website + merchant portal: `https://bookglow.my`
- Merchant Vercel project `bookglow-merchant` is the origin behind merchant paths (not shown in the browser)

## 1) Booking Site (`apps/customer-site/index.tsx`)

| Route | Access | Component/Behavior |
|---|---|---|
| `/book/:outletId` | Public | `BookingPage` (customer booking UI). |
| `/book/:outletId/auth` | Public | `BookingAuth` (customer register/login). |
| `/signup` | Public | `SignUp`. |
| `/login` | Merchant (proxied) | Merchant Login SPA on the same domain. Local-only bridge to `:5173` when origins differ. |
| `/loginbackend` | Merchant (proxied) | Alias of `/login`. |
| `/admin/*` | Merchant (proxied) | Platform admin. |
| `*` | Public | `App` (landing/marketing). |

### Legacy hash URL mapping (booking site)

These hashes trigger a full navigation (not `history.replaceState`) so Vercel can proxy merchant paths.

| Legacy hash path | Current path |
|---|---|
| `/#/login` | `/login` |
| `/#/loginbackend` | `/login` |
| `/#/dashboard` | `/dashboard` |

## 2) Merchant Dashboard Site Root Router (`zenspa backend/RootRoutes.tsx`)

| Route | Access | Component/Behavior |
|---|---|---|
| `/book/:id` | Public | `PublicBookingPage`. |
| `/` | Public | Redirect to `/login`. |
| `/login` | Public/Auth-aware | `Login` if logged out; redirect to `/dashboard` if logged in. |
| `*` | Auth-gated app shell | Loads `App` (merchant app routes). |

## 3) Merchant App Routes (`zenspa backend/App.tsx`)

| Route | Purpose |
|---|---|
| `/dashboard` | Dashboard. |
| `/pos` | POS. |
| `/appointments` | Appointment calendar. |
| `/member` | CRM/member. |
| `/menu` | Services/menu. |
| `/sales-reports` | Sales reports. |
| `/transactions` | Transactions. |
| `/finance` | Finance. |
| `/staff` | Staff management. |
| `/settings` | Settings. |
| `/settings/integrations` | External integrations. |
| `/member-details/:id` | Member details. |
| `/` | Redirect to `/dashboard` (inside app). |
| `*` | Tab fallback render (based on first URL segment). |

## 4) Route Ownership Notes

- Customer routes are owned by `zenspa Frontend`.
- Merchant routes are owned by `zenspa backend`.
- Legacy frontend admin pages under `zenspa Frontend/apps/admin` were removed.
- `MERCHANT_LOGIN_URL` in `zenspa Frontend/index.tsx` controls where booking-domain `/login` redirects.
