# Authenticated visual regression tests

These tests sign in to the merchant portal and compare the main pages at desktop
and mobile sizes. The saved browser session is local-only and ignored by Git.

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
Set `VISUAL_BASE_URL` when testing a deployed environment instead of the local
development server.

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
