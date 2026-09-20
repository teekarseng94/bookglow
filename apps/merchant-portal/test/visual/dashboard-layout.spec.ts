import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
] as const;

async function openDashboard(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/dashboard-layout-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Business performance' }).or(page.getByLabel('Business performance'))).toBeVisible({ timeout: 30_000 });
}

test('Dashboard layout stays within the viewport at required widths', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openDashboard(page);
    await page.evaluate(({ top, bottom }) => {
      document.documentElement.style.setProperty('--safe-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
    }, { top: 28, bottom: 24 });

    const geometry = await page.evaluate(() => {
      const kpi = document.querySelector<HTMLElement>('.dashboard-kpi-value');
      const root = document.documentElement;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        kpiVisible: Boolean(kpi && kpi.getClientRects().length > 0),
        kpiOverflows: kpi ? kpi.scrollWidth > kpi.clientWidth + 1 : true,
      };
    });

    expect(geometry.scrollWidth, `overflow at ${viewport.width}px`).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.kpiVisible).toBe(true);
    expect(geometry.kpiOverflows, `KPI clipped at ${viewport.width}px`).toBe(false);
    await expect(page.getByText('RM 1,234,567.89').first()).toBeVisible();
    await expect(page.locator('.dashboard-money__tail').first()).toHaveText('567.89');
    await expect(page.locator('.dashboard-money__tail').first()).toHaveCSS('white-space', 'nowrap');

    if (viewport.width >= 1280) {
      const primaryColumns = await page.evaluate(() => {
        const el = document.querySelector('.dashboard-primary');
        if (!el) return 0;
        return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      });
      expect(primaryColumns, `primary columns at ${viewport.width}px`).toBe(3);
    }
    await page.screenshot({
      path: artifact(`dashboard-layout-${viewport.width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }
});

test('Dashboard mobile shell keeps actions above Android insets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-top', '28px');
    document.documentElement.style.setProperty('--safe-bottom', '24px');
  });

  const geometry = await page.evaluate(() => {
    const headerInner = document.querySelector<HTMLElement>('.bookglow-mobile-header__inner');
    const navInner = document.querySelector<HTMLElement>('.bookglow-mobile-nav__inner');
    if (!headerInner || !navInner) throw new Error('Mobile shell is incomplete');
    return {
      headerTop: headerInner.getBoundingClientRect().top,
      navBottom: navInner.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(geometry.headerTop).toBeGreaterThanOrEqual(28);
  expect(geometry.navBottom).toBeLessThanOrEqual(geometry.viewportHeight - 24);
});

test('Dashboard stays within the viewport at an enlarged root font size', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openDashboard(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await page.getByRole('button', { name: /Aisha Rahman binti Abdullah/ }).click();

  const geometry = await page.evaluate(() => {
    const kpi = document.querySelector<HTMLElement>('.dashboard-kpi-value');
    const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      kpiOverflows: kpi ? kpi.scrollWidth > kpi.clientWidth + 1 : true,
      navOverflows: nav ? nav.scrollWidth > nav.clientWidth + 1 : true,
    };
  });

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.kpiOverflows).toBe(false);
  expect(geometry.navOverflows).toBe(false);
  await expect(page.getByRole('button', { name: 'Aisha Rahman binti Abdullah' })).toBeVisible();
});
