# Install BookGlow Play Store screenshot AVDs into %USERPROFILE%\.android\avd
$ErrorActionPreference = 'Stop'

$sdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { 'D:\Android\Sdk' }
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_HOME = $sdk

$repoRoot = Split-Path -Parent $PSScriptRoot
$srcRoot = Join-Path $PSScriptRoot 'emulator'
# Keep AVD data on D: — the Windows profile drive is too small for userdata images.
$avdHome = if ($env:ANDROID_AVD_HOME) { $env:ANDROID_AVD_HOME } else { 'D:\Android\avd' }
$env:ANDROID_AVD_HOME = $avdHome
New-Item -ItemType Directory -Force -Path $avdHome | Out-Null

$profiles = @('BookGlow_7in', 'BookGlow_10in', 'BookGlow_phone')
foreach ($name in $profiles) {
  $destAvd = Join-Path $avdHome "$name.avd"
  New-Item -ItemType Directory -Force -Path $destAvd | Out-Null
  Copy-Item (Join-Path $srcRoot "$name.avd\config.ini") (Join-Path $destAvd 'config.ini') -Force

  $ini = Get-Content (Join-Path $srcRoot "$name.ini") -Raw
  $ini = $ini.Replace('REPLACE_AVD_DIR', $avdHome)
  Set-Content -Path (Join-Path $avdHome "$name.ini") -Value $ini -Encoding ASCII
  Write-Host "Installed AVD $name -> $destAvd"
}

Write-Host "SDK: $sdk"
& "$sdk\emulator\emulator.exe" -list-avds
