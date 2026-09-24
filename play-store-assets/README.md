# BookGlow Play Store screenshot capture

Repeatable pipeline for Google Play **7-inch** and **10-inch** tablet screenshots of `com.bookglow.merchant`.

## Device profiles

| Slot | AVD | Pixels | Density | Orientation | Why |
| --- | --- | --- | --- | --- | --- |
| 7-inch tablet | `BookGlow_7in` | 1080 × 1920 | 213 dpi | Portrait 9:16 | Play large-screen 9:16 |
| 10-inch tablet | `BookGlow_10in` | 2560 × 1440 | 280 dpi | Landscape 16:9 | Play 16:9 and BookGlow desktop sidebar (`lg` ≥ 1024px) |
| Phone (optional) | `BookGlow_phone` | 1080 × 1920 | 420 dpi | Portrait 9:16 | Phone slot, longest side ≤ 2× shortest |

AVD userdata lives on `D:\Android\avd` (`ANDROID_AVD_HOME`). Do not place AVDs on `C:` — that drive does not have enough free space.

## One-time setup

```powershell
$env:ANDROID_SDK_ROOT = 'D:\Android\Sdk'
$env:ANDROID_HOME = 'D:\Android\Sdk'
$env:ANDROID_AVD_HOME = 'D:\Android\avd'
powershell -File play-store-assets\install-avds.ps1
```

## Build debug APK (does not change release signing)

```powershell
cd apps\merchant-portal
npm run build
npx cap sync android
cd android
$env:ANDROID_SDK_ROOT = 'D:\Android\Sdk'
.\gradlew.bat assembleDebug
```

APK: `apps\merchant-portal\android\app\build\outputs\apk\debug\app-debug.apk`

## Capture

Use a **demo merchant** named **BookGlow Demo**. Do not sign in as Bali Wellness, Sohokaki, Catla, ZenThai, or any live customer-facing outlet.

Sign in with **email and password**. Do not tap Continue with Google on the emulator — Capacitor opens Chrome Custom Tabs, and Chromium’s Vulkan path can abort the emulator GPU on Windows. Boot AVDs with `-feature -Vulkan` if you must recover from that hang.

```powershell
$env:ANDROID_SDK_ROOT = 'D:\Android\Sdk'
$env:ANDROID_AVD_HOME = 'D:\Android\avd'
$env:PLAY_SCREENSHOT_EMAIL = 'demo-merchant@example.com'
$env:PLAY_SCREENSHOT_PASSWORD = '...'

# Boot one profile, then:
& "$env:ANDROID_SDK_ROOT\emulator\emulator.exe" -avd BookGlow_7in -no-snapshot-load -gpu auto -feature -Vulkan
# install + launch happen inside the node script after the emulator is `adb devices` ready

node play-store-assets\capture-webview.mjs 7in
node play-store-assets\capture-webview.mjs 10in
```

Outputs:

- `play-store-assets/tablet-7-inch/01-dashboard.png` … `05-sales-reports.png`
- `play-store-assets/tablet-10-inch/01-dashboard.png` … `05-sales-reports.png`

Screenshots are native `adb screencap` PNGs, flattened to 24-bit (no alpha). They are not stretched phone images.

## Store listing graphics (required)

Upload these on [Main store listing](https://play.google.com/console/u/0/developers/8952826178906404468/app/4972139906415229075/store-listings/default/edit):

| Play Console field | File | Spec |
| --- | --- | --- |
| App icon | `play-store-assets/play-icon-512.png` | PNG, 512 × 512, 24-bit, 3.7 KB (limit 1 MB) |
| Feature graphic | `play-store-assets/play-feature-graphic.png` | PNG, 1024 × 500, 24-bit, 13 KB (limit 15 MB) |

Play rounds the icon. Do not upload a pre-rounded version. The star sits in the center safe zone on brand purple `#7656D6`.
