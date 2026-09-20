import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const SETUP_HINT =
  'Authenticated Dashboard tests need a completed merchant workspace. Recreate test/.auth/merchant.json with VISUAL_EMAIL and VISUAL_PASSWORD for a dedicated test outlet (see VISUAL_TESTING.md). Do not use an unfinished onboarding account.';

const artifactDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openLiveDashboard(page: import('@playwright/test').Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });

  const dashboard = page.getByRole('region', { name: 'Business performance' });
  const onboarding = page.getByRole('heading', { name: /professional account/i });
  await Promise.race([
    dashboard.waitFor({ state: 'visible', timeout: 45_000 }),
    onboarding.waitFor({ state: 'visible', timeout: 45_000 }),
    page.waitForURL(/\/onboarding/, { timeout: 45_000 }),
  ]).catch(() => undefined);

  if ((await onboarding.count()) > 0 || /\/onboarding/.test(page.url())) {
    test.skip(true, SETUP_HINT);
  }

  await expect(page.getByText('Loading workspace data')).toHaveCount(0);
  await expect(page.getByText('Workspace data could not be loaded')).toHaveCount(0);
  await expect(dashboard).toBeVisible({ timeout: 45_000 });
}

test.describe('authenticated merchant Dashboard', () => {
  test.describe.configure({ timeout: 60_000 });

  test('loads live outlet data without clipping KPIs', async ({ page }, testInfo) => {
    await openLiveDashboard(page);

    const isMobile = testInfo.project.name === 'mobile';
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
    await expect(page.getByText(/Remote Control:/)).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: /outlet/i })).toHaveCount(0);

    const outletId = process.env.VISUAL_OUTLET_ID;
    if (outletId) {
      await expect(page.locator('.bookglow-outlet-pill').first()).toHaveAttribute(
        'title',
        new RegExp(escapeRegExp(outletId)),
      );
    }

    const outletName = process.env.VISUAL_OUTLET_NAME;
    const email = process.env.VISUAL_EMAIL;
    if (isMobile) {
      await expect(page.locator('.bookglow-mobile-nav')).toBeVisible();
      await expect(page.locator('#bookglow-sidebar')).toBeHidden();
      if (outletName) {
        await expect(page.locator('.bookglow-mobile-header').getByText(outletName)).toBeVisible();
      }
    } else {
      await expect(page.getByText('Live outlet').first()).toBeVisible();
      await expect(page.locator('#bookglow-sidebar')).toBeVisible();
      await expect(page.locator('.bookglow-mobile-nav')).toBeHidden();
      await expect(page.getByRole('link', { name: /Today/ }).first()).toHaveAttribute('aria-current', 'page');
      if (email) {
        await expect(page.getByRole('banner').getByText(email)).toBeVisible();
      }
      if (outletName) {
        await expect(page.locator('#bookglow-sidebar').getByText(outletName)).toBeVisible();
      }
    }

    const kpi = page.locator('.dashboard-kpi-value').first();
    await expect(kpi).toBeVisible();
    await expect.poll(async () => kpi.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);

    const revenue = page.getByRole('article', { name: 'Revenue' });
    await expect(revenue.getByText(/^RM /)).toBeVisible();
    const cents = revenue.locator('.dashboard-money__tail');
    if (await cents.count()) {
      await expect(cents.first()).toHaveCSS('white-space', 'nowrap');
    }

    await expect(page.getByRole('heading', { name: "Today's Appointments" })).toBeVisible();
    const emptyAppointments = page.getByText('No appointments scheduled today.');
    if (await emptyAppointments.count()) {
      await expect(emptyAppointments).toBeVisible();
    } else {
      await expect(page.locator('.m-appointment-row .tabular-nums').first()).toHaveText(/\d{2}:\d{2}/);
      const nameControl = page.locator('.m-appointment-row button[aria-expanded]').first();
      if (await nameControl.count()) {
        await nameControl.click();
        await expect(nameControl).toHaveAttribute('aria-expanded', 'true');
        await nameControl.click();
        await expect(nameControl).toHaveAttribute('aria-expanded', 'false');
        await nameControl.focus();
        await nameControl.press('Enter');
        await expect(nameControl).toHaveAttribute('aria-expanded', 'true');
      }
    }

    await page.screenshot({
      path: path.join(artifactDir, `dashboard-authenticated-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test('quick actions and navigation stay on authorized routes', async ({ page }, testInfo) => {
    await openLiveDashboard(page);

    const newBooking = page.getByRole('button', { name: /New Booking/i });
    await expect(newBooking).toBeVisible();
    await newBooking.click();
    await expect(page).toHaveURL(/\/schedule/);
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: 'Business performance' })).toBeVisible({ timeout: 45_000 });

    const newSale = page.getByRole('button', { name: 'New Sale' });
    if (await newSale.isVisible()) {
      await newSale.click();
      await expect(page).toHaveURL(/\/pos/);
    } else {
      await page.getByRole('link', { name: /Point of Sale|POS/ }).first().click();
      await expect(page).toHaveURL(/\/pos/);
    }

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Today/ }).first()).toHaveAttribute('aria-current', 'page');

    await page.screenshot({
      path: path.join(artifactDir, `dashboard-authenticated-nav-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
});
