import { expect, test } from '@playwright/test';

async function selectAppDropdown(page, testId, optionName) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

const admin = {
  password: 'browser-password-123',
};

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

async function signIn(page, path) {
  await page.context().clearCookies();
  await page.goto(path);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-user').click();
  await page.getByRole('option', { name: /Browser Test Admin.*Administrator/ }).click();
  await page.getByTestId('login-password').fill(admin.password);
  await page.getByTestId('login-submit').click();
}

test('creates and deactivates a receptionist from Settings', async ({ page }) => {
  await signIn(page, '/settings');
  await page.getByRole('tab', { name: 'Team', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User management', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit user management', exact: true }).click();

  const uniqueEmail = `browser.receptionist.${Date.now()}@example.test`;
  const displayName = 'Browser Test Receptionist';
  const userRow = page.locator('tbody tr').filter({ hasText: uniqueEmail });

  await page.getByLabel('Display name', { exact: true }).fill(displayName);
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail);
  await selectAppDropdown(page, 'select-role', 'Receptionist');
  await page.locator('input[name="password"]').fill('browser-receptionist-password');
  await page.getByRole('button', { name: 'Create user', exact: true }).click();

  await expect(userRow).toContainText(displayName);
  await expect(userRow).toContainText('Receptionist');
  await expect(userRow).toContainText('Active');

  const updatedEmail = `browser.receptionist.updated.${Date.now()}@example.test`;
  await userRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Updated Browser Receptionist');
  await page.getByLabel('Email', { exact: true }).fill(updatedEmail);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();

  const updatedUserRow = page.locator('tbody tr').filter({ hasText: updatedEmail });
  await expect(updatedUserRow).toContainText('Updated Browser Receptionist');
  await expect(updatedUserRow).toContainText('Receptionist');

  await updatedUserRow.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(updatedUserRow).toContainText('Inactive');
  await expect(updatedUserRow.getByRole('button', { name: 'Activate', exact: true })).toBeVisible();
});

test('creates a dentist account with scoped agenda and follow-up workflow', async ({ page }) => {
  await signIn(page, '/settings');
  await page.getByRole('tab', { name: 'Team', exact: true }).click();
  await page.getByRole('button', { name: 'Edit user management', exact: true }).click();

  const dentistEmail = `browser.dentist.${Date.now()}@example.test`;
  await page.getByLabel('Display name', { exact: true }).fill('Browser Test Dentist');
  await page.getByLabel('Email', { exact: true }).fill(dentistEmail);
  await selectAppDropdown(page, 'select-role', 'Dentist');
  await selectAppDropdown(page, 'select-linked-doctor', 'Browser Test Doctor');
  await page.locator('input[name="password"]').fill('browser-dentist-password');
  await page.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(page.getByText('Browser Test Dentist', { exact: true })).toBeVisible();

  const initialDate = formatDateInput(addDays(new Date(), 5));
  await page.goto('/agenda');
  await page.getByTestId('add-appointment').click();
  const modal = page.getByTestId('appointment-modal');
  await modal.getByTestId('appointment-patient').click();
  await modal.getByRole('button', { name: /Browser Test Patient/ }).first().click();
  await modal.getByTestId('appointment-doctor').click();
  await modal.getByRole('button', { name: /Browser Test Doctor/ }).click();
  await modal.getByTestId('appointment-date-toggle').click();
  await modal.getByTestId(`appointment-date-${initialDate}`).click();
  await modal.getByTestId('select-time').click();
  await modal.getByRole('option', { name: '09:00 · Free' }).click();
  await modal.getByTestId('appointment-submit').click();
  await expect(modal).toBeHidden();

  await page.context().clearCookies();
  await page.goto(`/agenda?date=${initialDate}`);
  await expect(page).toHaveURL(/\/login/);
  await page.getByTestId('login-user').click();
  await page.getByRole('option', { name: /Browser Test Dentist.*Dentist/ }).click();
  await page.getByTestId('login-password').fill('browser-dentist-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  const doctorFilter = page.getByTestId('agenda-doctor-filter');
  await expect(doctorFilter).toBeEnabled();
  await expect(doctorFilter).toHaveText('All doctors');
  await page.getByRole('link', { name: 'Open appointment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit appointment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reschedule', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit appointment', exact: true }).click();
  await page.locator('textarea').fill('Updated by assigned dentist');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText('Appointment updated successfully.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  const rescheduleModal = page.getByTestId('reschedule-modal');
  await rescheduleModal.getByRole('button', { name: 'Next day', exact: true }).click();
  await rescheduleModal.getByRole('button', { name: /^09:00\b/ }).click();
  await rescheduleModal.getByRole('button', { name: 'Save reschedule', exact: true }).click();

  await page.getByRole('link', { name: 'Open appointment', exact: true }).click();
  await page.getByRole('button', { name: 'Conclude Appointment', exact: true }).click();
  const concludeModal = page.getByRole('dialog');
  await concludeModal.getByText('Finish and continue to reschedule', { exact: true }).click();
  await concludeModal.getByRole('button', { name: 'Complete Appointment', exact: true }).click();

  const followUpModal = page.getByTestId('reschedule-modal');
  await expect(followUpModal).toBeVisible();
  await expect(followUpModal.getByRole('heading', { name: 'Schedule follow-up appointment', exact: true })).toBeVisible();
  await followUpModal.getByRole('button', { name: /^09:00\b/ }).click();
  await followUpModal.getByRole('button', { name: 'Save follow-up appointment', exact: true }).click();
  await expect(page).toHaveURL(/\/agenda\?date=/);
});

test('records patient consent and exposes the JSON export', async ({ page }) => {
  await signIn(page, '/patients');
  await expect(page.getByRole('heading', { name: 'Patients', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Search patients', exact: true }).click();
  await page.getByPlaceholder('Search all patients by name, phone, email or NIF').fill('Browser Test Patient');
  await page.getByRole('link', { name: 'Open patient', exact: true }).first().click();
  await page.getByRole('tab', { name: 'Operations', exact: true }).click();
  await page.getByRole('button', { name: /Patient data governance/ }).click();
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
