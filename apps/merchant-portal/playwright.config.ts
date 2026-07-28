import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const authState = path.join(configDir, 'test', '.auth', 'merchant.json');

export default defineConfig({
  testDir: './test/visual',
  snapshotDir: './test/visual/__screenshots__',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.VISUAL_BASE_URL ?? 'http://127.0.0.1:5173',
    colorScheme: 'light',
    locale: 'en-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'desktop',
      testIgnore: [/auth\.setup\.ts/, /mobile-workflows\.spec\.ts/],
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: authState,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      testIgnore: [/auth\.setup\.ts/, /mobile-workflows\.spec\.ts/],
      dependencies: ['auth-setup'],
      use: {
        ...devices['iPhone 13'],
        channel: 'msedge',
        storageState: authState,
      },
    },
    {
      name: 'mobile-workflows',
      testMatch: /mobile-workflows\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['iPhone 13'],
        channel: 'msedge',
        storageState: authState,
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
