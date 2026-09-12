import { expect, test } from '@playwright/test';

async function selectAppDropdown(page, testId, optionName) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

test('creates and contacts a waitlist entry', async ({ page }) => {
  await page.goto('/waitlist');
  await page.getByTestId('login-user').click();
  await page.getByRole('option', { name: /Browser Test Admin.*Administrator/ }).click();
  await page.getByTestId('login-password').fill('browser-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/waitlist$/);
  await expect(page.getByTestId('waitlist-create-form')).toBeVisible();
  await selectAppDropdown(page, 'waitlist-patient', 'Browser Test Patient');
  await page.getByTestId('waitlist-requested-date').fill('2099-12-01');
  await page.getByTestId('waitlist-reason').fill('Cancellation slot');
  await page.getByTestId('waitlist-submit').click();
  await expect(page.getByText('Cancellation slot', { exact: true })).toBeVisible();
  const statusControl = page.locator('[data-testid^="waitlist-status-"]').first();
  await statusControl.click();
  await page.getByRole('option', { name: 'Contacted', exact: true }).click();
  await expect(statusControl).toContainText('Update');
  const queue = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Waitlist queue', exact: true }) });
  await expect(queue.getByText('Contacted', { exact: true })).toBeVisible();
});
