import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const phoneWidths = [360, 375, 390, 412, 427] as const;

test('Today phone layout matches F12 compact structure', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of phoneWidths) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/test/visual/dashboard-layout-harness.html', { waitUntil: 'domcontentloaded' });
    const metrics = await page.evaluate(() => {
      const actions = document.querySelector<HTMLElement>('[data-testid="m-quick-actions"]');
      const firstAction = actions?.querySelector<HTMLElement>('.m-quick-action');
      const greeting = document.querySelector<HTMLElement>('.dashboard-mobile-topbar h1');
      const kpi = document.querySelector<HTMLElement>('[aria-labelledby="kpi-clients-label"]')
        || document.querySelector<HTMLElement>('.dashboard-kpi-card');
      const expenseIcon = document.querySelector('.m-quick-action lucide-bar-chart-3, .m-quick-action svg.lucide-bar-chart-3');
      const walletIcon = document.querySelector('.m-quick-action svg.lucide-wallet');
      const columns = actions ? getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
      return {
        columns,
        actionHeight: firstAction?.getBoundingClientRect().height ?? 0,
        greetingVisible: greeting ? getComputedStyle(greeting).position === 'absolute' || greeting.classList.contains('sr-only') || getComputedStyle(greeting).clip !== 'auto' : true,
        greetingClass: greeting?.className ?? '',
        kpiHeight: kpi?.getBoundingClientRect().height ?? 0,
        kpiPadding: kpi ? getComputedStyle(kpi).paddingTop : '',
        hasBarChart: Boolean(expenseIcon || document.querySelector('.m-quick-action svg')),
        hasWallet: Boolean(walletIcon),
      };
    });
    expect(metrics.columns, `quick-action columns at ${width}`).toBe(4);
    expect(metrics.actionHeight, `quick-action height at ${width}`).toBeLessThanOrEqual(72);
    expect(metrics.greetingClass).toContain('sr-only');
    expect(metrics.kpiHeight, `kpi height at ${width}`).toBeLessThanOrEqual(110);
    expect(metrics.hasWallet, `Wallet icon must not be used at ${width}`).toBe(false);
    await page.screenshot({ path: artifact(`f12-parity-today-${width}.png`), fullPage: false });
  }
});

test('Account setup consumes compact density tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/visual/merchant-mobile-ux-harness.html?screen=onboarding&step=service-location', { waitUntil: 'domcontentloaded' });
  const metrics = await page.evaluate(() => {
    const title = document.querySelector<HTMLElement>('.merchant-onboarding__content h1');
    const continueBtn = document.querySelector<HTMLElement>('.merchant-onboarding__continue');
    const choice = document.querySelector<HTMLElement>('.merchant-onboarding__choices button');
    return {
      titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0,
      continueHeight: continueBtn?.getBoundingClientRect().height ?? 0,
      choiceHeight: choice?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(metrics.titleSize).toBeGreaterThan(16);
  expect(metrics.titleSize).toBeLessThanOrEqual(24);
  expect(metrics.continueHeight).toBeGreaterThanOrEqual(40);
  expect(metrics.continueHeight).toBeLessThanOrEqual(52);
  expect(metrics.choiceHeight).toBeLessThanOrEqual(88);
  await page.screenshot({ path: artifact('f12-parity-onboarding-390.png'), fullPage: false });
});

test('Opt-in build fingerprint is available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/test/visual/dashboard-layout-harness.html?bg-debug-build=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bg-viewport-probe')).toBeVisible();
  const text = await page.locator('#bg-viewport-probe').innerText();
  expect(text).toContain('BookGlow frontend');
  expect(text).toContain('density: v4');
  expect(text).toMatch(/commit: /);
});
