import { expect, test } from '@playwright/test';
import path from 'path';

const artifact = (name: string) => path.join('test', 'visual', 'artifacts', name);

const phoneWidths = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 427, height: 952 },
] as const;

const tabs = ['Details', 'Pricing', 'Availability', 'Media'] as const;

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/test/visual/merchant-responsive-harness.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
}

test('Editor chrome stays compact across phone widths and tabs', async ({ page }) => {
  test.setTimeout(180_000);
  for (const viewport of phoneWidths) {
    await page.setViewportSize(viewport);
    await openEditor(page);
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      const metrics = await page.evaluate(() => {
        const toPx = (value: string) => Number.parseFloat(value) || 0;
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const heading = document.querySelector<HTMLElement>('.m-editor-heading');
        const tabEl = document.querySelector<HTMLElement>('[role="tab"]');
        const input = document.querySelector<HTMLElement>('.m-settings-control:not(textarea)');
        const footer = document.querySelector<HTMLElement>('.m-modal-footer');
        const save = [...document.querySelectorAll<HTMLElement>('button')].find((el) => /save/i.test(el.textContent || ''));
        const body = document.querySelector<HTMLElement>('.m-modal-body');
        const card = document.querySelector<HTMLElement>('.m-editor-card');
        const header = document.querySelector<HTMLElement>('.m-modal-header');
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          titleSize: heading ? toPx(getComputedStyle(heading).fontSize) : 0,
          tabHeight: tabEl?.getBoundingClientRect().height ?? 0,
          inputHeight: input?.getBoundingClientRect().height ?? 0,
          buttonHeight: save?.getBoundingClientRect().height ?? 0,
          footerHeight: footer?.getBoundingClientRect().height ?? 0,
          bodyPad: body ? toPx(getComputedStyle(body).paddingLeft) : 0,
          cardPad: card ? toPx(getComputedStyle(card).paddingTop) : 0,
          headerHeight: header?.getBoundingClientRect().height ?? 0,
          footerOverlapsInput: Boolean(
            input &&
              footer &&
              input.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1,
          ),
          dialogWidth: dialog?.getBoundingClientRect().width ?? 0,
        };
      });
      expect(metrics.overflow, `overflow ${viewport.width} ${tab}`).toBe(false);
      expect(metrics.titleSize, `title ${viewport.width}`).toBeGreaterThanOrEqual(14);
      expect(metrics.titleSize, `title ${viewport.width}`).toBeLessThanOrEqual(18);
      expect(metrics.tabHeight, `tab ${viewport.width}`).toBeGreaterThanOrEqual(32);
      expect(metrics.tabHeight, `tab ${viewport.width}`).toBeLessThanOrEqual(48);
      if (metrics.inputHeight > 0) {
        expect(metrics.inputHeight, `input ${viewport.width} ${tab}`).toBeGreaterThanOrEqual(36);
        expect(metrics.inputHeight, `input ${viewport.width} ${tab}`).toBeLessThanOrEqual(46);
      }
      expect(metrics.buttonHeight, `save ${viewport.width}`).toBeGreaterThanOrEqual(36);
      expect(metrics.buttonHeight, `save ${viewport.width}`).toBeLessThanOrEqual(46);
      expect(metrics.footerHeight, `footer ${viewport.width}`).toBeGreaterThanOrEqual(44);
      expect(metrics.footerHeight, `footer ${viewport.width}`).toBeLessThanOrEqual(72);
      expect(metrics.bodyPad, `body pad ${viewport.width}`).toBeLessThanOrEqual(16);
      expect(metrics.headerHeight, `header ${viewport.width}`).toBeLessThanOrEqual(72);
      expect(metrics.footerOverlapsInput, `footer overlap ${viewport.width} ${tab}`).toBe(false);
      expect(metrics.dialogWidth).toBeGreaterThan(viewport.width - 8);
    }
    await page.screenshot({
      path: artifact(`editor-parity-${viewport.width}.png`),
      fullPage: false,
    });
  }
});

test('Editor remains usable with enlarged root font', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openEditor(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
  await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
});
