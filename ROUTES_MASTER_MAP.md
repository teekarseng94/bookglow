# ZenFlow Routes Master Map

Canonical route reference for customer booking flow and merchant flow.

## Domains

- Booking + marketing: `https://bookglow-83fb3.web.app`
- Merchant dashboard: `https://bookglow-83fb3-dashboard.web.app`

## 1) Booking Site (`zenspa Frontend/index.tsx`)

| Route | Access | Component/Behavior |
|---|---|---|
| `/book/:outletId` | Public | `BookingPage` (customer booking UI). |
| `/book/:outletId/auth` | Public | `BookingAuth` (customer register/login). |
| `/signup` | Public | `SignUp`. |
| `/login` | Redirect | `MerchantRedirect` -> dashboard login URL. |
| `/loginbackend` | Redirect | `Navigate` -> `/login` (legacy alias). |
| `/admin/*` | Redirect | `Navigate` -> `/login` (legacy alias). |
| `*` | Public | `App` (landing/marketing). |

### Legacy hash URL mapping (booking site)

| Legacy hash path | Current path |
|---|---|
| `/#/login` | `/login` |
| `/#/loginbackend` | `/login` |
| `/#/dashboard` | `/login` |

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
