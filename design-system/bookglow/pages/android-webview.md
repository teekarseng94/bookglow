# Android merchant WebView

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/bookglow/MASTER.md`).
> Also read `pages/merchant-portal.md`.

**App ID:** `com.bookglow.merchant`  
**Config:** `apps/merchant-portal/capacitor.config.ts`  
**Runtime:** `apps/merchant-portal/src/native/androidShell.ts`

## System chrome (keep)

| Setting | Value | Reason |
|---------|-------|--------|
| `StatusBar.style` | `LIGHT` (dark icons) | White bar, light app surfaces |
| `StatusBar.backgroundColor` | `#ffffff` | Matches mobile header |
| `overlaysWebView` | `false` | Content does not draw under the status bar |
| `adjustMarginsForEdgeToEdge` | `auto` | Android 15+ system bars |
| Splash | `#ffffff` | Same as status bar |
| Viewport | `viewport-fit=cover` | Safe-area env() works |

Do not switch the status bar to overlay mode without updating every sticky header.

## Safe areas

Tokens already exist: `--safe-top/right/bottom/left` and `--mobile-safe-area-*`.

Required:

- Mobile header: `padding-top: var(--safe-top)` (`.bookglow-mobile-safe-area-top`)
- Bottom nav: `padding-bottom: var(--safe-bottom)`
- FABs and sticky carts: sit **above** nav height + safe-area
- Modals/sheets: overlay padding uses `max(12px, env(safe-area-inset-*))`
- Scroll containers: `overscroll-behavior: contain` to avoid Chrome glow fighting the WebView

Visual tests: `test/visual/safe-area.spec.ts` and `finance.spec.ts` — treat them as the regression gate when UI is later applied.

## Touch and density

- Hit targets ≥ 44px (`--touch-min`) for icon buttons and nav items
- Compact **visual** fields may be 40px high; expand the hit area rather than inflating padding
- Adjacent controls ≥ 8px apart
- Bottom nav labels 11px on phone (token `--mobile-text-nav`); inner bar `--bottom-nav-height` 56px
- Hardware back: existing `androidShell` history handler — do not replace with a custom in-app back stack
- Full density rules: `docs/ANDROID_COMPACT_DENSITY_SYSTEM.md`

## Motion and performance

- Subtle CSS only; no GSAP
- Avoid `backdrop-filter` on large scrolling regions inside the WebView if it janks; the mobile nav already drops blur below 768px — keep that
- Reduced motion: keep the global merchant rule

## Do not

- Use iOS-only `SafeAreaView` APIs
- Hide content behind the Android navigation bar
- Change OAuth custom-scheme handling while restyling
