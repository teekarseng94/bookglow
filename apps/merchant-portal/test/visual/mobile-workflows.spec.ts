import { expect, test } from '@playwright/test';

test.describe('375px merchant workflows', () => {
  test.skip(
    process.env.VISUAL_MUTATION_TESTS !== '1',
    'Set VISUAL_MUTATION_TESTS=1 to allow test data changes in a dedicated test outlet.',
  );

  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}',
    });
  });

  test('create a walk-in booking', async ({ page }) => {
    await page.goto('/schedule');
    await page.getByRole('button', { name: 'Quick add booking' }).click();
    await expect(page.getByRole('dialog', { name: 'Schedule Treatment' })).toBeVisible();
    await page.getByLabel('Select Client').selectOption('guest');
    const treatments = page.getByLabel('Select Treatment');
    expect((await treatments.locator('option').count())).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Save to Calendar' }).click();
    await expect(page.getByRole('dialog', { name: 'Schedule Treatment' })).toBeHidden();
  });

  test('checkout a sale', async ({ page }) => {
    await page.goto('/pos');
    const addButton = page.getByRole('button', { name: /^Add / }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(page.getByRole('button', { name: 'Complete Sale' })).toBeEnabled();
    await page.getByRole('button', { name: 'Complete Sale' }).click();
    await expect(page.getByText('Sale Complete!')).toBeVisible();
  });

  test('add a member', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    await page.goto('/member');
    await page.getByRole('button', { name: 'Add member' }).click();
    await page.getByLabel('Full Name').fill(`Mobile Test ${suffix}`);
    await page.getByLabel('Phone').fill(`01${suffix}`);
    await page.getByRole('button', { name: 'Complete Registration' }).click();
    await expect(page.getByText(`Mobile Test ${suffix}`)).toBeVisible();
  });

  test('edit a service and receive save confirmation', async ({ page }) => {
    await page.goto('/menu');
    const actions = page.getByRole('button', { name: /^Actions for / }).first();
    await expect(actions).toBeVisible();
    await actions.click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();
  });

  test('filter sales reports', async ({ page }) => {
    await page.goto('/sales-reports');
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
    await page.getByLabel('Category').selectOption('ALL');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden();
  });

  test('save outlet settings', async ({ page }) => {
    await page.goto('/settings');
    const saveButton = page.getByRole('button', { name: 'Save Changes' }).first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.getByText(/Saved|Changes saved/i).first()).toBeVisible();
  });
});
