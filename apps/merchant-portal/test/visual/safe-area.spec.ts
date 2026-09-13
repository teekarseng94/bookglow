import { expect, test, type Page } from '@playwright/test';

const requiredRoutes = ['/schedule', '/finance', '/settings'] as const;
const sharedShellRoutes = [
  '/',
  '/dashboard',
  '/pos',
  '/member',
  '/member-details/safe-area-check',
  '/menu',
  '/sales-reports',
  '/transactions',
  '/marketing',
  '/staff',
  '/integrations',
  '/report',
] as const;

async function assertSafeShell(page: Page, path: string) {
  const topInset = 28;
  const bottomInset = 24;
  await page.goto(`/test/visual/safe-area-harness.html?route=${encodeURIComponent(path)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.bookglow-mobile-nav')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(({ top, bottom }) => {
    document.documentElement.style.setProperty('--safe-top', `${top}px`);
    document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
  }, { top: topInset, bottom: bottomInset });

  const geometry = await page.evaluate(() => {
    const regularHeader = document.querySelector<HTMLElement>('.bookglow-mobile-header');
    const regularHeaderVisible = Boolean(regularHeader && getComputedStyle(regularHeader).display !== 'none');
    const safeHeader = regularHeaderVisible
      ? regularHeader
      : Array.from(document.querySelectorAll<HTMLElement>('.bookglow-mobile-safe-area-top'))
          .find((element) => getComputedStyle(element).display !== 'none') ?? null;
    const contentRow = regularHeaderVisible
      ? regularHeader.querySelector<HTMLElement>('.bookglow-mobile-header__inner')
      : safeHeader?.firstElementChild as HTMLElement | null;
    const navInner = document.querySelector<HTMLElement>('.bookglow-mobile-nav__inner');
    if (!safeHeader || !contentRow || !navInner) throw new Error('Shared mobile shell is incomplete');
    return {
      contentTop: contentRow.getBoundingClientRect().top,
      navBottom: navInner.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(geometry.contentTop).toBeGreaterThanOrEqual(topInset);
  expect(geometry.navBottom).toBeLessThanOrEqual(geometry.viewportHeight - bottomInset);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
}

test('Android safe-area geometry on required routes and phone widths', async ({ page }) => {
  for (const width of [320, 360, 375, 390, 412, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of requiredRoutes) await assertSafeShell(page, path);
  }
});

test('shared shell routes respect Android safe areas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of sharedShellRoutes) await assertSafeShell(page, path);
});
