# Unify public site and Merchant Portal on bookglow.my

**Updated:** 21 September 2026  
**Deployed:** No (code ready; requires Vercel env + Supabase redirect allowlist + redeploy)

The browser should show `https://bookglow.my/...` for marketing, booking, merchant login, and the dashboard. Merchants must not be sent to `*.vercel.app`.

## Architecture

Two Vercel projects stay independent:

| Project | Serves |
|---|---|
| `bookglow` | `/`, `/signup`, `/book/...`, `/privacy`, customer OAuth |
| `bookglow-merchant` | `/login`, `/dashboard`, `/pos`, `/schedule`, `/finance`, `/settings`, … |

`bookglow.my` is attached only to `bookglow`. That project **reverse-proxies** merchant paths to `https://bookglow-merchant.vercel.app/...` while the address bar stays on `bookglow.my`. Both Vercel projects use the repository-root `vercel.json`, so the proxy is **host-gated** to `bookglow.my` / `www.bookglow.my`. The merchant hostname still serves its own SPA and rewrites `/merchant-assets/*` locally — it must not proxy to itself.

Merchant JS/CSS use the prefix `/merchant-assets/` so they do not collide with the public site’s `/assets/`. Do **not** 301 `bookglow-merchant.vercel.app` → `bookglow.my`; that hostname is the proxy origin and a redirect would loop.

`microfrontends.json` documents the same path split for a future Vercel Microfrontends group. Rewrites in root `vercel.json` are what take effect on the next `bookglow` deploy.

## Path split

Public: `/`, `/signup`, `/privacy`, `/account-deletion`, `/auth/callback/customer`, `/book/:path`

Merchant (same path names as today): `/login`, `/dashboard`, `/pos`, `/schedule`, `/finance`, `/settings`, `/staff`, `/member`, `/menu`, `/marketing`, `/integrations`, `/admin/...`, `/onboarding`, `/auth/callback/merchant`, and the other existing portal routes.

`/` stays the marketing homepage. Merchant’s internal `/` → `/login` only applies on the merchant deployment host, not on `bookglow.my`.

## Env (production)

Set on **both** Vercel projects (dashboard values override `vercel.json`):

```text
VITE_MERCHANT_PORTAL_URL=https://bookglow.my
VITE_MERCHANT_AUTH_CALLBACK_URL=https://bookglow.my/auth/callback/merchant
VITE_CUSTOMER_SITE_URL=https://bookglow.my
VITE_CUSTOMER_AUTH_CALLBACK_URL=https://bookglow.my/auth/callback/customer
```

Local `.env.example` still uses `http://localhost:5173` / `5174`.

## Supabase Auth → URL Configuration

Add:

- `https://bookglow.my/auth/callback/merchant`

Keep:

- Site URL `https://bookglow.my`
- `https://bookglow.my/signup`
- `https://bookglow.my/auth/callback/customer`
- `com.bookglow.merchant://auth/callback/merchant`
- The previous `…vercel.app/auth/callback/merchant` until old sessions expire

Google Cloud authorized JavaScript origin: `https://bookglow.my`.

## Cutover

1. Merge this change.
2. Update Vercel dashboard env if it still points at `*.vercel.app`.
3. Add the Supabase merchant callback on `bookglow.my`.
4. Redeploy **merchant first** (so `/merchant-assets/` HTML exists), then **bookglow**.
5. Check `https://bookglow.my/login` — hostname must stay `bookglow.my`.
6. Check `/dashboard`, `/pos`, hard refresh, Google merchant login, `/` and `/book/...`.
7. Point the `DASHBOARD_APP_URL` Edge Function secret at `https://bookglow.my` if billing checkout still uses the merchant Vercel hostname.

Optional: create a Vercel Microfrontends group (`bookglow` default, `bookglow-merchant` child) using `microfrontends.json`. Not required for the reverse-proxy cutover.
