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
