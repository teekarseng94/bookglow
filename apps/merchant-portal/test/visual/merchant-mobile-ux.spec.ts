import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
] as const;

async function openHarness(page: import('@playwright/test').Page, query: string) {
  await page.goto(`/test/visual/merchant-mobile-ux-harness.html?${query}`, { waitUntil: 'domcontentloaded' });
}

function overflowCheck() {
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
}

test('Account setup content scrolls above the in-flow Continue bar', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports.filter((item) => item.width <= 412)) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=onboarding&step=software');
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    await expect(page.getByText('Mindbody')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const scroll = document.querySelector<HTMLElement>('.merchant-onboarding__scroll');
      const footer = document.querySelector<HTMLElement>('.merchant-onboarding__footer');
      const last = [...document.querySelectorAll<HTMLElement>('.merchant-onboarding__software label')].at(-1);
      last?.scrollIntoView({ block: 'end' });
      const lastBox = last?.getBoundingClientRect();
      const footerBox = footer?.getBoundingClientRect();
      return {
        scrollOverflowY: scroll ? scroll.scrollHeight > scroll.clientHeight - 1 : false,
        footerInScroll: Boolean(scroll && footer && scroll.contains(footer)),
        lastAboveFooter: Boolean(lastBox && footerBox && lastBox.bottom <= footerBox.top + 2),
        continueHeight: footerBox?.height || 0,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    expect(geometry.footerInScroll, `footer nested in scroller at ${viewport.width}`).toBe(false);
    expect(geometry.lastAboveFooter, `last software option covered at ${viewport.width}`).toBe(true);
    expect(geometry.pageOverflow, `onboarding page overflow at ${viewport.width}`).toBe(false);
    expect(geometry.continueHeight).toBeGreaterThan(48);
    await page.screenshot({ path: artifact(`onboarding-software-${viewport.width}.png`), fullPage: false });
  }
});

test('Location Continue stays disabled until an address is entered', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openHarness(page, 'screen=onboarding&step=location');
  const continueButton = page.getByRole('button', { name: /continue/i });
  await expect(continueButton).toBeDisabled();
  await page.getByPlaceholder('Full business address').fill('12 Jalan Example, Kuala Lumpur');
  await expect(continueButton).toBeEnabled();
  const mapVisible = await page.evaluate(() => {
    const map = document.querySelector<HTMLElement>('.merchant-onboarding__map-fallback');
    map?.scrollIntoView({ block: 'end' });
    const box = map?.getBoundingClientRect();
    const footer = document.querySelector<HTMLElement>('.merchant-onboarding__footer')?.getBoundingClientRect();
    return Boolean(box && footer && box.bottom <= footer.top + 2);
  });
  expect(mapVisible).toBe(true);
});

test('Category cards are reachable above Continue', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openHarness(page, 'screen=onboarding&step=categories');
  const last = page.getByRole('button', { name: 'Other' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  const covered = await page.evaluate(() => {
    const lastCard = [...document.querySelectorAll<HTMLElement>('.merchant-onboarding__category-grid button')].at(-1);
    const footer = document.querySelector<HTMLElement>('.merchant-onboarding__footer');
    lastCard?.scrollIntoView({ block: 'end' });
    const lastBox = lastCard?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    return Boolean(lastBox && footerBox && lastBox.bottom > footerBox.top + 2);
  });
  expect(covered).toBe(false);
});

test('Settings section dropdown stays inside the viewport and remains tappable', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=settings');
    if (viewport.width < 768) {
      const jump = page.getByRole('combobox', { name: 'Settings sections' });
      await expect(jump).toBeVisible();
      await jump.selectOption('operating-hours');
      await expect(jump).toHaveValue('operating-hours');
    }
    const geometry = await page.evaluate(overflowCheck);
    expect(geometry.scrollWidth, `settings overflow at ${viewport.width}`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    const nav = page.locator('.bookglow-mobile-nav');
    if (viewport.width < 768) {
      await expect(nav).toBeVisible();
    }
    await page.screenshot({ path: artifact(`settings-${viewport.width}.png`), fullPage: false });
  }
});

test('Sales History chips scroll inside their own row', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports.filter((item) => item.width <= 412)) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=sales');
    await expect(page.getByRole('toolbar', { name: 'Transaction type filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commission' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to POS' })).toBeVisible();
    const geometry = await page.evaluate(() => {
      const chips = document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Transaction type filters"]');
      const pageOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      const chipsScroll = chips ? chips.scrollWidth > chips.clientWidth - 1 : false;
      const last = document.querySelector('.m-empty-state');
      const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
      last?.scrollIntoView({ block: 'end' });
      const lastBox = last?.getBoundingClientRect();
      const navBox = nav?.getBoundingClientRect();
      return {
        pageOverflow,
        chipsScroll,
        emptyAboveNav: Boolean(lastBox && navBox && lastBox.bottom <= navBox.top + 8),
      };
    });
    expect(geometry.pageOverflow, `sales overflow at ${viewport.width}`).toBe(false);
    expect(geometry.emptyAboveNav, `empty state covered at ${viewport.width}`).toBe(true);
    await page.screenshot({ path: artifact(`sales-${viewport.width}.png`), fullPage: false });
  }
});

test('Keyboard resize keeps the Continue bar reachable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openHarness(page, 'screen=onboarding&step=location');
  await page.getByPlaceholder('Full business address').click();
  await page.setViewportSize({ width: 360, height: 480 });
  const continueButton = page.getByRole('button', { name: /continue/i });
  await expect(continueButton).toBeVisible();
  const inView = await continueButton.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return box.bottom <= window.innerHeight && box.top >= 0;
  });
  expect(inView).toBe(true);
});

test('POS shows one empty state above the cart and bottom navigation', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports.filter((item) => item.width <= 412)) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=pos');
    await expect(page.getByRole('heading', { name: 'No services yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Menu' })).toBeVisible();
    expect(await page.getByText(/no items found/i).count()).toBe(0);
    expect(await page.getByText(/no services found/i).count()).toBe(0);
    const geometry = await page.evaluate(() => {
      const empty = document.querySelector('.m-empty-state');
      const cart = document.querySelector<HTMLElement>('.m-pos-sticky-cart');
      const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
      empty?.scrollIntoView({ block: 'end' });
      const emptyBox = empty?.getBoundingClientRect();
      const cartBox = cart?.getBoundingClientRect();
      const navBox = nav?.getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        emptyAboveCart: Boolean(emptyBox && cartBox && emptyBox.bottom <= cartBox.top + 8),
        cartAboveNav: Boolean(cartBox && navBox && cartBox.bottom <= navBox.top + 2),
      };
    });
    expect(geometry.pageOverflow, `POS overflow at ${viewport.width}`).toBe(false);
    expect(geometry.emptyAboveCart, `POS empty state covered by cart at ${viewport.width}`).toBe(true);
    expect(geometry.cartAboveNav, `POS cart covered by nav at ${viewport.width}`).toBe(true);
    await page.screenshot({ path: artifact(`pos-${viewport.width}.png`), fullPage: false });
  }
});

test('Menu tabs keep full labels and the Add Service control stays above navigation', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports.filter((item) => item.width <= 412)) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=inventory');
    await expect(page.getByRole('tab', { name: 'Services' })).toHaveText('Services');
    await expect(page.getByRole('tab', { name: 'Products' })).toHaveText('Products');
    await expect(page.getByRole('tab', { name: 'Packages' })).toHaveText('Packages');
    await expect(page.getByRole('button', { name: 'Add Service' }).first()).toBeVisible();
    const geometry = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim());
      const fab = document.querySelector<HTMLElement>('.m-inventory-fab');
      const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
      const empty = document.querySelector('.m-empty-state');
      empty?.scrollIntoView({ block: 'end' });
      const emptyBox = empty?.getBoundingClientRect();
      const fabBox = fab?.getBoundingClientRect();
      const navBox = nav?.getBoundingClientRect();
      return {
        labels,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        emptyAboveFab: Boolean(emptyBox && fabBox && emptyBox.bottom <= fabBox.top + 8),
        fabAboveNav: Boolean(fabBox && navBox && fabBox.bottom <= navBox.top + 2),
      };
    });
    expect(geometry.labels).toEqual(['Services', 'Products', 'Packages']);
    expect(geometry.pageOverflow, `inventory overflow at ${viewport.width}`).toBe(false);
    expect(geometry.fabAboveNav, `Add Service covered by nav at ${viewport.width}`).toBe(true);
    await page.screenshot({ path: artifact(`inventory-${viewport.width}.png`), fullPage: false });
  }
});
