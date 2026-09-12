import { expect, test } from '@playwright/test';

async function selectAppDropdown(page, testId, optionName) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

test('creates and updates a patient recall', async ({ page }) => {
  await page.goto('/recalls');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-user').click();
  await page.getByRole('option', { name: /Browser Test Admin.*Administrator/ }).click();
  await page.getByTestId('login-password').fill('browser-password-123');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('recall-create-form')).toBeVisible();

  await selectAppDropdown(page, 'recall-patient', 'Browser Test Patient');
  await page.getByTestId('recall-due-date').fill('2099-11-20');
  await page.getByTestId('recall-reason').fill('Six-month recall');
  await page.getByTestId('recall-submit').click();
  await expect(page.getByText('Six-month recall', { exact: true })).toBeVisible();

  const statusControl = page.locator('[data-testid^="recall-status-"]').first();
  await statusControl.click();
  await page.getByRole('option', { name: 'Scheduled', exact: true }).click();
  await expect(page.locator('span').filter({ hasText: /^Scheduled$/ }).first()).toBeVisible();
});
