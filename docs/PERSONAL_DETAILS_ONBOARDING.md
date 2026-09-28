# Personal Details onboarding

New BookGlow merchants complete personal identity before the existing professional / business setup. Returning merchants with a workspace are not sent back through this page.

## Existing flow (before this change)

| Path | Behaviour |
| --- | --- |
| Customer `/signup` | Email/password or Google/Facebook auth, then the account-setup wizard |
| Merchant `/login` | Sign-in only (no register). Google and email/password |
| After auth | `needsMerchantRegistration` / `no_workspace` / `registration_pending` → `/onboarding` |
| Completed workspace | `hasMerchantWorkspace` / `outlet_id` present → Dashboard |
| Wizard start | First step was **account-type** (“How would you like to set up your professional account?”) |
| Persistence | `merchant_onboarding_drafts` JSON payload + `current_step` |
| Completion | RPC `create_merchant_workspace` creates the outlet; onboarding is **not** marked complete by identity alone |

Login persists the Supabase session as before. This change does not alter authentication.

## New sequence

```
AUTHENTICATION
    ↓
PERSONAL DETAILS   ← new first wizard step
    ↓
EXISTING ACCOUNT / BUSINESS SETUP  (account-type → identity → categories → location → team → software)
    ↓
OUTLET CREATION (`create_merchant_workspace`)
    ↓
MERCHANT DASHBOARD
```

Resume rule: if `personalDetailsCompleted` is false or identity validation fails, the wizard always reopens on Personal Details, even if a later `current_step` was saved.

Existing merchants (`hasMerchantWorkspace() === true`, or `/onboarding` gate `state === 'active'` with an outlet) go to Dashboard and never see this page.

## Data model

No production migration. Existing columns are reused.

| Storage | Fields |
| --- | --- |
| `profiles` (auth user id) | `full_name` (first + optional last), `phone` (E.164) |
| `merchant_onboarding_drafts.payload` | `firstName`, `lastName`, `phoneNational`, `phoneE164`, `country`, `legalAccepted`, `personalDetailsCompleted` |
| Workspace RPC | `create_merchant_workspace(..., p_phone)` receives `phoneE164` |

`profiles` has no separate first/last columns. Last name is optional (BookGlow already stored a single `full_name`). Personal data is **not** written onto the outlet row except the existing optional `p_phone` argument at workspace creation.

## Phone validation

- Default calling code **+60** (Malaysia). The compact selector is present but disabled until other countries are supported.
- National input accepts local forms such as `12 382 9709`, `0123829709`, or `+60 12 382 9709`.
- Stored value is E.164, e.g. `+60123829709`.
- Valid Malaysian mobiles: 9–10 national digits starting with `1` (`/^1\d{8,9}$/`).
- Empty, whitespace-only, country-code-only, and incomplete numbers show: **Please enter a valid mobile number.**
- Continue stays clickable on this step. Invalid submit stays on the page, shows inline `role="alert"` errors, and focuses the first invalid field.

Helpers live in `apps/customer-site/apps/merchant-onboarding/personalDetails.ts`. No extra phone library.

## Google flow

1. Continue with Google (customer `/signup` or merchant `/login`).
2. Access resolver sends a new user to `/onboarding` (or the wizard mounts on `/signup` if the session is already present).
3. Personal Details prefills `given_name` / `family_name` (or splits `full_name` / `name`) and any existing `profiles.phone`.
4. Phone is still required. Password is **omitted** (Google already authenticated the user).
5. Continue saves `profiles` + draft, then existing business setup.

Returning Google merchants with a workspace reach Dashboard as before.

## Email / password flow

Password is collected on `/signup` (`minLength` 8, confirm password). After the account exists, Personal Details CTA is **Continue**, not “Create account”. Password is not shown again and is never stored on `profiles`.

## Privacy / terms

- Real route: `/privacy` (`publicPrivacyPolicyUrl()` from the merchant portal, `/privacy` on the customer origin).
- Footer **Terms of Service** on the marketing site is currently `href="#"` (placeholder, not a page).
- **Terms of Business** does not exist.
- Consent copy therefore links only to the Privacy Policy and must be checked (not pre-checked).

## UI / UX Pro Max findings applied

Searched `ux` domain: mobile identity forms, phone country-code input, error summary, sticky-footer focus, compact form width, labels/autocomplete.

Applied:

- Visible labels with `htmlFor` (not placeholder-only)
- `inputMode="tel"`, `autocomplete` given-name / family-name / tel-national / country-name
- Inline errors plus footer `role="alert"`; focus the first invalid control (not blur-spam)
- Sticky footer offset via `scroll-padding-bottom` so focused fields are not fully covered
- Form column `max-width: 26rem` centered; mobile full-width with page padding
- Submit shows Saving… on the CTA
- Back control labelled; country Edit disabled with an accessible explanation
- Compact tokens only (`--font-page-title`, `--font-label`, `--control-height`, `--touch-min`, shared safe-area vars). No onboarding-specific oversized type scale.

## Tests

Vitest (customer-site `src/merchant-onboarding`):

1. New merchant lands on Finish signing up
2. Workspace already exists → loading / portal handoff, not the form
3. Empty / invalid phone cannot continue
4. Valid +60 number saves E.164 and advances to account-type
5. Google name prefill; no password field
6. Consent required
7. Unfinished identity resumes on Personal Details; completed identity resumes the saved business step

Playwright layout harness (`merchant-mobile-ux.spec.ts`):

- Personal Details at 360 / 375 / 390 / 412 / 427: one column, no horizontal overflow
- Shortened viewport (keyboard) keeps the phone field above the Continue bar

Screenshots: `apps/merchant-portal/test/visual/artifacts/onboarding-personal-{width}.png`

## Android APK

Generated with `npm run android:debug:fresh` in `apps/merchant-portal`.

Typical output: `apps/merchant-portal/android/app/build/outputs/apk/debug/app-debug.apk`

Built this run:

`D:\GitHub\bookglow\apps\merchant-portal\android\app\build\outputs\apk\debug\app-debug.apk`

## Deployment

Do **not** auto-deploy. Do **not** upload this APK to Play.

Customer (`bookglow`) and merchant (`bookglow-merchant`) both need the shared wizard files. Merchant Vercel does not automatically follow a customer-only Git connection.

No database migration to apply.

## Remaining issues

- Country Edit is disabled: BookGlow still targets Malaysia only. Calling-code list is a single-source `CALLING_CODES` array for later expansion. Changing country will need an explicit warning before rewriting an entered number.
- Terms of Service / Terms of Business pages do not exist; consent cannot legally name them as live links.
- Email signup’s Privacy Policy line on `/signup` is still a notice, not a checkbox; the required checkbox is on Personal Details.
- In-progress merchants who saved a later draft **before** this release will be asked for Personal Details once, then returned to business setup. Completed outlets are unaffected.
