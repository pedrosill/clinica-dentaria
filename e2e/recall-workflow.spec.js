import { expect, test } from '@playwright/test';

test('creates and updates a patient recall', async ({ page }) => {
  await page.goto('/recalls');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-user').selectOption({ label: 'Browser Test Admin · Administrator' });
  await page.getByTestId('login-password').fill('browser-password-123');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('recall-create-form')).toBeVisible();

  await page.getByTestId('recall-patient').selectOption({ label: 'Browser Test Patient' });
  await page.getByTestId('recall-due-date').fill('2099-11-20');
  await page.getByTestId('recall-reason').fill('Six-month recall');
  await page.getByTestId('recall-submit').click();
  await expect(page.getByText('Six-month recall', { exact: true })).toBeVisible();

  const statusControl = page.locator('select[data-testid^="recall-status-"]').first();
  await statusControl.selectOption('scheduled');
  await expect(page.locator('span').filter({ hasText: /^Scheduled$/ }).first()).toBeVisible();
});
