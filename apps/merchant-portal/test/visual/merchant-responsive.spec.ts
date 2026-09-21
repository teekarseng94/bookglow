import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const viewports = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 600, height: 960 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1180, height: 820 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

async function openHarness(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/merchant-responsive-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('dialog', { name: 'Edit Service' })).toBeVisible({ timeout: 30_000 });
}

test('Merchant editor drawer and tabs stay usable across required viewports', async ({ page }) => {
  test.setTimeout(180_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await page.evaluate(({ top, bottom }) => {
      document.documentElement.style.setProperty('--safe-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
    }, { top: 28, bottom: 24 });

    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const tablist = document.querySelector<HTMLElement>('[role="tablist"]');
      const save = [...document.querySelectorAll<HTMLElement>('button')].find((el) => /save/i.test(el.textContent || ''));
      const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
      const tabWraps = tabs.some((tab) => tab.scrollHeight > tab.clientHeight + 4);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        drawerWidth: dialog ? dialog.getBoundingClientRect().width : 0,
        drawerOverflow: dialog ? dialog.scrollWidth > dialog.clientWidth + 2 : true,
        tablistOverflowsPage: tablist ? tablist.scrollWidth > document.documentElement.clientWidth + 2 : false,
        tabWraps,
        saveVisible: Boolean(save && save.getClientRects().length > 0),
        saveHeight: save ? save.getBoundingClientRect().height : 0,
      };
    });

    expect(geometry.scrollWidth, `page overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.drawerOverflow, `drawer overflow at ${viewport.width}`).toBe(false);
    expect(geometry.tabWraps, `tab wrap at ${viewport.width}`).toBe(false);
    expect(geometry.saveVisible).toBe(true);
    if (viewport.width < 600) {
      expect(geometry.drawerWidth, `phone drawer at ${viewport.width}`).toBeGreaterThan(viewport.width - 8);
    } else if (viewport.width === 768) {
      expect(geometry.drawerWidth, 'iPad Mini drawer should not stay at 420px').toBeGreaterThan(500);
    } else if (viewport.width >= 1440) {
      expect(geometry.drawerWidth, 'desktop editor drawer').toBeGreaterThan(500);
    }

    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Availability' })).toBeVisible();

    if (viewport.width >= 600) {
      await page.getByRole('tab', { name: 'Pricing' }).click();
      const pricingGrid = await page.evaluate(() => {
        const grid = document.querySelector<HTMLElement>('.m-form-grid--2');
        if (!grid) return { columns: '', childCount: 0 };
        const style = getComputedStyle(grid);
        return {
          columns: style.gridTemplateColumns,
          childCount: grid.children.length,
        };
      });
      expect(pricingGrid.childCount, `pricing fields at ${viewport.width}`).toBeGreaterThanOrEqual(4);
      expect(pricingGrid.columns.split(' ').length, `pricing should be 2 columns at ${viewport.width}`).toBeGreaterThanOrEqual(2);
    }

    await page.screenshot({
      path: artifact(`merchant-responsive-${viewport.width}x${viewport.height}.png`),
      animations: 'disabled',
    });
  }
});

test('Merchant editor remains usable with a 24px root font at phone and tablet widths', async ({ page }) => {
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    await openHarness(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '24px';
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, `font overflow at ${viewport.width}`).toBe(false);
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
    await page.screenshot({
      path: artifact(`merchant-responsive-${viewport.width}-font-24.png`),
      animations: 'disabled',
    });
  }
});
