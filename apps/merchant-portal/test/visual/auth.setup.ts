import { expect, test as setup } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const authState = path.join(testDir, '..', '.auth', 'merchant.json');

setup('authenticate merchant account', async ({ page }) => {
  if (existsSync(authState) && !process.env.VISUAL_REFRESH_AUTH) {
    return;
  }

  const email = process.env.VISUAL_EMAIL;
  const password = process.env.VISUAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Authenticated visual tests need VISUAL_EMAIL and VISUAL_PASSWORD the first time. ' +
      'See VISUAL_TESTING.md for the PowerShell commands.',
    );
  }

  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });

  const dashboard = page.getByRole('region', { name: 'Business performance' });
  const onboarding = page.getByRole('heading', { name: /professional account/i });
  await Promise.race([
    dashboard.waitFor({ state: 'visible', timeout: 45_000 }),
    onboarding.waitFor({ state: 'visible', timeout: 45_000 }),
    page.waitForURL(/\/onboarding/, { timeout: 45_000 }),
  ]).catch(() => undefined);

  if ((await onboarding.count()) > 0 || /\/onboarding/.test(page.url())) {
    throw new Error(
      'VISUAL_EMAIL signed in but has no completed merchant outlet. Use a dedicated test workspace with public.users.outlet_id and outlets.onboarding_status=complete. See VISUAL_TESTING.md.',
    );
  }

  mkdirSync(path.dirname(authState), { recursive: true });
  await page.context().storageState({ path: authState });
});
