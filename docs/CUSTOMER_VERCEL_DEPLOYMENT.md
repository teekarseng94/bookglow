# Customer frontend deployment and Google signup

## Confirmed cause

The root npm workspace list contains only `packages/*`. A root install does not install either app's dependencies. The default root build invokes the merchant build first, whose Vite configuration imports its app-local `@vitejs/plugin-react`. Running that build after only a root install explains the reported missing package. Installing the plugin at the root would mask the incomplete app install.

The customer deployment now installs the root workspaces and the selected frontend app from their existing lockfiles, explicitly including devDependencies. Root `scripts/vercel-frontend.mjs` builds the customer site unless `VERCEL_PROJECT_NAME` is `bookglow-merchant` (or `BOOKGLOW_VERCEL_APP=merchant`). Shared packages export TypeScript source directly; Vite compiles it, so there is no separate shared-package build.

## Exact Vercel settings

Apply to the customer Vercel project, using the repository-root `vercel.json`:

| Setting | Value |
| --- | --- |
| Root Directory | `.` (repository root; leave the dashboard field empty) |
| Framework Preset | Vite |
| Install Command | `node scripts/vercel-frontend.mjs install` (customer project installs `apps/customer-site`; merchant project `bookglow-merchant` installs `apps/merchant-portal`) |
| Build Command | `node scripts/vercel-frontend.mjs build` |
| Output Directory | `dist-vercel` |
| Node.js version | 22.x |
| Include source files outside Root Directory | Not needed; both apps and shared packages are inside the repository root |

Remove conflicting dashboard command overrides. Root `engines.node` and `.nvmrc` select Node 22. Verification used 22.18.0, compatible with the locked Vite/plugin/React Router versions. The Node 24/superstatic warning is separate from the missing-plugin failure. Dependencies were not upgraded.

Filesystem routing runs first. Customer routes (`/`, `/signup`, `/login`, `/loginbackend`, `/admin/*`, `/book/:bookingPath`, `/book/:bookingPath/auth`, `/auth/callback/customer`) serve `index.html`. Additional SPA fallbacks cover merchant routes when this file is used by `bookglow-merchant`. Real JS/CSS/images retain their content types; missing `/assets/*` paths return 404 instead of HTML. Configuration reference: https://vercel.com/docs/project-configuration

## Vercel environment values

Root `vercel.json` now ships the customer build-time public env block (`VITE_SUPABASE_URL`, publishable key, `VITE_AUTH_GOOGLE_ENABLED=true`, providers, customer site URL, and customer callback). Set `VITE_MERCHANT_PORTAL_URL` to the merchant Vercel origin after that project exists, then redeploy the customer app. Dashboard env values still win when set for the same key.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://uecphpjymbgtttrizhgy.supabase.co` (current repository project) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | That project's public publishable key from Supabase; never a secret/service-role key |
| `VITE_SUPABASE_ANON_KEY` | Optional legacy alternative only if no publishable key is supplied |
| `VITE_AUTH_GOOGLE_ENABLED` | `true` after completing provider setup below |
| `VITE_AUTH_FACEBOOK_ENABLED` | `false` unless Facebook is separately configured |
| `VITE_MERCHANT_PORTAL_URL` | Merchant Vercel production origin, with no trailing slash (for example `https://bookglow-merchant.vercel.app`). Never a Firebase Hosting `web.app` URL. |
| `VITE_CUSTOMER_SITE_URL` | `https://bookglow.vercel.app` for merchant booking-link generation |
| `VITE_CUSTOMER_AUTH_CALLBACK_URL` | `https://bookglow.vercel.app/auth/callback/customer` for existing customer booking OAuth |
| `VITE_DATA_PROVIDER` | `supabase` |
| `VITE_AUTH_PROVIDER` | `supabase` |

`VITE_AUTH_GOOGLE_ENABLED` is the canonical flag used by `.env.example` and booking authentication. Merchant authentication also accepts the old `VITE_GOOGLE_AUTH_ENABLED` as a fallback; an explicit canonical value takes precedence. The same compatibility applies to Facebook. The existing local `.env` has the legacy Google flag set to false and was not silently enabled.

Merchant Google and email confirmation always return to `${window.location.origin}/signup`; they do not use `VITE_CUSTOMER_AUTH_CALLBACK_URL`. The shared browser client retains its existing automatic URL session detection and implicit OAuth flow. No manual PKCE exchange was added to merchant signup.

`GEMINI_API_KEY` is unrelated to authentication and is not required for this fix. The existing Vite configuration embeds it in frontend output if set; do not supply a private API credential to this deployment. Google OAuth client secrets and Supabase secret/service-role keys belong only in server/provider settings, never frontend variables.

## Required dashboard setup

The public Auth settings endpoint was rechecked on 2026-09-12: **Google is still disabled; email is enabled**. Enabling Google requires Google Cloud credentials in the Bookglow Supabase dashboard (project `uecphpjymbgtttrizhgy`).

1. In Google Cloud / Google Auth Platform, configure consent branding/audience, with `openid`, email and profile scopes. Add test users if the app remains in testing.
2. Create a Web application OAuth client. Add `https://bookglow.vercel.app` (and local origins you use) under authorized JavaScript origins.
3. Register `https://uecphpjymbgtttrizhgy.supabase.co/auth/v1/callback` as the Google authorized redirect URI. If Supabase uses a custom auth domain, copy the exact callback shown in its Google provider page instead.
4. In this Supabase project's Authentication → Sign In / Providers → Google, enter the Google client ID and client secret and enable Google. Do not put either secret into Vercel frontend variables.
5. In Authentication → URL Configuration, set Site URL to `https://bookglow.vercel.app`. Allow `https://bookglow.vercel.app/signup` and `https://bookglow.vercel.app/auth/callback/customer`. Preserve any existing merchant callback allowlist entries.
6. Retain development redirects `http://localhost:3000/signup`, `http://localhost:5174/signup`, and `http://localhost:5174/auth/callback/customer`; add other exact localhost callback origins only when used. Avoid broadly allowing untrusted preview domains.
7. Redeploy the customer app so `vercel.json` env and the signup Google button ship together. Complete a real Google consent flow. Verify `/signup` restores the session, new merchants enter onboarding, drafts resume, and returning workspace members reach merchant login. Test cancellation, refresh, email confirmation and resume setup with dedicated test accounts.

Official setup and flow reference: https://supabase.com/docs/guides/auth/social-login/auth-google

## Implementation files

- `vercel.json`, `.nvmrc`, root `package.json` and `package-lock.json`: customer deployment and Node selection.
- `apps/customer-site/services/merchantAuthService.ts`: compatible flags, session errors and OAuth cancellation messages.
- `apps/customer-site/apps/booking/SignUp.tsx` and `SignUp.css`: local Google logo, full-width 48px action, duplicate-click protection, loading/errors, smaller sans-serif heading and responsive spacing.
- `apps/customer-site/services/merchantOnboardingService.ts` and `apps/merchant-onboarding/MerchantOnboardingWizard.tsx`: detect existing workspaces before creation; retain user-scoped provisioning request IDs for retries. Existing server-side ownership lock and duplicate-owner guard remain intact.
- `apps/customer-site/App.tsx`, `components/BrandLogo.tsx`, `public/brands/*`: bundled brand assets, readable fallback, responsive grid, explicit preview status.
- `apps/customer-site/src/merchant-onboarding/merchantAuthService.test.ts`, `SignUp.test.tsx`, `merchantOnboardingService.test.ts`: OAuth, email, session and retry regressions.

## Verification

- Clean temporary checkout created from Git plus current working files, with no copied node_modules. Exact Vercel install commands and `npm run build:customer` passed on Node 22.18.0. Final source changes were rebuilt there successfully.
- Customer typecheck passed; all **65 tests across 7 files** passed, including existing booking tests, email confirmation, OAuth error/loading/session handling, and per-user provisioning retries.
- Headless Chrome inspected the production bundle at 320, 375, 768 and 1440px: no horizontal overflow on signup or integrations; Google asset loaded; signup button height 48px; sans-serif heading; header top at 0. Mobile and desktop screenshots were inspected.
- Local HTTP checks using the checked-in Vercel route rules: `/`, `/signup`, `/book/test-shop`, `/book/test-shop/auth`, `/auth/callback/customer` returned 200 on navigation and refresh. This checks routing, not the existence of a real test-shop booking record, and does not replace a deployed Vercel smoke test.
- All 9 bundled images returned 200 with image MIME types; no broken images in the integration view at any requested width; a missing JS asset returned 404.
- Real browser OAuth cancellation return displayed the expected error. Real Google login, email delivery and live database provisioning remain unverified because Google is disabled and dashboard/test-account access is unavailable. Mock tests do not constitute end-to-end OAuth verification.
- npm reported existing dependency audit findings and Vite warned about the existing large JS chunk. No unrelated upgrades or bundle refactors were made.

The Vercel configuration is implemented and locally verified; a live Vercel redeployment and the Google provider setup remain external steps.
