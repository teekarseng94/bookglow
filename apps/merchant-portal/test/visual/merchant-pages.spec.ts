import { expect, test } from '@playwright/test';

const pages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'schedule', path: '/schedule' },
  { name: 'point-of-sale', path: '/pos' },
  { name: 'members', path: '/member' },
  { name: 'services', path: '/menu' },
  { name: 'sales-reports', path: '/sales-reports' },
  { name: 'sales-history', path: '/transactions' },
  { name: 'staff', path: '/staff' },
  { name: 'settings', path: '/settings' },
] as const;

for (const merchantPage of pages) {
  test(`${merchantPage.name} matches its approved design`, async ({ page }) => {
    await page.goto(merchantPage.path, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator('body')).not.toContainText('Loading data from Firestore...', {
      timeout: 30_000,
    });

    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot(`${merchantPage.name}.png`, {
      fullPage: true,
    });
  });
}
