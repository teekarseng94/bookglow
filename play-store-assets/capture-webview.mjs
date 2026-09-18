/**
 * Capture Play Store screenshots from a running BookGlow Merchant emulator
 * by driving the Capacitor WebView over Chrome DevTools Protocol, then using
 * `adb exec-out screencap` so the images are native device pixels (no bezel).
 *
 * Prerequisites:
 *   - emulator booted, app installed and launched
 *   - PLAY_SCREENSHOT_EMAIL / PLAY_SCREENSHOT_PASSWORD for a demo merchant
 *
 * Usage:
 *   node play-store-assets/capture-webview.mjs 7in
 *   node play-store-assets/capture-webview.mjs 10in
 *   node play-store-assets/capture-webview.mjs phone
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../apps/merchant-portal/node_modules/playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || 'D:\\Android\\Sdk';
const ADB = path.join(SDK, 'platform-tools', 'adb.exe');

const PAGES = [
  { file: '01-dashboard.png', path: '/dashboard', ready: /Today|Dashboard|New Booking/i },
  { file: '02-schedule.png', path: '/schedule', ready: /Schedule|Appointments|Calendar/i },
  { file: '03-pos.png', path: '/pos', ready: /Point of Sale|Catalogue|Pay now|Cart/i },
  { file: '04-members.png', path: '/member', ready: /Members|Member/i },
  { file: '05-sales-reports.png', path: '/sales-reports', ready: /Sales Reports|Collection|Revenue/i },
];

const PROFILES = {
  '7in': { folder: 'tablet-7-inch', width: 1080, height: 1920, density: 213 },
  '10in': { folder: 'tablet-10-inch', width: 2560, height: 1440, density: 280 },
  phone: { folder: 'phone', width: 1080, height: 1920, density: 420 },
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const err = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks);
      if (code !== 0) reject(new Error(`${cmd} ${args.join(' ')}\n${Buffer.concat(err).toString()}`));
      else resolve(stdout);
    });
  });
}

async function adbSerial() {
  const out = (await run(ADB, ['devices'])).toString();
  const serial = out.split('\n').map((l) => l.trim()).find((l) => l.endsWith('\tdevice'))?.split('\t')[0];
  if (!serial) throw new Error('No emulator/device connected');
  return serial;
}

async function flattenPng(file) {
  const safe = file.replace(/'/g, "''");
  await run('powershell', [
    '-NoProfile',
    '-Command',
    `Add-Type -AssemblyName System.Drawing; $src=[System.Drawing.Bitmap]::FromFile('${safe}'); $dst=New-Object System.Drawing.Bitmap $src.Width,$src.Height,([System.Drawing.Imaging.PixelFormat]::Format24bppRgb); $g=[System.Drawing.Graphics]::FromImage($dst); $g.Clear([System.Drawing.Color]::White); $g.DrawImage($src,0,0,$src.Width,$src.Height); $g.Dispose(); $src.Dispose(); $tmp='${safe}.tmp.png'; $dst.Save($tmp,[System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose(); Move-Item -Force $tmp '${safe}'`,
  ]);
}

async function screencap(serial, dest) {
  const png = await run(ADB, ['-s', serial, 'exec-out', 'screencap', '-p']);
  if (png.length < 10_000) throw new Error(`Screenshot too small: ${dest}`);
  await writeFile(dest, png);
  await flattenPng(dest);
}

const profileName = process.argv[2] || '7in';
const profile = PROFILES[profileName];
if (!profile) {
  console.error('Usage: node capture-webview.mjs 7in|10in|phone');
  process.exit(1);
}

const email = process.env.PLAY_SCREENSHOT_EMAIL;
const password = process.env.PLAY_SCREENSHOT_PASSWORD;
if (!email || !password) {
  console.error('Set PLAY_SCREENSHOT_EMAIL and PLAY_SCREENSHOT_PASSWORD to a demo merchant (not a live spa).');
  process.exit(1);
}

const serial = await adbSerial();
await run(ADB, ['-s', serial, 'shell', 'wm', 'size', `${profile.width}x${profile.height}`]);
await run(ADB, ['-s', serial, 'shell', 'wm', 'density', String(profile.density)]);
await run(ADB, ['-s', serial, 'shell', 'am', 'start', '-n', 'com.bookglow.merchant/.MainActivity']);
await new Promise((r) => setTimeout(r, 4000));

const sockets = (await run(ADB, ['-s', serial, 'shell', 'cat', '/proc/net/unix'])).toString();
const socket = sockets.split('\n').map((l) => l.trim()).find((l) => l.includes('webview_devtools_remote_'))?.split('@').pop();
if (!socket) throw new Error('WebView DevTools socket not found. Launch the app first.');
await run(ADB, ['-s', serial, 'forward', 'tcp:9222', `localabstract:${socket}`]);

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();

if (page.url().includes('/login')) {
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
}

const destDir = path.join(__dirname, profile.folder);
await mkdir(destDir, { recursive: true });

for (const item of PAGES) {
  await page.goto(`https://localhost${item.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();
  if (/Loading data from Firestore/i.test(body)) {
    await page.waitForTimeout(4000);
  }
  await page.evaluate(() => {
    document.querySelectorAll('input').forEach((el) => el.blur());
  });
  await page.waitForTimeout(800);
  const dest = path.join(destDir, item.file);
  await screencap(serial, dest);
  console.log('captured', dest);
}

await browser.close();
console.log('done');
