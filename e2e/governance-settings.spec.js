import { expect, test } from '@playwright/test';

const admin = {
  email: 'browser.admin@example.test',
  password: 'browser-password-123',
};

async function signIn(page, path) {
  await page.context().clearCookies();
  await page.goto(path);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-email').fill(admin.email);
  await page.getByTestId('login-password').fill(admin.password);
  await page.getByTestId('login-submit').click();
}

test('creates and deactivates a receptionist from Settings', async ({ page }) => {
  await signIn(page, '/settings');
  await expect(page.getByRole('heading', { name: 'User management', exact: true })).toBeVisible();

  const uniqueEmail = `browser.receptionist.${Date.now()}@example.test`;
  const displayName = 'Browser Test Receptionist';
  const userRow = page.locator('tbody tr').filter({ hasText: uniqueEmail });

  await page.getByLabel('Display name', { exact: true }).fill(displayName);
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail);
  await page.locator('select[name="role"]').selectOption('receptionist');
  await page.locator('input[name="password"]').fill('browser-receptionist-password');
  await page.getByRole('button', { name: 'Create user', exact: true }).click();

  await expect(userRow).toContainText(displayName);
  await expect(userRow).toContainText('Receptionist');
  await expect(userRow).toContainText('Active');

  await userRow.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(userRow).toContainText('Inactive');
  await expect(userRow.getByRole('button', { name: 'Activate', exact: true })).toBeVisible();
});

test('records patient consent and exposes the JSON export', async ({ page }) => {
  await signIn(page, '/patients');
  await expect(page.getByRole('heading', { name: 'Patients', exact: true })).toBeVisible();

  await page.getByPlaceholder('Search all patients by name, phone, email or NIF').fill('Browser Test Patient');
  await page.getByRole('link', { name: 'Open patient', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Patient data governance', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download JSON export', exact: true })).toBeVisible();

  const purpose = `Browser test consent ${Date.now()}`;
  await page.getByLabel('Purpose', { exact: true }).fill(purpose);
  await page.getByLabel('Version', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Record consent', exact: true }).click();

  await expect(page.getByText('Consent recorded.', { exact: true })).toBeVisible();
  const history = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Patient data governance', exact: true }) });
  await expect(history).toContainText('Consent history');
  await expect(history).toContainText(purpose);
  await expect(history).toContainText('Granted');
});
