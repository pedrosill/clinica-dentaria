import { expect, test } from '@playwright/test';

async function selectAppDropdown(page, testId, optionName) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

test('opens operational reports and filters appointments by status', async ({ page }) => {
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-user').click();
  await page.getByRole('option', { name: /Browser Test Admin.*Administrator/ }).click();
  await page.getByTestId('login-password').fill('browser-password-123');
  await page.getByTestId('login-submit').click();

  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page.getByTestId('reports-from')).toBeVisible();
  await expect(page.getByTestId('reports-doctor')).toBeVisible();

  await selectAppDropdown(page, 'reports-status', 'Completed');
  const reportResponse = page.waitForResponse((response) => (
    response.url().includes('/api/reports/appointments')
      && response.url().includes('status=completed')
      && response.status() === 200
  ));
  await page.getByTestId('reports-apply').click();
  await reportResponse;
  await expect(page.getByRole('heading', { name: 'Appointment rows', exact: true })).toBeVisible();
});
