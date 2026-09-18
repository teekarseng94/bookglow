import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

async function openHarness(page: import('@playwright/test').Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/test/visual/superadmin-phase1-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Operations overview' })).toBeVisible();
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}' });
}

async function searchForOutlet(page: import('@playwright/test').Page, width: number) {
  if (width < 640) await page.getByRole('button', { name: 'Open global platform search' }).click();
  const search = page.getByRole('searchbox', { name: 'Global platform search' });
  await search.fill('Moon');
  await expect(page.getByRole('option', { name: /Moonlight Wellness/ }).first()).toBeVisible();
}

test('global search and outlet inspector fit all required Phase 1 viewports', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    await openHarness(page, viewport.width, viewport.height);
    await searchForOutlet(page, viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole('option', { name: /Moonlight Wellness/ }).first().click();
    await expect(page.getByRole('dialog', { name: 'Moonlight Wellness' })).toBeVisible();
    await expect(page.getByText(outletIdForAssertion())).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Moonlight Wellness' })).toBeHidden();
  }
});

test('captures isolated Phase 1 mobile and desktop artifacts', async ({ page }) => {
  await openHarness(page, 390, 844);
  await searchForOutlet(page, 390);
  await page.screenshot({ path: artifact('superadmin-phase1-search-mobile-390x844.png') });
  await page.getByRole('option', { name: /Moonlight Wellness/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Moonlight Wellness' })).toBeVisible();
  await page.screenshot({ path: artifact('superadmin-phase1-inspector-mobile-390x844.png') });

  await openHarness(page, 1440, 1000);
  await searchForOutlet(page, 1440);
  await page.getByRole('option', { name: /Moonlight Wellness/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Moonlight Wellness' })).toBeVisible();
  await page.screenshot({ path: artifact('superadmin-phase1-inspector-desktop-1440x1000.png') });
});

function outletIdForAssertion() {
  return 'outlet-moon-001';
}
