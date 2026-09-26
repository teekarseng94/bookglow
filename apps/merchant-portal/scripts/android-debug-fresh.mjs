/**
 * Fresh debug APK from the current Merchant Portal source.
 *
 * 1. Deletes generated Vite output (`dist`) and Capacitor copied web assets
 *    (`android/app/src/main/assets/public`). Does not touch source, Gradle
 *    signing, or keystore files.
 * 2. Runs `npm run cap:sync` (Vite production build + `npx cap sync android`).
 * 3. Builds the debug APK with Gradle.
 *
 * Usage (from apps/merchant-portal):
 *   npm run android:debug:fresh
 */
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const portal = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

function clean(rel) {
  const abs = path.join(portal, rel);
  rmSync(abs, { recursive: true, force: true });
  console.log(`[android:debug:fresh] cleaned ${rel}`);
}

function run(command, args, cwd = portal) {
  console.log(`[android:debug:fresh] ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, CAP_WEB_DEBUG: '1' },
    shell: isWin,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

clean('dist');
clean(path.join('android', 'app', 'src', 'main', 'assets', 'public'));

run('npm', ['run', 'cap:sync']);

const gradle = isWin ? 'gradlew.bat' : './gradlew';
run(gradle, ['assembleDebug'], path.join(portal, 'android'));

const fingerprint = path.join(portal, 'dist', 'bookglow-build.json');
if (existsSync(fingerprint)) {
  console.log('[android:debug:fresh] fingerprint');
  console.log(readFileSync(fingerprint, 'utf8'));
} else {
  console.warn('[android:debug:fresh] dist/bookglow-build.json missing');
}

const apk = path.join(portal, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log(`[android:debug:fresh] APK ${apk}`);
