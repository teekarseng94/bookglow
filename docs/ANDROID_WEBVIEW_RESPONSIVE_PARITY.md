# Android WebView vs Chrome F12 responsive parity

Date: 2026-09-25  
App: BookGlow Merchant (`com.bookglow.merchant`)  
Scope: Settings → Operating Hours, plus shared shell viewport / header / bottom-nav tokens.

Chrome DevTools device mode is a development aid. The Android Capacitor WebView is the source of truth. This note records why the two disagreed, and what was changed so components follow **usable CSS width** instead of a 380px viewport guess.

## 1. Actual APK CSS viewport

The physical APK could not be CDP-inspected from this session (`webContentsDebuggingEnabled` is off in release config; debug APK can be inspected via `chrome://inspect`).

Measured from the APK screenshot and Android layout:

| Signal | Evidence |
| --- | --- |
| Layout structure | Each day was `Day` / `Start–End` / `Toggle` / `OPEN` — the old `flex-col` (viewport &lt; 380px) **or** wrapped `flex-row` |
| Typical CSS width | 360–412px for this phone class (F12 Pixel 9 Pro was **427px**) |
| Safe-area | Status bar sits **above** the WebView (`StatusBar.overlaysWebView: false`). `env(safe-area-inset-top)` is often `0` in this configuration |
| System chrome | Android 3-button / gesture bar is **outside** the WebView, so the in-app bottom nav looks taller than F12 |

To capture live APK numbers, install the debug APK and open Settings with `?bg-debug-viewport=1` (or `#bg-debug-viewport=1`). That overlay is **opt-in only** and is not shown in normal production use.

## 2. F12 CSS viewport

From the attached Chrome DevTools toolbar (Pixel 9 Pro):

| Metric | Value |
| --- | --- |
| `window.innerWidth` | **427** |
| `window.innerHeight` | **952** |
| Device pixel ratio | **2.625** (Pixel 9 Pro device mode) |
| `env(safe-area-inset-*)` | **0** (Chrome device mode unless overlays are simulated) |
| `navigator.userAgent` | Desktop Chrome, not Android WebView |
| `(min-width: 380px)` | **true** |
| `(max-width: 479px)` | **true** |
| `(min-width: 640px)` / `sm` | **false** |
| `(pointer: coarse)` | emulated as coarse in device mode |

Playwright harness (Chromium, same CSS): 320 / 360 / 375 / 390 / 412 / 768. After the fix, Operating Hours stayed `display: grid` at all of those widths.

## 3. Device pixel ratios

| Environment | DPR |
| --- | --- |
| F12 Pixel 9 Pro | 2.625 |
| Typical Android WebView (xxhdpi / xxxhdpi) | 2.75–3.5 |
| Playwright layout-harness | 1 (CSS pixels still match the set viewport) |

DPR did **not** choose the stacked layout. CSS pixels and intrinsic widget size did.

## 4. Relevant media / container query results

**Before (broken):**

```text
.m-hours-row
  flex flex-col
  min-[380px]:flex-row min-[380px]:flex-wrap
  sm:flex-nowrap          /* 640px — never true on phones */

@media (max-width: 479px) {
  .m-hours-row { flex-wrap: nowrap !important; }
}
```

| Width | Old structure |
| --- | --- |
| F12 427px | `min-[380px]:flex-row` + `max-width: 479px` nowrap → **one row** |
| APK 360px | `flex-col` → **four-line stack** |
| APK 390–412px | `flex-row` + **wrap** (Android time inputs do not shrink) → **same stack** |

**After:**

```text
.m-hours-row  → CSS grid, container-type: inline-size
@container hours (min-width: 520px)  → full day name
@container hours (max-width: 299px)  → compact two-line, not four-line
```

Viewport `min-[380px]` is no longer involved.

## 5. Root cause

Two things stacked, neither of which Chrome F12 reproduces:

1. **Viewport-based flex, not component width.**  
   `flex-col` below 380px CSS width. F12 Pixel 9 Pro is 427px, so it never entered that branch. Many Android phones are 360px CSS, so they always did.

2. **Android `<input type="time">` has a large intrinsic minimum size.**  
   Chrome desktop time widgets honour `min-width: 0`. Android WebView time widgets often do not. Combined with `flex-wrap`, a 390–412px APK **still wrapped** into:

   ```
   Day
   Start – End
   Toggle
   OPEN
   ```

   That is why “the same page” looked like two different products.

This is **not** a missing viewport meta tag, and it is **not** solved by another `@media (max-width: …)` override on Operating Hours.

## 6. Viewport / WebView configuration

| Check | Finding |
| --- | --- |
| `apps/merchant-portal/index.html` | Single tag: `width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content` |
| Duplicate viewport | None |
| `capacitor.config.ts` | `androidScheme: https`, `overlaysWebView: false`, `adjustMarginsForEdgeToEdge: auto` |
| `MainActivity.java` | Default `BridgeActivity` — no `setTextZoom`, no min font size, no viewport override |
| `activity_main.xml` | Full-size `WebView` |
| Accessibility | System font scaling is **left enabled**. Hours time inputs use `text-size-adjust: 100%` only so the native widget cannot inflate the row; `html` stays `text-size-adjust: auto` |

Do not set WebView `textZoom = 100` globally.

## 7. CSS / component changes

- `OperatingHoursRow` is a **container-query grid**: `Day | Start | End | Toggle | OPEN`.
- Time inputs are `minmax(0, 1fr)` with `min-width: 0; width: 100%; max-width: 100%`.
- Below **299px of row width**, a compact **two-line** arrangement (times on line 1, toggle + status on line 2). Not the four-line stack.
- Removed `min-[380px]:flex-row` / `flex-col` / the 479px `nowrap !important` font-shrinking hack (11px times).
- Shared shell token `--shell-header-offset` used for header height, main `padding-top`, `scroll-padding-top`, and `.m-settings-section` `scroll-margin-top`.
- Bottom nav inner `height: 72px` (which blocked font growth) replaced with `min-height` only. Safe-area padding stays on the shared `.bookglow-mobile-nav`.

## 8. Safe-area fixes

- Header offset is `calc(var(--shell-header-height) + var(--safe-top))` (56px on phone, 3.75rem on larger).
- Settings cards use `scroll-margin-top: calc(var(--shell-header-offset) + 8px)` so Operating Hours is not tucked under the sticky header after `scrollIntoView`.
- No per-device hardcoded offsets.

## 9. Pages regression-tested

| Surface | How |
| --- | --- |
| Settings / Operating Hours | New unit + Playwright tests at 320, 360, 375, 390, 412, 768 |
| Settings shell | Existing stacked-cards Playwright test |
| POS, Menu, Sales History, Onboarding | Existing `merchant-mobile-ux.spec.ts` harness |
| Enlarged type | Hours at 375×812 with `html { font-size: 24px }` |

Dashboard, Schedule, Members, and Finance share the same header/nav tokens; they were not given a one-off hours override.

## 10. Test results

- `OperatingHoursRow.test.tsx` — pass  
- Playwright `Operating hours stay compact by usable width…` — pass  
- Playwright `Operating hours remain usable with enlarged root font` — pass  
- `tsc --noEmit` — pass  

## 11. Before / after screenshots

| | Path |
| --- | --- |
| Before (F12, compact row) | User attachment — Chrome Pixel 9 Pro Settings Operating Hours |
| Before (APK, stacked days) | User attachment — physical Android Settings Operating Hours |
| After (harness, 320–768) | `apps/merchant-portal/test/visual/artifacts/settings-hours-{320,360,375,390,412,768}.png` |
| After (24px root font) | `apps/merchant-portal/test/visual/artifacts/settings-hours-375-font-24.png` |

## 12. Remaining Chrome vs Android WebView differences

These are expected and should **not** be “fixed” by emulating Chrome:

- Android draws a native time picker; Chrome paints a compact text field. Values still show start and end times in the same grid cells.
- `safe-area-inset-bottom` is 0 in F12 and non-zero on gesture/3-button devices. Shared bottom nav already pads with `--safe-bottom`.
- System **Display size** / **Font size** still enlarge type. Layouts must wrap to two lines, not clip. Do not lock `textZoom` to 100.
- F12 user agent is desktop Chrome; Capacitor is Android WebView. Never key layout off UA.

Opt-in APK readout: `…/index.html?bg-debug-viewport=1` after login, or append `#bg-debug-viewport=1`.

## 13. Second Android verification — one-row requirement

Physical APK check after the first container-grid fix still showed:

```
Sun     9:00 AM – 5:00 PM
        [toggle]      OPEN
```

That is a two-line day, not the required phone row:

```
Sun | 9:00 AM | 5:00 PM | Toggle | OPEN
```

### Why the previous fix still produced two rows

The first fix used a four-column grid (`day | times | toggle | status`) plus `@container hours (max-width: 299px)` two-line fallback. It did **not** replace Android’s native `<input type="time">`.

Measured CSS at 360px (normal Android phone, `box-sizing: border-box`):

| Box | Horizontal padding | Usable width |
| --- | --- | --- |
| Viewport | — | 360 |
| `.bookglow-content-frame` | 16px × 2 (`--mobile-page-padding-compact`) | **328** (`@container page`) |
| `.m-settings-section-body` (`px-4`) | 16px × 2 | 296 |
| Inner `.m-settings-block` | 12px × 2 | **~272–280** |

The hours container was therefore **below 299px**. The two-line fallback fired on a normal phone.

Android WebView time widgets also keep a large intrinsic minimum width. `min-width: 0` does not shrink them the way Chrome F12 does. Two native fields plus toggle plus OPEN cannot share ~280px.

Raising 299px to another guess would only hide the same overflow. The row had to get **more usable width** and a **compact time presentation**.

### Actual phone row budget (after this change)

| Viewport | Page container | Hours body pad | `.m-hours-row` target |
| --- | --- | --- | --- |
| 360 | 328 | 8px × 2 | ~312 |
| 375 | 343 | 8px × 2 | ~327 |
| 390 | 358 | 8px × 2 | ~342 |
| 412 | 380 | 8px × 2 | ~364 |
| 427 | 395 | 8px × 2 | ~379 |

Phone grid (px, not rem, so default Android font size stays one row):

```
28px | minmax(70px, 1fr) | 6px | minmax(70px, 1fr) | 44px | max-content
column-gap: 3px
```

Minimum track total ≈ 267px. 360–427 all have headroom. Native time chrome is no longer in flow.

### Component changes

- `HoursTimeField` paints `[9:00 AM ⌄]`. Stored value remains `HH:mm`. The native `input type="time"` is an overlay (`opacity: 0.01`) so picker, validation, save, and accessibility stay the same.
- Grid areas: `day start dash end toggle status`. Short weekday on phones (`Sun`…`Sat`).
- Nested inner `.m-settings-block` removed from Operating Hours. Phone body padding for `.m-hours-section` is 8px, not stacked 16+12.
- `@container hours (max-width: 299px)` **removed**. Two-line fallback exists only at `@container page (max-width: 247px)` (exceptional / a11y-constrained panes, not 360–427 phones).
- Compact field text uses 12px / 13px / 11px on the phone row so default Android rendering stays one line. System font scaling is not disabled globally.

### Automated bounding-box tests

Playwright `layout-harness` asserts 360 / 375 / 390 / 412 / 427 (plus 320 and 768):

1. Day, start, end, toggle, status share one grid row (`centerY` spread ≤ 8px).
2. Row height ≤ 56px (not a second line).
3. Row `scrollWidth` does not exceed `clientWidth`.
4. Page does not overflow.
5. `9:00 AM` / `5:00 PM` text is fully visible (`scrollWidth` ≤ `clientWidth`).
6. Header / bottom-nav overlap checks remain.

Enlarged root font (`html { font-size: 24px }` at 375) still must not overflow the page. If a truly tiny pane cannot fit, the 247px container fallback may stack start/end; normal phones must not use it.

### New debug APK

Path (unsigned debug, not for Play):

`apps/merchant-portal/android/app/build/outputs/apk/debug/app-debug.apk`

Do not upload this build to Play. Do not treat Chrome F12 as acceptance.
