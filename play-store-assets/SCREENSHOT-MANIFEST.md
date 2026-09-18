# Screenshot manifest

Native emulator captures. Login previews were used to validate device profiles. Authenticated store listing pages still need a demo merchant login.

## 7-INCH TABLET

AVD: `BookGlow_7in`  
System image: Android 15 / API 35 `google_apis_playstore_tablet` x86_64  
Display: 1080 × 1920, 213 dpi, portrait 9:16  
CSS viewport: ≈ 811 × 1444

| filename | width | height | page | emulator/device | status |
| --- | ---: | ---: | --- | --- | --- |
| previews/7in-login.png | 1080 | 1920 | Sign in | BookGlow_7in | captured (pipeline check only, not a store listing shot) |
| 01-dashboard.png | 1080 | 1920 | Dashboard | BookGlow_7in | pending demo login |
| 02-schedule.png | 1080 | 1920 | Schedule | BookGlow_7in | pending demo login |
| 03-pos.png | 1080 | 1920 | POS | BookGlow_7in | pending demo login |
| 04-members.png | 1080 | 1920 | Members | BookGlow_7in | pending demo login |
| 05-sales-reports.png | 1080 | 1920 | Sales Reports | BookGlow_7in | pending demo login |

## 10-INCH TABLET

AVD: `BookGlow_10in`  
System image: Android 15 / API 35 `google_apis_playstore_tablet` x86_64  
Display: 2560 × 1440, 280 dpi, landscape 16:9  
CSS viewport: ≈ 1463 × 823

| filename | width | height | page | emulator/device | status |
| --- | ---: | ---: | --- | --- | --- |
| previews/10in-login.png | 2560 | 1440 | Sign in | BookGlow_10in | captured (pipeline check only, not a store listing shot) |
| 01-dashboard.png | 2560 | 1440 | Dashboard | BookGlow_10in | pending demo login |
| 02-schedule.png | 2560 | 1440 | Schedule | BookGlow_10in | pending demo login |
| 03-pos.png | 2560 | 1440 | POS | BookGlow_10in | pending demo login |
| 04-members.png | 2560 | 1440 | Members | BookGlow_10in | pending demo login |
| 05-sales-reports.png | 2560 | 1440 | Sales Reports | BookGlow_10in | pending demo login |

Landscape is used for 10-inch because BookGlow’s tablet sidebar and POS desktop layout start at 1024 CSS pixels. A realistic 10-inch portrait 9:16 panel is only ~780–820 CSS pixels wide and would show the phone bottom navigation.

## PHONE

| filename | width | height | page | device | status |
| --- | ---: | ---: | --- | --- | --- |
| 01-dashboard.png | 1080 | 1920 | Dashboard | BookGlow_phone | not captured (optional) |
| 02-schedule.png | 1080 | 1920 | Schedule | BookGlow_phone | not captured (optional) |
| 03-pos.png | 1080 | 1920 | POS | BookGlow_phone | not captured (optional) |
| 04-members.png | 1080 | 1920 | Members | BookGlow_phone | not captured (optional) |
| 05-sales-reports.png | 1080 | 1920 | Sales Reports | BookGlow_phone | not captured (optional) |

Phone AVD `BookGlow_phone` is defined (1080 × 1920, 420 dpi, Android 16 system image) but was not booted in this pass.
