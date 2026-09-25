# Merchant mobile UX fix report

**Date:** 2026-09-25

## 1. Screens and routes reviewed

| Screen | Route / entry | Source of truth |
| --- | --- | --- |
| Account setup wizard | `/onboarding` (`MerchantOnboardingPage` → `MerchantOnboardingWizard`) | Latest `apps/customer-site/apps/merchant-onboarding/*` |
| Business location step | onboarding `physical-location` | Same |
| Category selection | onboarding `categories` | Same |
| Software selection | onboarding `software` | Same |
| Merchant Settings | `/settings` | `apps/merchant-portal/pages/Settings.tsx` |
| Sales History | `/transactions` | `apps/merchant-portal/pages/Transactions.tsx` |
| Mobile shell / bottom nav | `Layout` + `index.css` / `mobile-tokens.css` | Shared merchant portal shell |

`AGENTS.md` is not present in the repo. The old ZIP was not used.

## 2. Problems confirmed from the screenshots

- Account setup used a **fixed Continue bar** on a shell that only had `min-height: 100dvh`, so the inner grid never became a real scroller. Lists, maps, and category cards rendered **under** Continue.
- Continue was only `disabled={saving}`, so it stayed enabled with an empty required address.
- Settings used desktop-width tab labels (`OverlayTabs` expanding the page) and `lg` (1024px) as the mobile/desktop split, so 768–1023 still behaved like a squeezed desktop layout. Descriptions used `truncate`.
- Sales History put type chips and the date `<select>` on one row, clipping **Commission**.
- Page-level horizontal overflow was possible; bottom nav already had padding but pages could still overflow horizontally.

## 3. Files created and modified

### Created

- `apps/customer-site/apps/merchant-onboarding/components/OnboardingShell.css`
- `apps/customer-site/src/merchant-onboarding/MerchantOnboardingWizard.test.tsx`
- `apps/merchant-portal/components/settings/SettingsNavigation.test.tsx`
- `apps/merchant-portal/test/visual/merchant-mobile-ux-harness.html`
- `apps/merchant-portal/test/visual/merchant-mobile-ux-harness.tsx`
- `apps/merchant-portal/test/visual/merchant-mobile-ux.spec.ts`
- `docs/merchant-mobile-ux-fix-report.md` (this file)

### Modified (product)

- `apps/customer-site/apps/merchant-onboarding/components/OnboardingShell.tsx`
- `apps/customer-site/apps/merchant-onboarding/MerchantOnboardingWizard.tsx`
- `apps/customer-site/apps/merchant-onboarding/onboardingValidation.ts`
- `apps/customer-site/src/styles/utilities.css`
- `apps/merchant-portal/index.css`
- `apps/merchant-portal/index.html`
- `apps/merchant-portal/pages/Settings.tsx`
- `apps/merchant-portal/pages/Transactions.tsx`
- `apps/merchant-portal/components/settings/SettingsNavigation.tsx`
- `apps/merchant-portal/components/settings/SettingsSection.tsx`
- `apps/merchant-portal/components/settings/OperatingHoursRow.tsx`
- `apps/merchant-portal/components/ui/OverlayTabs.tsx`
- `apps/merchant-portal/components/ui/EmptyState.tsx`
- `apps/merchant-portal/styles/mobile-tokens.css`
- `apps/merchant-portal/styles/responsive-system.css`

### Modified (tests / tooling)

- `apps/customer-site/src/merchant-onboarding/onboardingValidation.test.ts`
- `apps/customer-site/vitest.config.ts`
- `apps/merchant-portal/components/ui/OverlayTabs.test.tsx`
- `apps/merchant-portal/components/ui/SharedMobilePrimitives.test.tsx`
- `apps/merchant-portal/components/reports/ReportFilterToolbar.test.tsx` (stale `lg:flex-wrap` assertion aligned with current `compact:` toolbar)
- `apps/merchant-portal/playwright.config.ts`

Business logic, database contracts, authentication, production config, and `versionCode` (still **10**) were not changed.

## 4. Account setup scrolling changes — implemented

Shared shell CSS now uses:

- `height: 100vh` / `100dvh` with `overflow: hidden` on the app shell
- Header + **scroll region with `min-height: 0`** + **in-flow footer** (`position: static`)
- Safe-area padding on header and footer (`env(safe-area-inset-*)`)
- One vertical scroller (`.merchant-onboarding__scroll`); no competing nested page scroller
- Duplicate `position: fixed` footer CSS removed from `merchant-portal/index.css` and `customer-site/utilities.css`
- Category grid: 1 column below 380px, 2 columns when cards have enough width
- Map/preview height: `min(14rem, 38dvh)` instead of a fixed 17rem desktop box
- Address textarea: bounded vertical resize (`min-height: 5.5rem`, `max-height: 10rem`)

## 5. Continue-button behavior changes — implemented

- `canContinueOnboarding` / `isOnboardingStepOptional` in `onboardingValidation.ts`
- Continue **disabled** until `validateStep` is null
- Inline hint (`role="status"`) when required data is missing
- Software step labelled optional; Continue remains enabled unless “Other” has no name
- Location Continue disabled until address length ≥ 4; map preview does not block Continue
- `saving` guard on Continue and Save and exit (no double-submit); button shows “Saving…”
- Footer is outside the scroller so the last list/card item can scroll above Continue

## 6. Settings mobile changes — implemented

Below 768px (`md`):

- Horizontal **tab strip** (`OverlayTabs` `width/max-width: 100%`, `overflow-x: auto`, selected tab scrolled into view)
- One settings panel at a time (`hidden` / `md:contents`); desktop still stacks all sections
- IntersectionObserver skipped on mobile (tabs, not jump links)
- Inputs `width/max-width: 100%`; descriptions wrap (`break-words`, no `truncate`)
- Operating-hours rows stack on very narrow widths; 44px switch hit target
- Booking/hours Save bar is in-flow on mobile (`max-md:static`) so it is not covered by bottom nav
- Advanced remains collapsed by default; other selected mobile sections open by default

Desktop ≥ 768px keeps the side nav and stacked sections.

## 7. Sales History mobile changes — implemented

- Search is full-width; filter button sits beside it, and stacks under the search field below 340px
- Date period moved into the existing filter **bottom sheet**
- Type chips (`All` / `Sales` / `Commission` / `Expense`) scroll **in their own row** (`overflow-x: auto`), never the page
- Compact empty state (`py-6` on small screens); **Go to POS** remains in the empty state
- Desktop toolbar/table unchanged (`hidden md:block`)

## 8. Mobile shell / safe-area changes — implemented

- `viewport-fit=cover` plus `interactive-widget=resizes-content`
- Android `windowSoftInputMode="adjustResize"` already set; left unchanged
- `.bookglow-page` / `.bookglow-content-frame`: `overflow-x: clip` on mobile
- `.bookglow-main-scroll`: `overflow-x: clip` + existing bottom padding for nav + `env(safe-area-inset-bottom)`
- Bottom nav labels remain `nowrap` + ellipsis
- Existing `--mobile-bottom-nav-height` page padding retained

## 9. Responsive viewport results

Playwright harness (`layout-harness`) checked:

| Viewport | Onboarding | Settings | Sales History |
| --- | --- | --- | --- |
| 320 × 568 | last option above Continue; no page overflow | tab strip usable | chips + empty state above nav |
| 360 × 800 | location Continue disabled until address; keyboard resize keeps Continue visible | tab strip usable | chips fully labelled |
| 390 × 844 | software list scrollable | tab strip usable | search + filter usable |
| 412 × 915 | software list scrollable | tab strip usable | chips + empty state above nav |
| 768 × 1024 | (desktop onboarding card frame in CSS) | side nav / no page overflow | desktop toolbar (not in mobile sales loop) |
| 1440 × 1000 | — | no page overflow | — |

All 6 Playwright tests passed. No page-level `scrollWidth > clientWidth + 1`.

## 10. Tests executed and exact results

| Suite | Result |
| --- | --- |
| Customer-site `npm test` (vitest) | **12 files, 78 passed** |
| Merchant-portal `npx vitest run` | **55 files, 189 passed** |
| Playwright `merchant-mobile-ux.spec.ts` (`layout-harness`) | **6 passed** |
| Merchant-portal `npm run typecheck` | **passed** |

Targeted coverage added:

- Onboarding scroller vs in-flow footer
- Continue disabled/enabled
- Physical address validation
- Category/software optional vs required
- Settings tab strip (`md:hidden` / `md:block`)
- Sales chips in their own overflow row (harness)
- Keyboard/viewport shrink keeps Continue on screen
- Safe-area / bottom-nav inset via harness empty-state vs `.bookglow-mobile-nav`

Authenticated Playwright projects (`mobile-workflows`, `dashboard-authenticated`) were **not** re-run in this pass. They still require `test/.auth/merchant.json` and a completed outlet.

## 11. Build results

| Step | Result |
| --- | --- |
| `npm run build` (merchant portal Vite production) | **passed** (9.53s) |
| `npx cap sync android` | **passed** (web assets copied to `android/app/src/main/assets/public`) |
| `gradlew assembleDebug` | **BUILD SUCCESSFUL** (52s) |
| `git diff --check` | **passed** (CRLF warnings only) |
| `versionCode` | **unchanged (10)** |
| Play / production deploy | **not performed** |

## 12. Screenshots or visual artifacts generated

Under `apps/merchant-portal/test/visual/artifacts/`:

- `onboarding-software-{320,360,390,412}.png`
- `settings-{320,360,390,412,768,1440}.png`
- `sales-{320,360,390,412}.png`

Harness screenshots confirm Continue in the layout flow, Commission fully visible, and bottom nav not covering the empty state.

## 13. Remaining limitations

- **Android emulator/device UI** was not re-opened after this web change. A debug APK was assembled locally; visual proof is Playwright Chromium/Edge emulation, not a live WebView session.
- Settings harness clicks “Operating hours”, so the tab strip **scrolls the selected tab into view**; the first tab can sit partially off-screen to the left. That is strip scrolling, not page overflow. Real Settings still shows only the active panel.
- Map preview still uses a Google Maps embed iframe; preview loading is optional and does not gate Continue.
- `VISUAL_MUTATION_TESTS` authenticated workflow tests were not executed.
- Keyboard-open behavior is approximated in Playwright by shrinking the viewport (360×480), not a real Android IME.

## 14. Confirmation that production was not mutated or deployed

- No `firebase deploy`, Vercel deploy, or Play Console upload
- No `versionCode` / versionName bump
- No database, auth, or production env changes

## 15. Status split

### Implemented

Account-setup shell + Continue validation; Settings mobile composition; Sales History mobile filters; shell overflow/safe-area; tests; production web build; Capacitor sync; Android debug APK.

### Verified locally

Typecheck, unit/component tests, Playwright mobile UX harness, Vite production build, `cap sync`, `assembleDebug`, `git diff --check`.

### Verified on Android emulator/device

**Not in this pass.** Do not treat the debug APK assemble as a device walkthrough.

### Requires staging/production verification

Install the debug APK (or `npx cap run android`) on a phone/emulator, sign in with email/password, and walk account setup, Settings tabs, and Sales History with the system nav bar and keyboard visible.
