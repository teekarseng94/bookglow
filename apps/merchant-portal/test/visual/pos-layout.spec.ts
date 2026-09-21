import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const viewports = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
] as const;

async function openPOS(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/pos-layout-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('searchbox', { name: 'Search services' })).toBeVisible({ timeout: 30_000 });
}

function isTablet(width: number) {
  return width >= 720 && width < 1200;
}

function isPhone(width: number) {
  return width < 720;
}

test('POS layout stays within the viewport at required widths', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openPOS(page);
    await page.evaluate(({ top, bottom }) => {
      document.documentElement.style.setProperty('--safe-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
    }, { top: 28, bottom: 24 });

    const geometry = await page.evaluate(() => {
      const visible = (el: Element | null) => {
        if (!(el instanceof HTMLElement)) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
      };
      const card = [...document.querySelectorAll<HTMLElement>('.m-pos-tablet-card, .m-pos-mobile-card, .m-pos-desktop-row')]
        .find(visible);
      const add = [...document.querySelectorAll<HTMLElement>('.m-pos-add-btn, [aria-label^="Add "]')]
        .find(visible);
      const title = card?.querySelector<HTMLElement>('.m-pos-tablet-card__title, .m-pos-mobile-card__title, p');
      const checkout = [...document.querySelectorAll<HTMLElement>('.m-pos-checkout-btn')].find(visible);
      const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
      const search = document.querySelector<HTMLElement>('.m-pos-search');
      const rail = document.querySelector<HTMLElement>('.m-pos-order-rail');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        addSize: add ? add.getBoundingClientRect() : null,
        cardWidth: card ? card.getBoundingClientRect().width : 0,
        titleOverflows: title
          ? title.scrollWidth > title.clientWidth + 1
            && !title.className.includes('line-clamp')
            && !title.className.includes('truncate')
          : false,
        checkoutBottom: checkout ? checkout.getBoundingClientRect().bottom : 0,
        navTop: nav && visible(nav) ? nav.getBoundingClientRect().top : null,
        searchWidth: search ? search.getBoundingClientRect().width : 0,
        railWidth: rail && visible(rail) ? rail.getBoundingClientRect().width : 0,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.scrollWidth, `overflow at ${viewport.width}px`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    await expect(page.getByRole('searchbox', { name: 'Search services' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Services' })).toBeVisible();
    await expect(page.locator('.dashboard-money').locator('visible=true').first()).toBeVisible();
    expect(geometry.titleOverflows, `title overflow at ${viewport.width}`).toBe(false);

    if (isPhone(viewport.width)) {
      await expect(page.locator('.m-pos-mobile-card').first()).toBeVisible();
      await expect(page.locator('.m-pos-sticky-cart')).toBeVisible();
    }

    if (isTablet(viewport.width)) {
      expect(geometry.cardWidth, `narrow card at ${viewport.width}`).toBeGreaterThanOrEqual(118);
      expect(geometry.railWidth, `order rail at ${viewport.width}`).toBeGreaterThanOrEqual(300);
      expect(geometry.searchWidth).toBeGreaterThan(180);
      const add = geometry.addSize;
      expect(add, 'add button missing').toBeTruthy();
      expect(Math.round(add!.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(add!.height)).toBeGreaterThanOrEqual(44);
      await expect(page.locator('.m-pos-tablet-card').first()).toBeVisible();
      await expect(page.getByPlaceholder('Search by name or phone...')).toBeVisible();
      await expect(page.locator('select[aria-label="Payment method"]').locator('visible=true')).toBeVisible();
      await expect(page.getByRole('button', { name: /Proceed to Payment/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Order Summary' }).locator('visible=true')).toBeVisible();
    }

    if (viewport.width >= 1200) {
      await expect(page.locator('.m-pos-desktop-row').first()).toBeVisible();
      await expect(page.locator('.m-pos-tablet-card').first()).toBeHidden();
      await expect(page.locator('.m-pos-mobile-card').first()).toBeHidden();
      await expect(page.locator('.m-pos-sticky-cart')).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Order Summary' }).locator('visible=true')).toBeVisible();
    }

    if (viewport.width < 1024) {
      const nav = page.locator('.bookglow-mobile-nav');
      await expect(nav).toBeVisible();
      if (geometry.navTop != null && geometry.checkoutBottom) {
        expect(geometry.checkoutBottom, `checkout under nav at ${viewport.width}`).toBeLessThanOrEqual(geometry.navTop + 1);
      }
    }

    await page.screenshot({
      path: artifact(`pos-layout-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }
});

test('POS iPad Mini portrait keeps checkout above the bottom nav', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openPOS(page);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-top', '28px');
    document.documentElement.style.setProperty('--safe-bottom', '24px');
  });

  const columns = await page.evaluate(() => {
    const grid = document.querySelector('.m-pos-catalogue-grid');
    return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
  });
  expect(columns).toBe(3);

  await page.locator('.m-pos-tablet-card').filter({ hasText: 'Signature facial' }).locator('.m-pos-add-btn').click();
  await expect(page.locator('.m-pos-order-rail .m-pos-cart-item__name').filter({ hasText: 'Signature facial' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proceed to Payment' })).toBeEnabled();

  const geometry = await page.evaluate(() => {
    const visible = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
    };
    const checkout = [...document.querySelectorAll<HTMLElement>('.m-pos-checkout-btn')].find(visible);
    const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
    const add = [...document.querySelectorAll<HTMLElement>('[aria-label="Add Signature facial"]')].find(visible);
    return {
      checkoutBottom: checkout?.getBoundingClientRect().bottom ?? 0,
      navTop: nav && visible(nav) ? nav.getBoundingClientRect().top : 0,
      addHeight: add?.getBoundingClientRect().height ?? 0,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.checkoutBottom).toBeGreaterThan(0);
  expect(geometry.checkoutBottom).toBeLessThanOrEqual(geometry.navTop + 1);
  expect(Math.round(geometry.addHeight)).toBeGreaterThanOrEqual(44);

  await page.screenshot({
    path: artifact('pos-layout-768x1024-with-item.png'),
    fullPage: false,
    animations: 'disabled',
  });
});

test('POS iPad Mini portrait remains usable at 24px root font', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openPOS(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
  await expect(page.getByRole('searchbox', { name: 'Search services' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order Summary' }).locator('visible=true')).toBeVisible();
  await page.screenshot({
    path: artifact('pos-layout-768x1024-font-24.png'),
    fullPage: false,
    animations: 'disabled',
  });
});
