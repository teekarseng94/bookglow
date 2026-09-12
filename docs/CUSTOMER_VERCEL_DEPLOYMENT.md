# Customer frontend deployment and Google signup

## Confirmed cause

The root npm workspace list contains only `packages/*`. A root install does not install either app's dependencies. The default root build invokes the merchant build first, whose Vite configuration imports its app-local `@vitejs/plugin-react`. Running that build after only a root install explains the reported missing package. Installing the plugin at the root would mask the incomplete app install.

The customer deployment now installs the root workspaces and the customer app from their existing lockfiles, explicitly including devDependencies. This makes the customer's `file:../../packages/*` links and their transitive dependencies available. Shared packages export TypeScript source directly; Vite compiles it, so there is no separate shared-package build. The combined build and merchant files are unchanged by this fix.

## Exact Vercel settings

Apply to the customer Vercel project, using the repository-root `vercel.json`:

| Setting | Value |
| --- | --- |
| Root Directory | `.` (repository root; leave the dashboard field empty) |
| Framework Preset | Vite |
| Install Command | `npm ci --include=dev && npm --prefix apps/customer-site ci --include=dev` |
| Build Command | `npm run build:customer` |
| Output Directory | `dist-booking` |
| Node.js version | 22.x |
| Include source files outside Root Directory | Not needed; both apps and shared packages are inside the repository root |

Remove conflicting dashboard command overrides. Root `engines.node` and `.nvmrc` select Node 22. Verification used 22.18.0, compatible with the locked Vite/plugin/React Router versions. The Node 24/superstatic warning is separate from the missing-plugin failure. Dependencies were not upgraded.

Filesystem routing runs first. The root, signup, booking, booking auth, existing customer auth callback and merchant redirect routes serve `index.html`. Real JS/CSS/images retain their content types; missing assets return 404 instead of HTML. Configuration reference: https://vercel.com/docs/project-configuration

## Vercel environment values

Set these for Production, and for any Preview environment explicitly authorized for OAuth. Redeploy after changing build-time variables.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://uecphpjymbgtttrizhgy.supabase.co` (current repository project) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | That project's public publishable key from Supabase; never a secret/service-role key |
| `VITE_SUPABASE_ANON_KEY` | Optional legacy alternative only if no publishable key is supplied |
| `VITE_AUTH_GOOGLE_ENABLED` | `true` after completing provider setup below |
| `VITE_AUTH_FACEBOOK_ENABLED` | `false` unless Facebook is separately configured |
| `VITE_MERCHANT_PORTAL_URL` | `https://bookglow-83fb3-dashboard.web.app` (current configured merchant origin) |
| `VITE_CUSTOMER_AUTH_CALLBACK_URL` | `https://<customer-production-domain>/auth/callback/customer` for existing customer booking OAuth |
| `VITE_DATA_PROVIDER` | `supabase` |
| `VITE_AUTH_PROVIDER` | `supabase` |

`VITE_AUTH_GOOGLE_ENABLED` is the canonical flag used by `.env.example` and booking authentication. Merchant authentication also accepts the old `VITE_GOOGLE_AUTH_ENABLED` as a fallback; an explicit canonical value takes precedence. The same compatibility applies to Facebook. The existing local `.env` has the legacy Google flag set to false and was not silently enabled.

Merchant Google and email confirmation always return to `${window.location.origin}/signup`; they do not use `VITE_CUSTOMER_AUTH_CALLBACK_URL`. The shared browser client retains its existing automatic URL session detection and implicit OAuth flow. No manual PKCE exchange was added to merchant signup.

`GEMINI_API_KEY` is unrelated to authentication and is not required for this fix. The existing Vite configuration embeds it in frontend output if set; do not supply a private API credential to this deployment. Google OAuth client secrets and Supabase secret/service-role keys belong only in server/provider settings, never frontend variables.

## Required dashboard setup

The public Auth settings endpoint was checked on 2026-09-12: **Google is disabled; email is enabled**. The connected Supabase account exposes a different project, so this project's provider settings could not be edited. No Vercel project/domain binding or authenticated Vercel deployment credentials are configured in this checkout.

1. In Google Cloud / Google Auth Platform, configure consent branding/audience, with `openid`, email and profile scopes. Add test users if the app remains in testing.
2. Create a Web application OAuth client. Add the exact production customer origin under authorized JavaScript origins.
3. Register `https://uecphpjymbgtttrizhgy.supabase.co/auth/v1/callback` as the Google authorized redirect URI. If Supabase uses a custom auth domain, copy the exact callback shown in its Google provider page instead.
4. In this Supabase project's Authentication → Sign In / Providers → Google, enter the Google client ID and client secret and enable Google. Do not put either secret into Vercel frontend variables.
5. In Authentication → URL Configuration, set Site URL to the exact customer production origin. Allow `https://<customer-production-domain>/signup` and the existing booking callback `https://<customer-production-domain>/auth/callback/customer`. Preserve any existing merchant callback allowlist entries.
6. Retain development redirects `http://localhost:3000/signup`, `http://localhost:5174/signup`, and `http://localhost:5174/auth/callback/customer`; add other exact localhost callback origins only when used. Avoid broadly allowing untrusted preview domains.
7. Set the Vercel variables above, redeploy, then complete a real Google consent flow. Verify `/signup` restores the session, new merchants enter onboarding, drafts resume, and returning workspace members reach merchant login. Test cancellation, refresh, email confirmation and resume setup with dedicated test accounts.

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
