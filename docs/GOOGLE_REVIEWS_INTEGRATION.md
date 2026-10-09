# Google Reviews integration (read-only)

Merchants connect a public Google Business listing in **Integrations → Google
Reviews**. When enabled, the public booking page shows Google's own rating,
total review count, and available review samples.

This integration is **display-only**. There is no "Write a review" button, no
review submission link, and no reply/moderation surface. BookGlow's own review
records in `outlets.reviews` are untouched and are never mixed with Google data.

Selecting a Place ID connects a **public listing**. It does **not** verify that
the merchant owns or manages that Google Business Profile.

---

## 1. Providers

| Provider | Status | Use |
| --- | --- | --- |
| **Google Places API (New)** | **Default** | Text by name/address, save Place ID, show rating + `userRatingCount` + up to **five** sample reviews, link to Google Maps |
| **Google Business Profile API** | Preserved for later | OAuth + managed location + paginated `reviews.list` when Google approves the project |

### Why Places is the default

Google rejected BookGlow's Business Profile API access application for the Cloud
project. Places API (New) does not require that approval and is enough for the
standard booking-page use case.

Places limitations (by design):

* At most five individual reviews per Place Details response
* No review pagination / "Load more"
* Sample order is Google's; do not assume "newest five"
* Place IDs may be stored; review text/ratings must not be treated as a permanent store (short-lived cache only)

### Business Profile (future advanced)

When available again, GBP still supports:

* `accounts.locations.reviews.list` with pagination
* Sort orders: Newest / Highest / Lowest
* Verified managed-location selection via OAuth (`business.manage`)

The booking UI only offers pagination and sort when the active
`connection_provider` is `google_business_profile`.

---

## 2. Google Cloud setup (Places — required for default flow)

### 2.1 Enable Places API (New)

1. Open the Google Cloud project used for BookGlow.
2. Enable **Places API (New)** (`places.googleapis.com`).
3. Ensure a billing account is linked (Places is billable; pricing is field-mask based).

### 2.2 Create a server-only API key

1. **APIs & Services → Credentials → Create credentials → API key**.
2. Restrict the key to **Places API (New)** only.
3. Prefer application restrictions suitable for server use (IP allowlist if you have stable egress; otherwise keep the key secret-only and rotate if leaked).
4. Store the key only as the Supabase Edge Function secret `GOOGLE_PLACES_API_KEY`.

Never put this key in `VITE_*` variables, merchant/customer bundles, or git.

### 2.3 Business Profile OAuth (optional / future)

Keep the existing OAuth client and secrets for a future GBP advanced path. Do
**not** reuse the OAuth client secret as the Places API key. See historical
sections below for redirect URIs and GBP approval steps if Google later grants
access.

---

## 3. Backend configuration

All secrets are **Edge Function secrets**. Nothing below may appear in a `VITE_*`
variable, a frontend bundle, a log line, or a committed file.

| Secret | Required for | Purpose |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | **Default Places flow** | Server-side Places Text Search + Place Details |
| `GOOGLE_BUSINESS_CLIENT_ID` | GBP only | OAuth web client id |
| `GOOGLE_BUSINESS_CLIENT_SECRET` | GBP only | OAuth web client secret |
| `GOOGLE_BUSINESS_REDIRECT_URI` | GBP only | Must match the Edge Function callback URI |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | GBP only | AES-GCM key for stored refresh tokens |
| `MERCHANT_APP_URL` | GBP only | Merchant portal origin for OAuth return |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform.

```bash
# Places (default)
supabase secrets set \
  GOOGLE_PLACES_API_KEY="…" \
  --project-ref uecphpjymbgtttrizhgy

# Deploy function + migration
supabase functions deploy google-business --project-ref uecphpjymbgtttrizhgy
npx supabase --workdir migration db push --project-ref uecphpjymbgtttrizhgy
```

Until `GOOGLE_PLACES_API_KEY` is set, the Integrations card reports **Setup
required** and names the missing key. The booking page shows no Google section.

---

## 4. How it is wired

```
Merchant portal ─┐
                 ├─► supabase/functions/google-business
Booking page  ───┘        ├─ Places API (New)  [default]
                          └─ Business Profile APIs [preserved]
```

`verify_jwt` is false because the same function serves Google's OAuth redirect
(future GBP) and anonymous booking-page reads. Every merchant action goes through
`requireOutletAdmin` → `can_manage_outlet_integrations(outlet_id, user_id)`.

### Actions

| Action | Caller | Gate |
| --- | --- | --- |
| `status` | merchant | JWT + outlet admin |
| `places_search` | merchant | JWT + outlet admin, 30/min per outlet |
| `places_connect` | merchant | JWT + outlet admin, 12/min per outlet |
| `oauth_start` | merchant | JWT + outlet admin (GBP) |
| `locations` | merchant | JWT + outlet admin (GBP) |
| `select_location` | merchant | JWT + outlet admin (GBP) |
| `refresh` | merchant | JWT + outlet admin, 6/min per outlet |
| `visibility` | merchant | JWT + outlet admin |
| `disconnect` | merchant | JWT + outlet admin |
| `GET /callback` | Google redirect | GBP OAuth state |
| `public_reviews` | anonymous | booking slug resolved server-side, 120/min per outlet |

### Tables

Base schema: `20260912120000_google_business_reviews.sql`  
Place ID column: `20260912180000_google_business_place_id.sql`  
Provider column: `20261009190000_google_places_provider.sql`

| Column / table | Notes |
| --- | --- |
| `google_business_connections.connection_provider` | `google_places` or `google_business_profile` |
| `google_business_connections.google_place_id` | Stored Place ID (allowed by Google policy) |
| `google_review_page_cache` | Short-lived review payloads only — not a permanent Places content store |

RLS remains FORCE ENABLED with no browser grants; only the service role inside
the Edge Function can read connection rows.

### Security properties

* Places API key never leaves the function.
* GBP client secret / refresh tokens never leave the function (AES-GCM at rest).
* Locations / places are never auto-matched by name; the merchant must choose.
* Public callers send only the published booking slug (and opaque cursors for GBP).
* Google requests use a 10s timeout; Places and GBP paths map 401/403/429 clearly.
* `disconnect` clears the outlet's connection and cache only.

---

## 5. Merchant experience

**Integrations → Google Reviews**

| State | Shown |
| --- | --- |
| Setup required | Amber notice that `GOOGLE_PLACES_API_KEY` is missing; no Connect button |
| Not connected | About / Instructions + **Connect Google Reviews** → Places search dialog |
| Connected (Places) | Listing name/address, rating, review count, last checked, **View Google Listing** / **Sync Now** / **Change Business** / **Disconnect**, booking-page toggle |
| Pending location (GBP) | Existing managed-location selector (preserved) |
| Reconnect required (GBP) | Reconnect Business Profile |

Search dialog: **Find Your Business on Google**, debounced Text Search, prefilled
from outlet name (+ address when available). Empty queries are not sent.

---

## 6. Booking page presentation

In the existing **Reviews** tab (`#reviews`):

* Header **Google Reviews**
* Summary uses Google's aggregate rating and **`userRatingCount` / `totalReviewCount`**, never the number of loaded cards
* Up to five sample cards for Places (name, avatar, stars, text, date, "From Google", Read more)
* **View all reviews on Google** → `googleMapsUri` (Places has no Load more)
* GBP connections may still offer sort + Load more when a cursor exists
* When the integration is off, existing BookGlow reviews render unchanged

---

## 7. GBP OAuth redirect URIs (future)

| Environment | Redirect URI |
| --- | --- |
| Hosted Supabase | `https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/google-business/callback` |
| Local Supabase | `http://127.0.0.1:55431/functions/v1/google-business/callback` |

Do not confuse with `…/auth/v1/callback` (Supabase login).

---

## 8. Verification

```bash
npm --prefix apps/customer-site run test
npm --prefix apps/merchant-portal run test
npm --prefix apps/customer-site run typecheck
npm --prefix apps/merchant-portal run typecheck
npm run build
```

Automated tests cover Places search/connect transport, Connect opening the search
dialog (no OAuth), empty-query rejection, setup-required messaging, booking-page
aggregates vs sample count, max five Places reviews, View all on Google, Sync /
Disconnect, and BookGlow reviews fallback.

**Live Google Places calls are not marked passed until**
`GOOGLE_PLACES_API_KEY` is configured and a real search/connect is performed
(e.g. Bali Wellness or Sohokaki).
