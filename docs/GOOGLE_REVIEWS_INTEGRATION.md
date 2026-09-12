# Google Reviews integration (read-only)

Merchants connect their outlet's Google Business Profile location in
**Settings → Integrations → Google Reviews**. When enabled, the public booking
page shows Google's own rating, total review count and individual reviews with
pagination.

This integration is **display-only**. There is no "Write a review" button, no
review submission link, and no reply/moderation surface. BookGlow's own review
records in `outlets.reviews` are untouched and are never mixed with Google data.

---

## 1. Which Google API and why

| Need | API | Notes |
| --- | --- | --- |
| Browse **all** reviews with pagination | [`accounts.locations.reviews.list`](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list) (Business Profile API v4) | `pageSize` up to 50, `pageToken`, and `averageRating` / `totalReviewCount` for the whole collection |
| List the merchant's accounts | `mybusinessaccountmanagement.googleapis.com/v1/accounts` | |
| List locations per account | `mybusinessbusinessinformation.googleapis.com/v1/{account}/locations` | `readMask` is required |

The **Places API is deliberately not used**: Place Details returns at most five
reviews with no review pagination, so it cannot back "browse all reviews".
Nothing here scrapes Google Maps, and the existing Maps *embed* in the Address
section is only a map — it carries no review data.

`reviews.list` only works for a **verified** location that the authorizing
Google account manages.

### Sorting

Google supports exactly three orders, and each is applied by Google across the
entire collection: `updateTime desc`, `rating desc`, `rating`. These are exposed
as **Newest**, **Highest rated** and **Lowest rated**. Changing the sort restarts
pagination server-side — a loaded page is never re-sorted locally and presented
as globally sorted.

### Rating distribution

`reviews.list` does **not** return a per-star distribution, and the reference
screenshot's 5★→1★ bars cannot be derived accurately from one page. The
distribution is therefore **omitted** rather than estimated from a sample. If
Google later exposes distribution data, it can be added to the summary block in
`BookingGoogleReviews.tsx`.

### Known Google behaviour we compensate for

* Google [documents](https://developers.google.com/my-business/content/known-issues)
  that pages after the first can occasionally repeat or omit entries. Pages are
  merged with `appendUniqueReviews`, which drops ids already on screen.
* Translated reviews arrive inline in `comment` as
  `(Translated by Google) … (Original) …`, in either order. `parseReviewComment`
  splits them so the translation is attributed and the original wording stays
  available.

---

## 2. Google Cloud setup (external, one time)

### 2.1 Project approval — required before anything works

Business Profile APIs are **not public**. Until Google approves the project, the
quota is **0 requests/minute** and every call fails with `429`.

1. Manage a Google Business Profile that has been verified and active for 60+
   days, with a website listed on the profile.
2. In the Google Cloud console, note the **project number**.
3. Submit the [GBP API contact form](https://support.google.com/business/contact/api_default)
   choosing **Application for Basic API Access**, from an email address that is
   an owner/manager on that Business Profile and whose domain matches the
   website on the profile.
4. Approval is confirmed when the quota for
   `mybusinessaccountmanagement.googleapis.com` moves from 0 to 300 QPM
   (**IAM & Admin → Quotas**).

### 2.2 Enable the APIs

Enable all Business Profile APIs on the project, at minimum:

* `mybusinessaccountmanagement.googleapis.com`
* `mybusinessbusinessinformation.googleapis.com`
* `mybusiness.googleapis.com` (the v4 endpoint that serves reviews)

### 2.3 OAuth consent screen and scopes

* User type **External**, app published (or the merchant added as a test user
  while still in testing).
* Scopes: `https://www.googleapis.com/auth/business.manage`, plus `openid` and
  `userinfo.email` (only used to display which Google account authorized the
  connection).
* `business.manage` is a **sensitive** scope, so Google verification is required
  before non-test users can complete the flow.

### 2.4 OAuth client and redirect URIs

Create an **OAuth client ID → Web application**. Authorized redirect URIs point
at the Edge Function, never at the browser app:

| Environment | Redirect URI |
| --- | --- |
| Hosted Supabase | `https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/google-business/callback` |
| Local Supabase | `http://127.0.0.1:55431/functions/v1/google-business/callback` |

Because the redirect target is the Supabase function rather than the frontend,
this list does **not** change when the apps move between hosting providers, and
Vercel preview deployments need no extra redirect URIs.

### 2.5 Billing

Business Profile APIs have no per-call charge and need no billing account of
their own. Standard Google Cloud project requirements still apply; if the project
is shared with billable APIs (for example Maps), that billing account governs
those services only.

---

## 3. Backend configuration

All secrets are **Edge Function secrets**. Nothing below may appear in a `VITE_*`
variable, a frontend bundle, a log line, or a committed file.

| Secret | Purpose |
| --- | --- |
| `GOOGLE_BUSINESS_CLIENT_ID` | OAuth web client id |
| `GOOGLE_BUSINESS_CLIENT_SECRET` | OAuth web client secret |
| `GOOGLE_BUSINESS_REDIRECT_URI` | Must match §2.4 exactly |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | base64 of 32 random bytes; encrypts stored tokens (AES-GCM) |
| `MERCHANT_APP_URL` | Merchant portal origin the OAuth callback redirects back to |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform.

`MERCHANT_APP_URL` must be the **stable production origin of the merchant
portal**, since it is where the callback sends the merchant after Google
consent. The repo is moving to Vercel, where the customer site (`dist-booking`)
and the merchant portal (`dist-dashboard`) need separate projects — `vercel.json`
currently builds the customer site only. Use the merchant project's production
domain, for example `https://bookglow-dashboard.vercel.app`, not a preview URL,
because preview hostnames change per deployment. Local development uses
`http://localhost:5173`. If the value is missing or unparseable the callback
returns a plain-text notice instead of redirecting, so authorization is never
silently lost.

```bash
# 32-byte key
openssl rand -base64 32

supabase secrets set \
  GOOGLE_BUSINESS_CLIENT_ID="…apps.googleusercontent.com" \
  GOOGLE_BUSINESS_CLIENT_SECRET="…" \
  GOOGLE_BUSINESS_REDIRECT_URI="https://uecphpjymbgtttrizhgy.supabase.co/functions/v1/google-business/callback" \
  GOOGLE_TOKEN_ENCRYPTION_KEY="…" \
  MERCHANT_APP_URL="https://bookglow-dashboard.vercel.app" \
  --project-ref uecphpjymbgtttrizhgy

supabase functions deploy google-business --project-ref uecphpjymbgtttrizhgy
npx supabase --workdir migration db push
```

Until these are set, the Settings card reports **Setup required** and names the
missing keys; the booking page simply shows no Google section.

---

## 4. How it is wired

```
Merchant portal ─┐
                 ├─► supabase/functions/google-business  ─► Google Business Profile APIs
Booking page  ───┘        (verify_jwt = false, auth per action)
```

`verify_jwt` is false because the same function serves Google's browser redirect
and anonymous booking-page reads. Every merchant action goes through
`requireOutletAdmin`, which validates the Supabase JWT and then calls
`can_manage_outlet_integrations(outlet_id, user_id)`.

### Actions

| Action | Caller | Gate |
| --- | --- | --- |
| `status` | merchant | JWT + outlet admin |
| `oauth_start` | merchant | JWT + outlet admin |
| `locations` | merchant | JWT + outlet admin |
| `select_location` | merchant | JWT + outlet admin, re-verified against Google |
| `refresh` | merchant | JWT + outlet admin, 6/min per outlet |
| `visibility` | merchant | JWT + outlet admin |
| `disconnect` | merchant | JWT + outlet admin |
| `GET /callback` | Google redirect | single-use state bound to user + outlet |
| `public_reviews` | anonymous | booking slug resolved server-side, 120/min per outlet |

### Tables (`20260912120000_google_business_reviews.sql`)

| Table | Contents |
| --- | --- |
| `google_business_connections` | outlet → Google account/location mapping, encrypted tokens, visibility toggle, cached aggregate, last error |
| `google_oauth_states` | single-use OAuth state bound to `user_id` + `outlet_id`, 10 minute expiry |
| `google_review_cursors` | server-issued opaque cursors bound to one outlet and sort order, 1 hour expiry |
| `google_review_page_cache` | short-lived review pages (15 min first page, 60 min deeper) |
| `google_api_rate_limits` | fixed-window counters |

All five have RLS enabled and **FORCE ROW LEVEL SECURITY** with no `anon` or
`authenticated` policies or grants. Only the service role (inside the Edge
Function) can read them, so tokens and private integration settings are
unreachable from any browser.

### Security properties

* Client secret and refresh token never leave the function; the refresh token is
  AES-GCM encrypted at rest.
* OAuth `state` is random, single-use (claimed with a conditional update), time
  limited, and bound to both the merchant user and the outlet. Outlet
  substitution is impossible because the outlet comes from the stored state row,
  and admin rights are re-checked at callback time.
* A pasted Maps URL is a merchant-side memo only (browser `localStorage`). It is
  never sent to the server and never treated as authorization.
* Locations are never auto-matched by name. `select_location` re-lists the
  account's locations from Google and rejects anything not present.
* Public callers send only the published booking slug and an opaque 64-hex
  cursor. `resolve_public_booking_outlet` maps the slug to an outlet server-side;
  cursors are validated against `(outlet_id, order_by)` before use, so a Google
  page token can never be supplied or replayed across outlets.
* Google requests have a 10s timeout and up to 3 bounded retries on 429/5xx.
* Review pages are cached briefly and deleted on disconnect, location change and
  by `google_business_purge_expired()`. Google reviews are **never** written into
  `outlets.reviews`.
* `disconnect` revokes the refresh token at Google, then deletes the connection,
  cursors, cached pages and any pending OAuth state.

---

## 5. Merchant experience

Settings → Integrations → **Google Reviews** —
*"Show your Google rating and customer reviews on your booking page."*

| State | Shown |
| --- | --- |
| Setup required | Which server keys are missing, pointing at this document |
| Not connected | Optional Google Maps listing URL memo + **Connect Google Business Profile** |
| Choose a location | List of managed locations with name and address, confirmation block, **Use this location** |
| Connected | Business name and address, status, Google rating and total count, last refresh, authorizing account, **Show Google reviews on booking page** toggle, **Refresh** / **Change location** / **Disconnect** |
| Reconnect required | **Reconnect Google** when authorization expires |

Only roles with the `settings.manage` capability (owner/admin) see the controls;
anyone else sees an explanatory line. The server enforces the same rule.

---

## 6. Booking page presentation

In the existing **Reviews** tab (`#reviews`), so tab navigation, the Address
section, the map and the appointment flow are unchanged:

* Header **Google reviews** plus the sort control.
* Summary: large rating, fractional stars, `N Google reviews`, the Google mark
  with "Reviews from Google" and a link to the listing. Values come from Google's
  `averageRating` / `totalReviewCount`, not from the loaded cards.
* Cards: reviewer name, avatar with initials fallback, stars, relative or
  absolute date, "From Google", review text, **Read more** past 280 characters,
  translation attribution with **Show original**. Rating-only reviews say so
  instead of inventing text. Text renders as React children, so review content is
  never interpreted as markup.
* 10 reviews initially, **Load more reviews** while a cursor exists.
* Mobile stacks summary and list and uses natural page scrolling; desktop uses a
  two-column list across the full booking-page width. All text uses
  `overflow-wrap: anywhere` so long names or comments cannot overflow at 320px.
* Loading shows a compact skeleton and never blocks services, staff selection or
  checkout — reviews load independently of the booking data.
* Zero reviews, a temporary Google failure and a disabled integration are three
  distinct states. On failure the page shows still-valid cached data or a short
  "temporarily unavailable" line; never fabricated reviews or a false "0 reviews".
* When the integration is off or disconnected, the Google block disappears and
  the outlet's existing BookGlow reviews render instead. The two sources are never
  combined.

---

## 7. Verification

```bash
npm --prefix apps/customer-site run test      # 56 passed
npm --prefix apps/merchant-portal run test    # 84 passed
npm --prefix apps/customer-site run typecheck # clean
npm run build                                 # both apps
```

Covered by tests: outlet scoping of every merchant action, setup-required
reporting, authorization-error surfacing, expired-authorization messaging,
disconnect, location listing and explicit selection, Google's aggregate totals,
cursor pagination with de-duplication, sort changes restarting server-side,
only server-supported sorts being offered, missing avatars, long comments,
rating-only reviews, translated reviews, disabled fallback, unavailable state,
and the booking page surviving a failed reviews request.

**The live Google connection has not been tested.** The Google Cloud project
approval, OAuth client and Edge Function secrets in §2–3 do not exist yet, so
the OAuth round trip, real location listing and real `reviews.list` responses are
unverified against Google. Everything up to that boundary is implemented and
tested against the documented response shapes.
