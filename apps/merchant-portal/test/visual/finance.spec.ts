import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

async function openFinance(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/finance-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Cashflow Overview' })).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}',
  });
}

test('Finance remains usable across supported responsive sizes', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await openFinance(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const total = page.getByText('Total Expenses').locator('..').locator('p').nth(1);
    await expect(total).toHaveText(/^-RM \d{1,3}(?:,\d{3})*\.\d{2}$/);
  }
});

test('shared mobile shell consumes top and bottom safe-area insets', async ({ page }) => {
  const topInset = 28;
  const bottomInset = 24;

  for (const width of [320, 360, 375, 390, 412, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await openFinance(page);
    await page.evaluate(({ top, bottom }) => {
      document.documentElement.style.setProperty('--safe-top', `${top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
    }, { top: topInset, bottom: bottomInset });

    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.bookglow-mobile-header');
      const headerInner = document.querySelector<HTMLElement>('.bookglow-mobile-header__inner');
      const main = document.querySelector<HTMLElement>('.bookglow-main-scroll');
      const navInner = document.querySelector<HTMLElement>('.bookglow-mobile-nav__inner');
      if (!header || !headerInner || !main || !navInner) throw new Error('Mobile shell is incomplete');
      return {
        header: header.getBoundingClientRect().toJSON(),
        headerInner: headerInner.getBoundingClientRect().toJSON(),
        mainPaddingTop: Number.parseFloat(getComputedStyle(main).paddingTop),
        navInnerBottom: navInner.getBoundingClientRect().bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.headerInner.top).toBeGreaterThanOrEqual(topInset);
    expect(geometry.header.height).toBe(geometry.headerInner.height + topInset);
    expect(geometry.mainPaddingTop).toBe(geometry.header.height);
    expect(geometry.navInnerBottom).toBeLessThanOrEqual(geometry.viewportHeight - bottomInset);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test('captures Finance mobile top, ledger, and details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFinance(page);
  await expect(page.getByRole('img', { name: /Expense trend from/ })).toBeVisible();
  await page.screenshot({ path: artifact('finance-top-mobile-390x844.png') });

  const ledger = page.getByRole('heading', { name: 'Expense Ledger' });
  await ledger.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -72));
  await page.screenshot({ path: artifact('finance-ledger-mobile-390x844.png') });

  const firstExpense = page.locator('article[role="button"]').first();
  if (await firstExpense.count()) {
    await firstExpense.click();
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Expense' })).toHaveCount(0);
    await page.screenshot({ path: artifact('finance-details-mobile-390x844.png') });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toBeHidden();
    await page.getByRole('button', { name: /Delete Cleaning supplies/ }).first().click();
    await expect(page.getByRole('dialog', { name: 'Delete expense?' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toHaveCount(0);
  }
});

test('captures Finance desktop regression view and drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openFinance(page);
  await page.screenshot({ path: artifact('finance-desktop-1440x1000.png') });

  const firstExpense = page.locator('article[role="button"]').first();
  if (await firstExpense.count()) {
    await firstExpense.click();
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toHaveCSS('right', '0px');
  }
});
