import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 427, height: 952 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
] as const;

test('Shared density tokens stay compact on phones and medium on tablet/desktop', async ({ page }) => {
  test.setTimeout(180_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=settings', { waitUntil: 'domcontentloaded' });
    const metrics = await page.evaluate(() => {
      const toPx = (value: string) => Number.parseFloat(value) || 0;
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const headerInner = document.querySelector<HTMLElement>('.bookglow-mobile-header__inner');
      const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
      const navInner = document.querySelector<HTMLElement>('.bookglow-mobile-nav__inner');
      const input = document.querySelector<HTMLElement>('.m-settings-control');
      const button = document.querySelector<HTMLElement>('.m-btn--md');
      const card = document.querySelector<HTMLElement>('.m-card');
      const navBox = nav?.getBoundingClientRect();
      const navInnerBox = navInner?.getBoundingClientRect();
      return {
        version: root.getPropertyValue('--density-version').trim(),
        mode: root.getPropertyValue('--density-mode').trim(),
        fontBody: toPx(body.fontSize),
        fontPageTitle: toPx(root.getPropertyValue('--font-page-title')),
        controlHeight: toPx(root.getPropertyValue('--control-height')),
        buttonToken: toPx(root.getPropertyValue('--button-height')),
        headerInnerHeight: headerInner?.getBoundingClientRect().height ?? 0,
        navHeight: navBox?.height ?? 0,
        navInnerHeight: navInnerBox?.height ?? 0,
        inputHeight: input?.getBoundingClientRect().height ?? 0,
        buttonHeight: button?.getBoundingClientRect().height ?? 0,
        cardPaddingTop: card ? toPx(getComputedStyle(card).paddingTop) : 0,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(metrics.version, `density version at ${viewport.width}`).toBe('v5');
    expect(metrics.overflow, `page overflow at ${viewport.width}`).toBe(false);
    expect(metrics.fontBody, `body font at ${viewport.width}`).toBeGreaterThanOrEqual(13);
    expect(metrics.fontBody, `body font at ${viewport.width}`).toBeLessThanOrEqual(16);
    if (viewport.width <= 427) {
      expect(metrics.mode, `mode at ${viewport.width}`).toBe('compact');
      expect(metrics.headerInnerHeight, `header inner at ${viewport.width}`).toBeGreaterThanOrEqual(44);
      expect(metrics.headerInnerHeight, `header inner at ${viewport.width}`).toBeLessThanOrEqual(52);
      expect(metrics.navInnerHeight, `nav inner at ${viewport.width}`).toBeGreaterThanOrEqual(52);
      expect(metrics.navInnerHeight, `nav inner at ${viewport.width}`).toBeLessThanOrEqual(60);
      expect(metrics.navHeight, `nav total at ${viewport.width}`).toBeLessThanOrEqual(64);
      expect(metrics.inputHeight, `input at ${viewport.width}`).toBeGreaterThanOrEqual(36);
      expect(metrics.inputHeight, `input at ${viewport.width}`).toBeLessThanOrEqual(46);
      expect(metrics.buttonHeight, `button at ${viewport.width}`).toBeGreaterThanOrEqual(36);
      expect(metrics.buttonHeight, `button at ${viewport.width}`).toBeLessThanOrEqual(46);
      expect(metrics.cardPaddingTop, `card padding at ${viewport.width}`).toBeLessThanOrEqual(16);
      expect(metrics.fontPageTitle).toBeLessThanOrEqual(22);
    } else if (viewport.width === 768) {
      expect(metrics.mode).toBe('medium');
      expect(metrics.headerInnerHeight).toBeGreaterThanOrEqual(48);
      expect(metrics.headerInnerHeight).toBeLessThanOrEqual(56);
      expect(metrics.navInnerHeight).toBeGreaterThanOrEqual(56);
      expect(metrics.navInnerHeight).toBeLessThanOrEqual(64);
      expect(metrics.controlHeight).toBeGreaterThanOrEqual(40);
    } else {
      expect(metrics.mode).toBe('comfortable');
      expect(metrics.buttonToken).toBeGreaterThanOrEqual(36);
    }
    await page.screenshot({ path: artifact(`density-${viewport.width}.png`), fullPage: false });
  }
});

test('More sheet is a uniform 2-column secondary nav', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=settings', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'More pages' }).click();
  const dialog = page.getByRole('dialog', { name: 'More pages' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Bookglow workspace')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.bookglow-more-sheet__grid');
    const tiles = [...document.querySelectorAll<HTMLElement>('.bookglow-more-link')];
    const heights = tiles.map((tile) => Math.round(tile.getBoundingClientRect().height));
    const descriptions = tiles.some((tile) => (tile.textContent || '').split('\n').filter(Boolean).length > 2);
    return {
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      tileCount: tiles.length,
      heightSpread: heights.length ? Math.max(...heights) - Math.min(...heights) : 99,
      minHeight: heights.length ? Math.min(...heights) : 0,
      descriptions,
    };
  });
  expect(geometry.columns).toBe(2);
  expect(geometry.tileCount).toBeGreaterThanOrEqual(6);
  expect(geometry.heightSpread).toBeLessThanOrEqual(2);
  expect(geometry.minHeight).toBeGreaterThanOrEqual(52);
  expect(geometry.descriptions).toBe(false);
  await page.screenshot({ path: artifact('more-sheet-390.png'), fullPage: false });
});

test('Desktop utility shows outlet context instead of a second page title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=settings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bookglow-sidebar')).toBeVisible();
  await expect(page.locator('.bookglow-mobile-nav')).toBeHidden();
  const utility = page.locator('.bookglow-desktop-utility');
  await expect(utility.getByRole('heading', { name: 'Fiola' })).toBeVisible();
  await expect(utility.getByText('Live outlet')).toBeVisible();
  await expect(utility.getByRole('heading', { name: 'Settings' })).toHaveCount(0);
});

test('V5 page actions stay compact and metrics share a two-column rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=system', { waitUntil: 'domcontentloaded' });
  const geometry = await page.evaluate(() => {
    const actions = document.querySelector<HTMLElement>('.m-page-actions');
    const buttons = [...(actions?.querySelectorAll<HTMLElement>('.m-btn') ?? [])];
    const rail = document.querySelector<HTMLElement>('.m-metric-rail--grid');
    const chips = document.querySelector<HTMLElement>('.m-filter-chip-row');
    const pageHeader = document.querySelector<HTMLElement>('.m-page-header--app-owned');
    const headerTitle = document.querySelector<HTMLElement>('.m-page-header-main');
    return {
      actionCount: buttons.length,
      actionWidths: buttons.map((button) => button.getBoundingClientRect().width),
      actionHeights: buttons.map((button) => button.getBoundingClientRect().height),
      actionsWidth: actions?.getBoundingClientRect().width ?? 0,
      railColumns: rail ? getComputedStyle(rail).gridTemplateColumns.split(' ').length : 0,
      chipWraps: chips ? chips.scrollHeight > chips.clientHeight + 8 : true,
      headerOwned: Boolean(pageHeader),
      localTitleHidden: headerTitle ? getComputedStyle(headerTitle).display === 'none' : false,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  expect(geometry.overflow).toBe(false);
  expect(geometry.headerOwned).toBe(true);
  expect(geometry.localTitleHidden).toBe(true);
  expect(geometry.actionCount).toBe(2);
  expect(geometry.actionWidths.every((width) => width < geometry.actionsWidth * 0.5)).toBe(true);
  expect(geometry.actionHeights.every((height) => height >= 32 && height <= 46)).toBe(true);
  expect(geometry.railColumns).toBe(2);
  expect(geometry.chipWraps).toBe(false);
  await page.screenshot({ path: artifact('system-v5-390.png'), fullPage: false });
});

test('Staff proof keeps compact actions, a KPI rail, and the first row in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=staff', { waitUntil: 'domcontentloaded' });
  const geometry = await page.evaluate(() => {
    const actions = document.querySelector<HTMLElement>('.m-page-actions');
    const buttons = [...(actions?.querySelectorAll<HTMLElement>('.m-btn') ?? [])];
    const rail = document.querySelector<HTMLElement>('.m-metric-rail--rail');
    const firstRow = document.querySelector<HTMLElement>('.m-staff-card');
    const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
    const rowBox = firstRow?.getBoundingClientRect();
    const navTop = nav?.getBoundingClientRect().top ?? window.innerHeight;
    return {
      actionCount: buttons.length,
      actionWidths: buttons.map((button) => button.getBoundingClientRect().width),
      actionHeights: buttons.map((button) => button.getBoundingClientRect().height),
      actionsWidth: actions?.getBoundingClientRect().width ?? 0,
      hasFlex1Hero: Boolean(actions?.querySelector('.flex-1')),
      railHeight: rail?.getBoundingClientRect().height ?? 0,
      rowVisible: Boolean(rowBox && rowBox.top >= 0 && rowBox.bottom <= navTop + 1),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  expect(geometry.overflow).toBe(false);
  expect(geometry.hasFlex1Hero).toBe(false);
  expect(geometry.actionCount).toBe(2);
  expect(geometry.actionWidths.every((width) => width < geometry.actionsWidth * 0.5)).toBe(true);
  expect(geometry.actionHeights.every((height) => height >= 32 && height <= 46)).toBe(true);
  expect(geometry.railHeight).toBeGreaterThan(40);
  expect(geometry.railHeight).toBeLessThanOrEqual(96);
  expect(geometry.rowVisible).toBe(true);
  await page.screenshot({ path: artifact('staff-proof-390.png'), fullPage: false });
});

test('Compact density remains usable with enlarged root font', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=settings', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await page.screenshot({ path: artifact('density-375-font-24.png'), fullPage: false });
});
