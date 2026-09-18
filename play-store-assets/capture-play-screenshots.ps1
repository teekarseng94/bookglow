# Capture Google Play screenshots from BookGlow Merchant Android emulators.
# Usage:
#   $env:PLAY_SCREENSHOT_EMAIL = 'demo@example.com'
#   $env:PLAY_SCREENSHOT_PASSWORD = '...'
#   powershell -File play-store-assets\capture-play-screenshots.ps1
#
# Optional:
#   PLAY_SCREENSHOT_APK  - path to a debug/release APK (default: latest debug APK)
#   PLAY_SCREENSHOT_SET  - 7in | 10in | phone | all (default: all)
#   PLAY_SCREENSHOT_PAUSE_MS - wait after navigation before capture (default 4000)

param(
  [ValidateSet('7in', '10in', 'phone', 'all')]
  [string]$Set = $(if ($env:PLAY_SCREENSHOT_SET) { $env:PLAY_SCREENSHOT_SET } else { 'all' })
)

$ErrorActionPreference = 'Stop'
$sdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { 'D:\Android\Sdk' }
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_HOME = $sdk
if (-not $env:ANDROID_AVD_HOME) { $env:ANDROID_AVD_HOME = 'D:\Android\avd' }
$adb = Join-Path $sdk 'platform-tools\adb.exe'
$emulator = Join-Path $sdk 'emulator\emulator.exe'
$repoRoot = Split-Path -Parent $PSScriptRoot
$outRoot = $PSScriptRoot
$apk = $env:PLAY_SCREENSHOT_APK
if (-not $apk) {
  $apk = Join-Path $repoRoot 'apps\merchant-portal\android\app\build\outputs\apk\debug\app-debug.apk'
}

$pages = @(
  @{ File = '01-dashboard.png'; Path = '/dashboard'; Label = 'Dashboard' },
  @{ File = '02-schedule.png'; Path = '/schedule'; Label = 'Schedule' },
  @{ File = '03-pos.png'; Path = '/pos'; Label = 'POS' },
  @{ File = '04-members.png'; Path = '/member'; Label = 'Members' },
  @{ File = '05-sales-reports.png'; Path = '/sales-reports'; Label = 'Sales Reports' }
)

$profiles = @{
  '7in' = @{
    Avd = 'BookGlow_7in'
    Folder = 'tablet-7-inch'
    Width = 1080
    Height = 1920
    Density = 213
    SerialHint = 'emulator'
  }
  '10in' = @{
    Avd = 'BookGlow_10in'
    Folder = 'tablet-10-inch'
    Width = 2560
    Height = 1440
    Density = 280
    SerialHint = 'emulator'
  }
  'phone' = @{
    Avd = 'BookGlow_phone'
    Folder = 'phone'
    Width = 1080
    Height = 1920
    Density = 420
    SerialHint = 'emulator'
  }
}

function Invoke-Adb {
  param([string]$Serial, [string[]]$Args)
  & $adb -s $Serial @Args
  if ($LASTEXITCODE -ne 0) { throw "adb $($Args -join ' ') failed" }
}

function Wait-Boot {
  param([string]$Serial)
  $deadline = (Get-Date).AddMinutes(8)
  do {
    Start-Sleep -Seconds 4
    $boot = & $adb -s $Serial shell getprop sys.boot_completed 2>$null
    if ("$boot".Trim() -eq '1') { return }
  } while ((Get-Date) -lt $deadline)
  throw "Emulator $Serial did not boot in time"
}

function Flatten-Png {
  param([string]$Path)
  Add-Type -AssemblyName System.Drawing
  $src = [System.Drawing.Bitmap]::FromFile($Path)
  try {
    $dst = New-Object System.Drawing.Bitmap $src.Width, $src.Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    try {
      $g.Clear([System.Drawing.Color]::White)
      $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
    } finally { $g.Dispose() }
    $src.Dispose()
    $tmp = "$Path.tmp.png"
    $dst.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    Move-Item -Force $tmp $Path
  } catch {
    if ($src) { $src.Dispose() }
    throw
  }
}

function Test-PlayRatio {
  param([int]$W, [int]$H, [string]$Kind)
  $min = [Math]::Min($W, $H)
  $max = [Math]::Max($W, $H)
  if ($Kind -eq 'phone') {
    return ($min -ge 320 -and $max -le 3840 -and ($max / $min) -le 2.01)
  }
  $ratio = $max / $min
  $is169 = [Math]::Abs($ratio - (16/9)) -lt 0.02
  return ($min -ge 1080 -and $max -le 7680 -and $is169)
}

function Start-Avd {
  param([string]$Name)
  $existing = & $adb devices | Select-String 'emulator-\d+\s+device'
  $before = @(& $adb devices)
  $proc = Start-Process -FilePath $emulator -ArgumentList @(
    '-avd', $Name,
    '-no-snapshot-load',
    '-no-boot-anim',
    '-gpu', 'auto',
    '-netdelay', 'none',
    '-netspeed', 'full'
  ) -PassThru
  $deadline = (Get-Date).AddMinutes(3)
  $serial = $null
  do {
    Start-Sleep -Seconds 3
    $now = & $adb devices
    $serial = ($now | Select-String 'emulator-\d+\s+device' | ForEach-Object { ($_ -split '\s+')[0] } | Select-Object -Last 1)
    if ($serial) { break }
  } while ((Get-Date) -lt $deadline)
  if (-not $serial) { throw "Could not start AVD $Name" }
  Wait-Boot -Serial $serial
  return @{ Serial = $serial; Pid = $proc.Id }
}

function Stop-Avd {
  param([string]$Serial, [int]$Pid)
  try { & $adb -s $Serial emu kill | Out-Null } catch {}
  Start-Sleep -Seconds 2
  if ($Pid) {
    try { Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue } catch {}
  }
}

if (-not (Test-Path $apk)) { throw "APK not found: $apk. Build the debug app first." }
if (-not $env:PLAY_SCREENSHOT_EMAIL -or -not $env:PLAY_SCREENSHOT_PASSWORD) {
  Write-Warning 'PLAY_SCREENSHOT_EMAIL / PLAY_SCREENSHOT_PASSWORD are not set. The script will install and launch the app, then wait for a manual login before capturing.'
}

$selected = if ($Set -eq 'all') { @('7in', '10in', 'phone') } else { @($Set) }
$pause = if ($env:PLAY_SCREENSHOT_PAUSE_MS) { [int]$env:PLAY_SCREENSHOT_PAUSE_MS } else { 4000 }

foreach ($key in $selected) {
  $profile = $profiles[$key]
  Write-Host "=== $($profile.Avd) ==="
  $session = Start-Avd -Name $profile.Avd
  $serial = $session.Serial
  try {
    Invoke-Adb $serial @('install', '-r', $apk)
    Invoke-Adb $serial @('shell', 'settings', 'put', 'global', 'window_animation_scale', '0')
    Invoke-Adb $serial @('shell', 'settings', 'put', 'global', 'transition_animation_scale', '0')
    Invoke-Adb $serial @('shell', 'settings', 'put', 'global', 'animator_duration_scale', '0')
    Invoke-Adb $serial @('shell', 'wm', 'size', "$($profile.Width)x$($profile.Height)")
    Invoke-Adb $serial @('shell', 'wm', 'density', "$($profile.Density)")
    Invoke-Adb $serial @('shell', 'am', 'force-stop', 'com.bookglow.merchant')
    Invoke-Adb $serial @('shell', 'am', 'start', '-n', 'com.bookglow.merchant/.MainActivity')
    Start-Sleep -Seconds 8

    if ($env:PLAY_SCREENSHOT_EMAIL -and $env:PLAY_SCREENSHOT_PASSWORD) {
      Write-Host 'Typed login is best-effort against the WebView. Complete Google Sign-In manually if the capture pauses.'
    } else {
      Write-Host 'Sign in on the emulator, open a clean Dashboard, then press Enter here to start capturing.'
      [void](Read-Host)
    }

    $destDir = Join-Path $outRoot $profile.Folder
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null

    foreach ($page in $pages) {
      Write-Host "Capturing $($page.Label) ($($page.Path))"
      # Deep-link the Capacitor app via the custom scheme when possible; otherwise relaunch.
      & $adb -s $serial shell am start -a android.intent.action.VIEW -d "https://localhost$($page.Path)" com.bookglow.merchant | Out-Null
      Start-Sleep -Milliseconds $pause
      $file = Join-Path $destDir $page.File
      cmd.exe /c "`"$adb`" -s $serial exec-out screencap -p > `"$file`""
      if (-not (Test-Path $file) -or (Get-Item $file).Length -lt 10000) { throw "Screenshot too small: $file" }
      Flatten-Png -Path $file
      Add-Type -AssemblyName System.Drawing
      $img = [System.Drawing.Bitmap]::FromFile($file)
      $w = $img.Width; $h = $img.Height
      $img.Dispose()
      $ok = Test-PlayRatio -W $w -H $h -Kind $(if ($key -eq 'phone') { 'phone' } else { 'tablet' })
      Write-Host "  saved $file ${w}x${h} valid=$ok"
    }
  } finally {
    Stop-Avd -Serial $serial -Pid $session.Pid
  }
}

Write-Host 'Done. Review play-store-assets folders and update SCREENSHOT-MANIFEST.md.'
