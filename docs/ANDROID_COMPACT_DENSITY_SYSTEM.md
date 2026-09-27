# Android compact density system

Date: 2026-09-26  
App: BookGlow Merchant (`com.bookglow.merchant`)  
Runtime: `apps/merchant-portal/styles/density-system.css`  
Related: `docs/ANDROID_WEBVIEW_RESPONSIVE_PARITY.md`, `docs/BOOKGLOW_GLOBAL_RESPONSIVE_SYSTEM.md`

Chrome F12 mobile mode is a development aid. The Android Capacitor WebView is the acceptance target. This note records why the APK looked oversized versus F12, and the **global** density tokens that replace page-by-page shrinking.

This work does **not** use `zoom`, `transform: scale()` on the page, or WebView `textZoom = 100`. System font scaling stays enabled.

---

## 1. Why the APK looked oversized

The same CSS ran in F12 and in the APK. The APK still felt larger because several global choices stacked:

| Factor | Evidence |
| --- | --- |
| Comfortable “native app” tokens below 768px | `--mobile-text-page-title: 26px`, section `18px`, body `15px` |
| Oversized shell chrome | Header inner **56–60px**; bottom-nav inner **72px** (`4.4rem`) **plus** `safe-bottom` |
| Duplicated bottom padding | `.bookglow-main-scroll` already cleared the nav; `.m-page-with-bottom-nav` added **another** 72px + safe + 16px |
| Rem-based shell | `3.75rem` header / `4.4rem` nav grow with root font |
| Nested padding | Page 16 + card 16 + inner block 12–16 on a 360px CSS viewport |
| Native widgets | Android `<input type="time|date">` / `select` keep a large intrinsic chrome (see Operating Hours) |
| Smaller CSS viewport | Typical APK **360–412px** vs F12 Pixel 9 Pro **427px** — same 16px/48px controls consume more of the screen |
| Optional Android font / display scale | `text-size-adjust: auto` is left on. Not disabled. |

This is **not** a missing viewport tag. It is not solved by shrinking one page.

UI UX Pro Max (this pass): booking/appointment products stay Soft UI + operational density; touch targets stay 44px where the control is primary; compact chips/forms must keep accessible names; bottom tabs stay ≤5 items (already true); 4/8px spacing rhythm; safe-area is system chrome, not BookGlow nav height.

---

## 2. F12 vs APK measurements

Live APK CDP was not available from this session (`webContentsDebuggingEnabled` is off in release; debug APK can use `chrome://inspect` or `?bg-debug-viewport=1`).

**Chrome F12 (Pixel 9 Pro device mode, previous session)**

| Metric | Value |
| --- | --- |
| `window.innerWidth` | 427 |
| `window.innerHeight` | 952 |
| `devicePixelRatio` | 2.625 |
| `visualViewport.scale` | 1 |
| `html` font-size | 16px |
| `body` font-size | 15px (0.9375rem) before this change |

**Playwright harness after this change (Chromium, CSS px = viewport)**

| Width | `--density-mode` | Header inner | Nav inner | Input | Body |
| --- | --- | --- | --- | --- | --- |
| 320–427 | `compact` | 48px | 56px | 40px | 14px |
| 768 | `medium` | 52px | 60px | 44px | 14px |
| 1024–1440 | `comfortable` | desktop utility (no bottom nav) | — | 40px | 14px |

On a real phone, add `env(safe-area-inset-bottom)` **only** to the nav container padding. Do not add it again into `--bottom-nav-height`.

Opt-in APK readout: `?bg-debug-viewport=1` or `#bg-debug-viewport=1`.

---

## 3. Phone density tokens (compact, max-width 599.98px)

Defined in `styles/density-system.css`. `--mobile-*` aliases consume these.

| Token | Phone compact |
| --- | --- |
| `--font-page-title` | 20px |
| `--font-section-title` | 16px |
| `--font-body` | 14px |
| `--font-label` | 11px |
| `--font-caption` | 12px |
| `--control-height` | 40px |
| `--control-height-sm` | 36px |
| `--button-height` | 40px |
| `--page-padding-x` / `--page-pad-x` | 12px |
| `--page-padding-y` / `--page-pad-y` | 10px |
| `--card-padding` | 12px |
| `--section-gap` | 12px |
| `--row-gap` | 8px |
| `--shell-header-height` | **48px** (offset = height + `--safe-top`) |
| `--bottom-nav-height` | **56px** inner chrome only |
| `--icon-size` | 20px |
| `--icon-size-sm` | 16px |
| `--touch-min` | 44px (hit area, not visual padding) |

Nav labels: 11px. Header title: 15px. Avatar visual: 32px inside a 44px control. Hamburger: 44×44 hit, 20px icon.

---

## 4. Tablet density tokens (medium, 600–1023.98px)

Mobile header + bottom nav still show (`Layout` switches at 1024). POS catalogue tokens at ≥600px are restored to the previous tablet sizes so 768/820 POS is not phone-shrunk.

| Token | Tablet medium |
| --- | --- |
| `--font-page-title` | 22px |
| `--font-section-title` | 17px |
| `--font-body` | 14px |
| `--font-label` | 12px |
| `--control-height` / `--button-height` | 44px |
| `--page-pad-x` | 20px (24px from 900px) |
| `--card-padding` | 16px |
| `--shell-header-height` | 52px |
| `--bottom-nav-height` | 60px |
| `--icon-size` | 22px |

---

## 5. Desktop density tokens (comfortable, min-width 1024px)

| Token | Desktop |
| --- | --- |
| `--font-page-title` | 1.5rem (24px) |
| `--font-section-title` | 1rem |
| `--font-body` | 0.875rem (14px) |
| `--control-height` / `--button-height` | 40px |
| `--page-pad-x` | 32px |
| `--page-pad-y` | 1.75rem |
| `--card-padding` | 16px |
| `--section-gap` | 16px |
| Sidebar | unchanged at `lg` |

---

## 6. Typography rules

- `html` stays `font-size: 16px` with `text-size-adjust: auto`.
- Phone `body` is 14px / 1.4. Do not drop captions below 11px.
- Page titles on phone are 20px, not 26px marketing type.
- Enlarged Android/system/root font may wrap. That is allowed. Do not lock `textZoom`.

---

## 7. Control sizing

- Visual field/button height on phone: **40px** (`box-sizing: border-box`).
- Icon buttons and nav items keep a **44px** hit area.
- Native date/time inputs: `min-width: 0`; Operating Hours uses the compact BookGlow time face.
- Do not set a fixed height on wrapping textareas.

---

## 8. Header sizing

Shared `.bookglow-mobile-header` only. No page-specific heights.

Phone: 48px inner + `--safe-top` (usually 0 because `overlaysWebView: false`).  
Title 15px, outlet meta 12px, 8px horizontal padding.

---

## 9. Bottom-navigation sizing

`--bottom-nav-height` is **BookGlow chrome only**.

```
nav total ≈ --bottom-nav-height + --safe-bottom
```

Phone inner 56px (was 72px). Icons 20px, labels 11px, 2px gap. Active pill is 16×2px.

`.m-page-with-bottom-nav` no longer adds a second nav-height spacer. `.bookglow-main-scroll` already pads `nav + safe + 8px`. Sticky POS/cart pages still add `--mobile-sticky-footer-height`.

---

## 10. Card / padding rules

On phone, avoid stacking 16px at every nest:

| Layer | Phone |
| --- | --- |
| Content frame | 10×12 |
| Card | 12 |
| Settings inner block | 10×12 |
| Section gap | 12 |

Desktop spacing is unchanged.

---

## 11. Pages migrated

No business-layout redesign. Pages consume the tokens through shared shell + `--mobile-*` aliases:

Today, Schedule, POS, Menu & Inventory, Members, Member Details, Finance, Sales History, Staff, Settings, Integrations, Onboarding.

Page-specific CSS remains only where function requires it (POS catalogue, Schedule full-bleed, Operating Hours grid).

---

## 12. Screenshots

Harness (not a substitute for the APK):

- `apps/merchant-portal/test/visual/artifacts/density-{320,360,375,390,412,427,768,1024,1280,1440}.png`
- `apps/merchant-portal/test/visual/artifacts/density-375-font-24.png`

Real APK screenshots: capture on device after installing the debug APK below.

---

## 13. Automated tests

`test/visual/merchant-density.spec.ts` (layout-harness)

Widths: 320, 360, 375, 390, 412, 427, 768, 1024, 1280, 1440.

Asserts ranges (not exact pixels) for header inner, nav inner, button, input, card padding, body font, `--density-mode`. Enlarged root font at 375 must not overflow.

Also re-ran Operating Hours one-row tests.

| Check | Result |
| --- | --- |
| merchant-density.spec.ts | pass |
| Operating Hours bounding-box tests | pass |
| Settings stacked cards | pass |
| `tsc --noEmit` | pass |

---

## 14. TypeScript / build

- `npx tsc --noEmit -p tsconfig.json` — pass  
- `npm run cap:sync` + `assembleDebug` — see APK path below  

---

## 15. Remaining inconsistencies

- Some pages still use one-off Tailwind `h-11` / `min-h-[44px]` / `text-lg`. They are at least touch-legal; migrate to `--button-height` when those files are next touched.
- Android native `<select>` / date widgets can still paint larger than the compact face. Overlay presentation is used where layout-critical (hours).
- F12 still uses desktop Chrome glyphs; APK uses WebView/Roboto metrics. Density tokens align CSS px, not font rasterization.
- Very large Android font scale will wrap rows. That is intended.
- Debug APK is unsigned and **must not** be uploaded to Play.

## 16. Real-device parity verification

Date: 2026-09-26 (F12 baseline pass)

Chrome F12 mobile is the **visual target**. There is one BookGlow Mobile UI. Android does not get a separate oversized design.

### Build identity

| Surface | How to read |
| --- | --- |
| Localhost F12 | `http://127.0.0.1:5173/#/dashboard?bg-debug-build=1` (or `?bg-debug-viewport=1`) |
| Debug APK | Open Today, then add `#/dashboard?bg-debug-build=1` after login, or append the query to the hash |
| File on disk | `apps/merchant-portal/dist/bookglow-build.json` after Vite build |

Fingerprint fields: git commit SHA, ISO build timestamp, `density: v4`. Overlay is **opt-in only**.

### Capacitor / Vite chain

| Step | Path |
| --- | --- |
| Capacitor `webDir` | `dist` (`apps/merchant-portal/capacitor.config.ts`) |
| Vite output | `apps/merchant-portal/dist` |
| Copied Android assets | `apps/merchant-portal/android/app/src/main/assets/public` |
| Fresh debug APK | `npm run android:debug:fresh` from `apps/merchant-portal` |

`android:debug:fresh` deletes `dist` and `android/app/src/main/assets/public` (generated web assets only), then `npm run cap:sync` (Vite build + `npx cap sync android`), then `assembleDebug`. It does **not** delete signing keys or `keystore.properties`.

### Why icons differed (not a failed Lucide load)

Both platforms render **Lucide React SVG components**. There is no Android-only icon branch and no emoji substitution for Quick Actions.

| Action | Previous APK/source | F12 target (now shared) |
| --- | --- | --- |
| New Sale | `CreditCard` | `CreditCard` |
| Booking | `Calendar` | `Calendar` |
| Member | `Users` | `Users` |
| Expense | `Wallet` | `BarChart3` |

The APK 2×2 tiles were the **current source**: `grid-cols-2 sm:grid-cols-4` (`sm` = 640px) plus `min-h-14` / `min-height: 56px`. The F12 screenshot is 4-across compact. Phone Quick Actions are now `.m-quick-actions` 4 columns with 44px min-height in the shared density CSS.

### CSS cascade

`density-system.css` is imported **after** `index.css` (Tailwind included) via `src/loadStyles.ts`. That is the intended order so density chrome wins over Tailwind `min-h-14` / `text-app-page` on shared components.

`OnboardingShell.css` is a component stylesheet (can load after). Account Setup therefore **consumes density tokens** (`--font-page-title`, `--button-height` / `--touch-min`, `--page-padding-*`) instead of `clamp(1.5rem, 7vw, 2.35rem)` titles and `4rem` Continue.

### Fonts

Inter is bundled as `styles/fonts/inter-latin.woff2` (+ latin-ext). The Google Fonts CDN `<link>` was removed so the APK does not silently fall back to Roboto when offline.

### Cache / service workers

Merchant Portal has **no** service worker, Workbox, or PWA cache. Capacitor copies hashed Vite assets (`index-*.js`). A fresh `android:debug:fresh` rebuild cannot serve a previous JS bundle from those copies. WebView HTTP cache may retain CDN leftovers; bundled Inter avoids that for the UI font.

### Pages on the shared mobile system

Today, Schedule, POS, Menu & Inventory, Members, Member Details, Staff, Sales / History, Finance, Marketing, Settings, Integrations, Account Setup / Onboarding, Authentication. Workflows unchanged; chrome uses the same tokens.

### Unresolved native differences

- Status bar and Android system navigation sit **outside** the WebView (`overlaysWebView: false`). Do not count them as BookGlow UI.
- `env(safe-area-inset-bottom)` may still add a few pixels under the in-app tab bar on gesture devices.
- Android font/display scale remains enabled.
- Pixel-perfect screenshot match is not required; density and structure must match F12 at the same CSS width.

### Debug APK (2026-09-26 secondary-surface pass)

`D:\GitHub\bookglow\apps\merchant-portal\android\app\build\outputs\apk\debug\app-debug.apk`

```
BookGlow frontend
commit: c3df753
built: 2026-09-26T10:38:02.495Z
density: v4
```

`dist/bookglow-build.json` matches `android/app/src/main/assets/public/bookglow-build.json`. Inter woff2 files are inside `assets/public/assets/`. Do not upload this APK to Play.

---

## 17. Secondary surfaces / editors

Main pages were compacted first. Drawers, modals, sheets, and editors still looked oversized because **Tailwind `px-4 py-4 space-y-4 text-lg` on `ModalParts` loaded after `mobile-tokens.css`**, and inventory forms used `gap-6` / `space-y-6` / `min-h-[12rem]` / `p-4` cards.

Portals (`createPortal` → `document.body`) inherit density tokens from `:root`. Page-scoped selectors are not required. The fix is shared chrome CSS in `density-system.css` (loaded last), not per-dialog `!important`.

### Editor tokens (aliases of the existing density scale)

| Token | Phone compact | Role |
| --- | --- | --- |
| `--editor-title-size` | 16px (`--font-section-title`) | Drawer/modal title and editor heading |
| `--editor-tab-height` | 40px (44px tablet) | Overlay tab min-height |
| `--editor-content-padding` | `--page-padding-x` (12px) | Header/body/footer horizontal pad |
| `--editor-section-gap` | `--section-gap` (12px) | Body stack |
| `--editor-field-gap` | `--row-gap` (8px) | Field stack / `--form-gap` |
| `--editor-header-padding-y` | 8px | Header vertical pad |
| `--editor-footer-padding-y` | 8px | Footer vertical pad; **plus `--safe-bottom` once** |
| `--editor-textarea-min-height` | 6rem | Textarea only; inputs stay `--control-height` |
| `--modal-padding` / `--drawer-padding` / `--sheet-padding` | alias of `--editor-content-padding` | Do not invent a second padding scale |

### Tab rules

One component: `OverlayTabs` (`.m-overlay-tabs`). Phone: 40px min-height, `--font-body`, horizontal scroll if needed, no wrap. Tablet: 44px. Desktop: same component, container query can stretch underline tabs.

### Form rules

Inputs/selects in drawers and modals use `--control-height` (40px phone). Labels use `--font-label`. Nested option cards use `.m-editor-card` (`--card-padding`). Do not use `p-4` + `text-lg` + `min-h-[12rem]` for ordinary editor fields.

### Footer rules

`.m-modal-footer` padding is tokenized. Safe-area is added only on `padding-bottom`. Buttons use `--button-height`. Inventory, staff, schedule, finance, and member flows all share `ModalFooter`.

### Drawer / modal / sheet

`AppDrawer`, `AppModal`, `AppSheet` all compose `ModalHeader` / `ModalBody` / `ModalFooter`. Compacting those three files + density CSS migrates every overlay.

### Components migrated

InventoryEditPanel, OverlayTabs, ModalParts, AppDrawer/AppModal/AppSheet (via chrome), Services Add/Edit item form (consumes `.m-editor-*`), StaffDialogShell, ScheduleBookingDetailPanel, member/finance/marketing/settings overlays (chrome only).

### Justified exceptions

- Close `IconButton` stays 44×44 (`--touch-min`).
- Textareas stay taller than inputs (`--editor-textarea-min-height`).
- Media image preview `min-h-[8rem]` is content, not chrome.
- POS cart / sticky checkout keep `--mobile-sticky-footer-height`.

See `docs/MOBILE_SECONDARY_SURFACE_PARITY.md`.


