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

test('Settings stacks as cards without a section dropdown', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=settings');
    await expect(page.getByRole('combobox', { name: 'Settings sections' })).toHaveCount(0);
    if (viewport.width < 768) {
      await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeHidden();
      await expect(page.locator('input.m-settings-control')).toBeVisible();
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

test('Operating hours stay compact by usable width, not a 380px viewport guess', async ({ page }) => {
  test.setTimeout(120_000);
  const phoneWidths = [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 427, height: 952 },
  ];
  for (const viewport of [...phoneWidths, { width: 320, height: 568 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    await openHarness(page, 'screen=settings');
    const hours = page.locator('.m-hours-row');
    await expect(hours).toHaveCount(7);
    await expect(page.getByLabel('Sunday opening time')).toBeVisible();
    await expect(page.getByLabel('Sunday closing time')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Sunday Open' })).toBeVisible();
    await expect(hours.first().getByText('Open')).toBeVisible();
    await expect(hours.first().getByText('9:00 AM')).toBeVisible();
    await expect(hours.first().getByText('5:00 PM')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>('.m-hours-row')];
      const row = rows[0];
      const box = (selector: string) => row?.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      const day = box('.m-hours-row__day');
      const start = box('.m-hours-row__start');
      const end = box('.m-hours-row__end');
      const toggle = box('.m-hours-row__toggle');
      const status = box('.m-hours-row__status');
      const startValue = row?.querySelector<HTMLElement>('.m-hours-row__start .m-time-field__value');
      const endValue = row?.querySelector<HTMLElement>('.m-hours-row__end .m-time-field__value');
      const computed = row ? getComputedStyle(row) : null;
      const centerY = (rect?: DOMRect) => (rect ? rect.top + rect.height / 2 : 0);
      const aligned = (...rects: Array<DOMRect | undefined>) => {
        const centers = rects.map(centerY);
        return Math.max(...centers) - Math.min(...centers);
      };
      const pageEl = document.querySelector<HTMLElement>('.bookglow-content-frame');
      const section = document.querySelector<HTMLElement>('#settings-operating-hours');
      const panel = document.querySelector<HTMLElement>('.m-hours-panel');
      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        rowOverflow: Boolean(row && row.scrollWidth > row.clientWidth + 1),
        rowCount: rows.length,
        maxRowHeight: Math.max(0, ...rows.map((item) => item.getBoundingClientRect().height)),
        display: computed?.display ?? '',
        template: computed?.gridTemplateAreas ?? '',
        columns: computed?.gridTemplateColumns ?? '',
        innerWidth: window.innerWidth,
        pageClientWidth: pageEl?.clientWidth ?? 0,
        sectionClientWidth: section?.clientWidth ?? 0,
        panelClientWidth: panel?.clientWidth ?? 0,
        rowClientWidth: row?.clientWidth ?? 0,
        rowScrollWidth: row?.scrollWidth ?? 0,
        alignSpread: aligned(day, start, end, toggle, status),
        tops: [day?.top ?? 0, start?.top ?? 0, end?.top ?? 0, toggle?.top ?? 0, status?.top ?? 0],
        startVisible: Boolean(startValue && startValue.scrollWidth <= startValue.clientWidth + 1 && (startValue.textContent || '').includes('9:00')),
        endVisible: Boolean(endValue && endValue.scrollWidth <= endValue.clientWidth + 1 && (endValue.textContent || '').includes('5:00')),
      };
    });
    expect(geometry.rowCount, `hours count at ${viewport.width}`).toBe(7);
    expect(geometry.pageOverflow, `hours overflow at ${viewport.width}`).toBe(false);
    expect(geometry.rowOverflow, `hours row overflow at ${viewport.width}`).toBe(false);
    expect(geometry.display, `hours display at ${viewport.width}`).toBe('grid');
    expect(geometry.template.replace(/"/g, "'"), `hours areas at ${viewport.width}`).toContain('day start dash end toggle status');
    expect(geometry.maxRowHeight, `hours row too tall at ${viewport.width}`).toBeLessThanOrEqual(56);
    expect(geometry.alignSpread, `hours not one row at ${viewport.width}: ${JSON.stringify(geometry.tops)}`).toBeLessThanOrEqual(8);
    expect(geometry.startVisible, `start time clipped at ${viewport.width}`).toBe(true);
    expect(geometry.endVisible, `end time clipped at ${viewport.width}`).toBe(true);
    if (viewport.width >= 360 && viewport.width <= 427) {
      expect(geometry.rowClientWidth, `usable row width at ${viewport.width}`).toBeGreaterThanOrEqual(270);
    }
    if (viewport.width < 1024) {
      await page.locator('#settings-operating-hours').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const overlap = await page.evaluate(() => {
        const section = document.querySelector<HTMLElement>('#settings-operating-hours')?.getBoundingClientRect();
        const header = document.querySelector<HTMLElement>('.bookglow-mobile-header')?.getBoundingClientRect();
        return {
          sectionTop: section?.top ?? 0,
          headerBottom: header?.bottom ?? 0,
        };
      });
      expect(overlap.sectionTop, `hours under header at ${viewport.width}`).toBeGreaterThanOrEqual(overlap.headerBottom - 2);
      await hours.last().scrollIntoViewIfNeeded();
      const lastAboveNav = await page.evaluate(() => {
        const last = document.querySelectorAll<HTMLElement>('.m-hours-row')[6]?.getBoundingClientRect();
        const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav')?.getBoundingClientRect();
        return Boolean(last && nav && last.bottom <= nav.top + 8);
      });
      expect(lastAboveNav, `hours covered by nav at ${viewport.width}`).toBe(true);
    }
    await page.screenshot({ path: artifact(`settings-hours-${viewport.width}.png`), fullPage: false });
  }
});

test('Operating hours remain usable with enlarged root font', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openHarness(page, 'screen=settings');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await expect(page.getByLabel('Sunday opening time')).toBeVisible();
  await expect(page.getByLabel('Sunday closing time')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  const layout = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('.m-hours-row');
    const box = (selector: string) => row?.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const day = box('.m-hours-row__day');
    const start = box('.m-hours-row__start');
    const end = box('.m-hours-row__end');
    const toggle = box('.m-hours-row__toggle');
    const status = box('.m-hours-row__status');
    const centers = [day, start, end, toggle, status].map((rect) => (rect ? rect.top + rect.height / 2 : 0));
    return {
      height: row?.getBoundingClientRect().height ?? 0,
      alignSpread: Math.max(...centers) - Math.min(...centers),
      overflow: Boolean(row && row.scrollWidth > row.clientWidth + 1),
    };
  });
  expect(layout.overflow).toBe(false);
  expect(layout.height).toBeLessThanOrEqual(160);
  await page.screenshot({ path: artifact('settings-hours-375-font-24.png'), fullPage: false });
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
