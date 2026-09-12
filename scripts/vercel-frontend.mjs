/**
 * Selects the Vercel frontend app for this monorepo.
 *
 * Default: customer site (existing project `bookglow` / bookglow.vercel.app).
 * Merchant: VERCEL_PROJECT_NAME=bookglow-merchant or BOOKGLOW_VERCEL_APP=merchant.
 *
 * Firebase Hosting is legacy frontend. Firebase Functions stay on Firebase.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const action = process.argv[2];
const stagingDir = path.join(root, 'dist-vercel');

function isMerchantApp() {
  const explicit = String(process.env.BOOKGLOW_VERCEL_APP || '').trim().toLowerCase();
  if (explicit === 'merchant' || explicit === 'dashboard') return true;
  if (explicit === 'customer' || explicit === 'booking') return false;
  const name = String(process.env.VERCEL_PROJECT_NAME || '').trim().toLowerCase();
  return name === 'bookglow-merchant' || name.endsWith('-merchant');
}

function run(command) {
  const result = spawnSync(command, {
    cwd: root,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stage(sourceDir) {
  const from = path.join(root, sourceDir);
  if (!existsSync(from)) {
    console.error(`Missing build output: ${from}`);
    process.exit(1);
  }
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(path.dirname(stagingDir), { recursive: true });
  cpSync(from, stagingDir, { recursive: true });
}

const merchant = isMerchantApp();

if (action === 'install') {
  run('npm ci --include=dev');
  run(
    merchant
      ? 'npm --prefix apps/merchant-portal ci --include=dev'
      : 'npm --prefix apps/customer-site ci --include=dev',
  );
  process.exit(0);
}

if (action === 'build') {
  if (merchant) {
    run('npm run build:merchant');
    stage('dist-dashboard');
  } else {
    run('npm run build:customer');
    stage('dist-booking');
  }
  process.exit(0);
}

console.error('Usage: node scripts/vercel-frontend.mjs <install|build>');
process.exit(1);
