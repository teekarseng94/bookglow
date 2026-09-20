# Authenticated visual regression tests

These tests sign in to the merchant portal and compare the main pages at desktop
and mobile sizes. The saved browser session is local-only and ignored by Git.

## Completed merchant workspace (required)

`test/.auth/merchant.json` must belong to a **completed** merchant, not the
onboarding account-type picker (“How would you like to set up your professional
account?”).

The Auth user must already have:

1. A `public.users` row whose `uid` matches the Auth user id.
2. `public.users.outlet_id` set to an existing outlet.
3. That outlet’s `onboarding_status` = `complete`.

Do **not** finish onboarding, create a production outlet, or change real merchant
data to unblock these tests. Do **not** use production merchant passwords unless
the account is an explicitly authorized dedicated test workspace.

Regular merchant sessions are scoped to `users.outletId`. Do not add an
outlet-switching control to the Dashboard; platform remote access is separate.

### Local disposable workspace (this repo)

When `migration` local Supabase (`bookglow-local`, API `http://127.0.0.1:55431`)
is running, a completed fixture already exists:

- Email: `owner@example.test`
- Outlet: `outlet_local_authz_fixture` (“Local Authz Salon”)
- Identities are `@example.test` only

Passwords for local fixtures are not stored in Git. Reset the password through
the **local** Auth admin API (`127.0.0.1` only), then sign in through the real
login form. The merchant-portal `.env` may point at a cloud project; if port
5173 is already serving that cloud backend, start a separate Vite process with
local `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and set `VISUAL_BASE_URL`
to that origin.

Optional scoping assertions:

```powershell
$env:VISUAL_OUTLET_ID = 'outlet_local_authz_fixture'
$env:VISUAL_OUTLET_NAME = 'Local Authz Salon'
```

## First run

From `apps/merchant-portal` in PowerShell:

```powershell
$env:VISUAL_EMAIL = 'your-test-account@example.com'
$env:VISUAL_PASSWORD = 'your-test-password'
npm run test:visual:update
Remove-Item Env:VISUAL_EMAIL
Remove-Item Env:VISUAL_PASSWORD
```

Review the generated images in `test/visual/__screenshots__`, then commit only
the approved screenshots. Never commit `test/.auth/merchant.json`.

Authenticated Dashboard capture (desktop 1440 and mobile 390):

```powershell
npm run test:visual -- test/visual/dashboard-authenticated.spec.ts --project=desktop --project=mobile
```

Screenshots land in `test/visual/artifacts/dashboard-authenticated-*.png`.

## Later runs

```powershell
npm run test:visual
```

To refresh an expired login:

```powershell
$env:VISUAL_EMAIL = 'your-test-account@example.com'
$env:VISUAL_PASSWORD = 'your-test-password'
$env:VISUAL_REFRESH_AUTH = '1'
npm run test:visual
Remove-Item Env:VISUAL_EMAIL
Remove-Item Env:VISUAL_PASSWORD
Remove-Item Env:VISUAL_REFRESH_AUTH
```

Use a dedicated test merchant account with representative, non-sensitive data.
The account must already have a completed merchant workspace (not the onboarding
account-type picker). Set `VISUAL_BASE_URL` when testing a deployed environment
instead of the local development server.

A fresh login uses the Email and Password fields on `/login`. Auth setup fails
if that user is sent to `/onboarding`.

## Mobile workflow tests

The six 375px workflow tests create or update real records. Run them only
against a dedicated test outlet:

```powershell
$env:VISUAL_MUTATION_TESTS = '1'
npm run test:visual -- --project=mobile-workflows
Remove-Item Env:VISUAL_MUTATION_TESTS
```

The workflows cover creating a walk-in booking, completing a sale, adding a
member, editing a service, filtering reports, and saving outlet settings.
