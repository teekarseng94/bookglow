import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

/** Viewport matrix requested for Phase 5 (audit §11). */
const viewports = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const;

const phoneViewports = viewports.filter((item) => item.width < 600);
const tabletChrome = viewports.filter((item) => item.width >= 600 && item.width < 1024);

type HarnessScreen = 'staff' | 'settings' | 'system' | 'pos' | 'inventory' | 'sales';

async function openUx(page: import('@playwright/test').Page, screen: HarnessScreen) {
  await page.goto(`/test/visual/merchant-mobile-ux-harness.html?screen=${screen}`, {
    waitUntil: 'domcontentloaded',
  });
}

async function openFinance(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/finance-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Cashflow Overview' })).toBeVisible({
    timeout: 30_000,
  });
}

function pageOverflow() {
  return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
}

function duplicateHeaderState() {
  const shell = document.querySelector<HTMLElement>('.bookglow-mobile-header');
  const shellTitle = document.querySelector<HTMLElement>('.bookglow-mobile-header__title');
  const shellVisible = Boolean(shell && getComputedStyle(shell).display !== 'none' && (shell.getBoundingClientRect().height || 0) > 0);
  const visibleLocalTitles = [...document.querySelectorAll<HTMLElement>('.m-page-header-main .ui-page-title, .m-page-header-main h1')]
    .filter((el) => {
      const box = el.getBoundingClientRect();
      return box.height > 1 && box.width > 1 && getComputedStyle(el).visibility !== 'hidden';
    })
    .map((el) => (el.textContent || '').trim());
  return {
    shellVisible,
    shellTitle: (shellTitle?.textContent || '').trim(),
    visibleLocalTitles,
  };
}

test('Merchant pages do not overflow across the V5 viewport matrix', async ({ page }) => {
  test.setTimeout(180_000);
  const screens: Array<{ screen: HarnessScreen; shot: string }> = [
    { screen: 'staff', shot: 'qa-staff' },
    { screen: 'settings', shot: 'qa-settings' },
    { screen: 'pos', shot: 'qa-pos' },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const { screen, shot } of screens) {
      await openUx(page, screen);
      expect(await page.evaluate(pageOverflow), `${screen} overflow at ${viewport.width}x${viewport.height}`).toBe(false);
      if (viewport.width === 390 || viewport.width === 768 || viewport.width === 1440) {
        await page.screenshot({ path: artifact(`${shot}-${viewport.width}.png`), fullPage: false });
      }
    }
    await openFinance(page);
    expect(await page.evaluate(pageOverflow), `finance overflow at ${viewport.width}x${viewport.height}`).toBe(false);
  }
});

test('Shell owns the phone/tablet title; local page H1 stays hidden', async ({ page }) => {
  test.setTimeout(120_000);
  const cases: Array<{ screen: HarnessScreen; title: RegExp }> = [
    { screen: 'staff', title: /staff/i },
    { screen: 'settings', title: /settings/i },
    { screen: 'system', title: /staff/i },
    { screen: 'pos', title: /pos|point of sale/i },
    { screen: 'inventory', title: /menu/i },
    { screen: 'sales', title: /sales|transaction/i },
  ];
  for (const viewport of [...phoneViewports, ...tabletChrome]) {
    await page.setViewportSize(viewport);
    for (const { screen, title } of cases) {
      await openUx(page, screen);
      const state = await page.evaluate(duplicateHeaderState);
      expect(state.shellVisible, `shell hidden on ${screen} at ${viewport.width}`).toBe(true);
      expect(state.shellTitle, `shell title on ${screen} at ${viewport.width}`).toMatch(title);
      expect(state.visibleLocalTitles, `duplicate H1 on ${screen} at ${viewport.width}`).toEqual([]);
    }
  }
});

test('Compact actions and chips keep a 44px hit without 48px-tall heroes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUx(page, 'staff');
  const geometry = await page.evaluate(() => {
    const read = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      const after = getComputedStyle(el, '::after');
      return {
        visualHeight: box.height,
        visualWidth: box.width,
        hitHeight: Math.max(box.height, Number.parseFloat(after.height) || 0),
      };
    };
    const actions = document.querySelector<HTMLElement>('.m-page-actions');
    const buttons = [...(actions?.querySelectorAll<HTMLElement>('.m-btn') ?? [])];
    const navItem = document.querySelector<HTMLElement>('.bookglow-mobile-nav-item');
    const chip = document.querySelector<HTMLElement>('.m-filter-chip');
    const chipAfter = chip ? getComputedStyle(chip, '::after') : null;
    return {
      actionCount: buttons.length,
      actionWidths: buttons.map((button) => button.getBoundingClientRect().width),
      actionsWidth: actions?.getBoundingClientRect().width ?? 0,
      hasFlex1: Boolean(actions?.querySelector('.flex-1')),
      add: read('.m-page-actions .m-btn--sm'),
      chipHit: chipAfter ? Number.parseFloat(chipAfter.height) || 0 : 0,
      chipVisual: chip?.getBoundingClientRect().height ?? 0,
      navHeight: navItem?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(geometry.hasFlex1).toBe(false);
  expect(geometry.actionCount).toBe(2);
  expect(geometry.actionWidths.every((width) => width < geometry.actionsWidth * 0.5)).toBe(true);
  expect(geometry.add?.visualHeight).toBeGreaterThanOrEqual(32);
  expect(geometry.add?.visualHeight).toBeLessThanOrEqual(46);
  expect(geometry.add?.hitHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.chipVisual).toBeLessThanOrEqual(44);
  expect(geometry.chipHit).toBeGreaterThanOrEqual(44);
  expect(geometry.navHeight).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: artifact('qa-staff-hit-390.png'), fullPage: false });
});

test('Finance phone actions stay compact and the shell owns Finance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFinance(page);
  const geometry = await page.evaluate(() => {
    const header = duplicateHeaderState();
    const actions = document.querySelector<HTMLElement>('.m-page-actions');
    const buttons = [...(actions?.querySelectorAll<HTMLElement>('.m-btn') ?? [])];
    return {
      ...header,
      actionCount: buttons.length,
      actionWidths: buttons.map((button) => button.getBoundingClientRect().width),
      actionsWidth: actions?.getBoundingClientRect().width ?? 0,
      hasFlex1: Boolean(actions?.querySelector('.flex-1')),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };

    function duplicateHeaderState() {
      const shell = document.querySelector<HTMLElement>('.bookglow-mobile-header');
      const shellTitle = document.querySelector<HTMLElement>('.bookglow-mobile-header__title');
      const shellVisible = Boolean(shell && getComputedStyle(shell).display !== 'none' && (shell.getBoundingClientRect().height || 0) > 0);
      const visibleLocalTitles = [...document.querySelectorAll<HTMLElement>('.m-page-header-main .ui-page-title, .m-page-header-main h1')]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.height > 1 && box.width > 1;
        })
        .map((el) => (el.textContent || '').trim());
      return {
        shellVisible,
        shellTitle: (shellTitle?.textContent || '').trim(),
        visibleLocalTitles,
      };
    }
  });

  expect(geometry.overflow).toBe(false);
  expect(geometry.shellVisible).toBe(true);
  expect(geometry.shellTitle).toMatch(/finance/i);
  expect(geometry.visibleLocalTitles).toEqual([]);
  expect(geometry.hasFlex1).toBe(false);
  expect(geometry.actionCount).toBe(2);
  expect(geometry.actionWidths.every((width) => width < geometry.actionsWidth * 0.5)).toBe(true);
  await page.screenshot({ path: artifact('qa-finance-390.png'), fullPage: false });
});

test('Desktop utility is outlet context at 1440×900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openUx(page, 'settings');
  await expect(page.locator('#bookglow-sidebar')).toBeVisible();
  await expect(page.locator('.bookglow-mobile-nav')).toBeHidden();
  const utility = page.locator('.bookglow-desktop-utility');
  await expect(utility.getByRole('heading', { name: 'Fiola' })).toBeVisible();
  await expect(utility.getByText('Live outlet')).toBeVisible();
  await expect(utility.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
  await page.screenshot({ path: artifact('qa-settings-1440x900.png'), fullPage: false });
});

test('Density token version is v5 on the requested matrix', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 412, height: 915 },
    { width: 820, height: 1180 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await openUx(page, 'settings');
    const version = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--density-version').trim());
    expect(version, `density version at ${viewport.width}`).toBe('v5');
    expect(await page.evaluate(pageOverflow), `overflow at ${viewport.width}`).toBe(false);
  }
});
