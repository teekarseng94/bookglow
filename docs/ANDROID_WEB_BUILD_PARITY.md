# Android vs web build parity

Date: 2026-09-26  
App: BookGlow Merchant (`com.bookglow.merchant`)

This note is the build-identity companion to `docs/ANDROID_COMPACT_DENSITY_SYSTEM.md`. Chrome F12 mobile and the Android debug APK must run the **same Vite frontend**.

## Pipeline

```
apps/merchant-portal source
  → vite build  (output: dist/)
  → capacitor webDir = dist
  → npx cap sync android
  → android/app/src/main/assets/public
  → Gradle assembleDebug
  → android/app/build/outputs/apk/debug/app-debug.apk
```

| Config | Value |
| --- | --- |
| `capacitor.config.ts` `webDir` | `dist` |
| Vite `root` | `apps/merchant-portal` |
| Vite `base` (local / APK) | `/` |
| Copied web assets | `android/app/src/main/assets/public` |

## Fresh debug APK (required)

From `apps/merchant-portal`:

```
npm run android:debug:fresh
```

What it does:

1. Deletes `dist/` and `android/app/src/main/assets/public` (generated web assets only).
2. Sets `CAP_WEB_DEBUG=1` so `webContentsDebuggingEnabled` is on for `chrome://inspect`.
3. Runs `npm run cap:sync` (`vite build` + `npx cap sync android`).
4. Runs `gradlew assembleDebug`.
5. Prints `dist/bookglow-build.json` and the APK path.

Does **not** delete `keystore.properties`, `*.jks`, or source.

Do not use a previously copied `app-debug.apk` from Downloads; always install this output after a source change.

## Fingerprint

Vite injects `__BOOKGLOW_BUILD__` (`commit`, `built`, `density: v3`) and writes `dist/bookglow-build.json`.

Opt-in UI (not shown in production):

- `?bg-debug-build=1`
- `?bg-debug-viewport=1`
- same keys inside the HashRouter hash (`#/dashboard?bg-debug-build=1`)

Compare F12 vs APK overlays. Commits must match for that build.

## Stale-asset findings

The APK Today screenshot (2×2 Quick Actions, Wallet-style Expense, large “Good afternoon”) matched **this repo’s previous Today source**, not a mysterious second CSS file. F12 4-across compact Quick Actions + chart Expense was the **intended** mobile presentation (`sm:grid-cols-4` only started at 640px, so a 360–427px WebView never reached it).

Always rebuild with `android:debug:fresh` so `assets/public` cannot lag `dist`.

## Icons

Shared Lucide React components. Mapping is documented in the density doc. No Android replacement set. No core-UI emoji.

## Service workers

None in Merchant Portal. Vite content hashes bust bundled JS/CSS. Bundled Inter avoids Google Fonts cache misses in WebView.
