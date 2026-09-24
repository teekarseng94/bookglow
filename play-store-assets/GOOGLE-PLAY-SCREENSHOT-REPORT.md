# BOOKGLOW GOOGLE PLAY SCREENSHOTS

## Android architecture

Capacitor 7 Android WebView app (`apps/merchant-portal/android`).

- Package: `com.bookglow.merchant`
- App name: BookGlow Merchant
- versionName 1.0.8 / versionCode 10
- minSdk 23, compileSdk/targetSdk 36
- Web bundle is copied from `apps/merchant-portal/dist` into the APK (`npx cap sync android`)
- Production backend in this build: Supabase (`uecphpjymbgtttrizhgy.supabase.co`)
- Debug APK used for screenshots (release signing was not modified, nothing was published)

## 7-inch device

`BookGlow_7in` emulator  
Android 15 (API 35 Google Play tablet system image)  
WHPX acceleration, no device bezel (`skin.path=_no_skin`)

## 7-inch resolution

1080 × 1920 px, 213 dpi, portrait **9:16**  
CSS ≈ 811 × 1444 (mobile/tablet hybrid: bottom navigation, `md` schedule layout)

## 7-inch screenshots

Pipeline-validated login preview only:

- `D:\GitHub\bookglow\play-store-assets\previews\7in-login.png` (1080×1920, 24-bit PNG)

Store listing pages **not yet captured** (need a demo merchant session):

- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\01-dashboard.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\02-schedule.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\03-pos.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\04-members.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\05-sales-reports.png`

## 10-inch device

`BookGlow_10in` emulator  
Android 15 (API 35 Google Play tablet system image)  
Landscape chosen because it is clearly better for this merchant app (sidebar + POS `posd` layout at ≥1200px)

## 10-inch resolution

2560 × 1440 px, 280 dpi, landscape **16:9**  
CSS ≈ 1463 × 823 (desktop sidebar)

## 10-inch screenshots

Pipeline-validated login preview only:

- `D:\GitHub\bookglow\play-store-assets\previews\10in-login.png` (2560×1440, 24-bit PNG)

Store listing pages **not yet captured**:

- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\01-dashboard.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\02-schedule.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\03-pos.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\04-members.png`
- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\05-sales-reports.png`

## Phone screenshots

Not created. Optional AVD `BookGlow_phone` (1080×1920) is installed and documented in `README.md`.

## Responsive fixes made

None in app source. Inspection notes:

- Login at 7-inch (below 900px) uses the single-column form. No overflow.
- Login at 10-inch landscape uses the two-column marketing + form layout. Looks correct for a tablet listing. The decorative “Today’s appointments” preview sits close to the Android gesture bar (minor clip of the last row). Not changed, because login is not one of the five store pages.
- Authenticated pages: Dashboard / Members / Reports use `md`/`lg` grids; POS desktop split is `posd` (1200px); Schedule desktop staff board is `md` (768px) with internal horizontal scroll (`min-width` 720px). 7-inch portrait will show bottom nav. 10-inch landscape will show the sidebar. That is the real app, not a stretched phone UI.

Recommended pages if a screen is empty: **Menu & Inventory** (`/menu`) is a stronger visual than an empty Sales Reports day. Keep the five requested pages if the demo outlet has bookings, members, and at least one sale.

## Files changed

- `play-store-assets/README.md`
- `play-store-assets/SCREENSHOT-MANIFEST.md`
- `play-store-assets/GOOGLE-PLAY-SCREENSHOT-REPORT.md`
- `play-store-assets/install-avds.ps1`
- `play-store-assets/capture-play-screenshots.ps1`
- `play-store-assets/capture-webview.mjs`
- `play-store-assets/emulator/**` (AVD configs)
- `play-store-assets/previews/7in-login.png`
- `play-store-assets/previews/10in-login.png`

No merchant-portal UI files were modified. Release keystore was not touched.

## Screenshot folders

- `D:\GitHub\bookglow\play-store-assets\tablet-7-inch\`
- `D:\GitHub\bookglow\play-store-assets\tablet-10-inch\`
- `D:\GitHub\bookglow\play-store-assets\phone\`
- `D:\GitHub\bookglow\play-store-assets\previews\`

## Privacy check

**PASS for captured previews** (sign-in screen only, no merchant/customer data).

**Not passed for store listing shots yet.** There is no `BookGlow Demo` outlet in production. Existing outlets (Bali Wellness, Sohokaki, ZenFlow Spa, etc.) must not be used for Play screenshots. Do not upload Sohokaki visual-test images.

## Google Play asset readiness

**NEEDS MANUAL REVIEW**

The 7-inch and 10-inch emulator pipeline works (app installed, launched, native 9:16 / 16:9 screencaps, 24-bit PNG). The five required in-app pages have not been captured because no demo-account credentials were available, and this pass did not sign into a live merchant.

Play Console tablet rules used: JPEG or 24-bit PNG, each side 1,080–7,680 px, 16:9 landscape or 9:16 portrait, minimum 4 screenshots per tablet slot. See [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

Android XR in Play Console is a **separate** slot (8:5 screenshots). These tablet captures do not fill XR.

## Manual actions remaining

1. Create or nominate a non-production merchant named **BookGlow Demo** with realistic but fake bookings, members, and sales. Do not use live spa data.
2. Set `PLAY_SCREENSHOT_EMAIL` / `PLAY_SCREENSHOT_PASSWORD` and run:
   - `node play-store-assets/capture-webview.mjs 7in`
   - `node play-store-assets/capture-webview.mjs 10in`
3. Review the five PNGs per folder: no spinner, no keyboard, no debug overlays, no real phone numbers/emails.
4. Upload to Play Console → Store listing → 7-inch tablet screenshots and 10-inch tablet screenshots. Do not upload `previews/*-login.png` unless you want a sign-in shot as an extra image.
5. Optional: capture the phone set with `BookGlow_phone`.
6. App icon and feature graphic: upload `play-store-assets/play-icon-512.png` (512×512) and `play-store-assets/play-feature-graphic.png` (1024×500).
