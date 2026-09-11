import { expect, test } from '@playwright/test';

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

test('creates an appointment, shows it on the dashboard, and reschedules it', async ({ page }) => {
  const oldDate = formatDateInput(addDays(new Date(), 1));
  const newDate = formatDateInput(addDays(new Date(), 3));

  await page.goto('/agenda');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId('login-email').fill('browser.admin@example.test');
  await page.getByTestId('login-password').fill('browser-password-123');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  await page.getByTestId('add-appointment').click();
  const modal = page.getByTestId('appointment-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId('appointment-date-toggle')).toHaveAttribute(
    'aria-expanded',
    'false'
  );

  await modal.getByTestId('appointment-patient').click();
  await modal.getByRole('button', { name: /Browser Test Patient/ }).first().click();
  await modal.getByTestId('appointment-doctor').click();
  await modal.getByRole('button', { name: /Browser Test Doctor/ }).click();

  await modal.getByTestId('appointment-date-toggle').click();
  await modal.getByTestId(`appointment-date-${oldDate}`).click();
  await expect(modal.getByTestId('appointment-date-toggle')).toHaveAttribute(
    'aria-expanded',
    'false'
  );

  await modal.getByTestId('select-time').click();
  await modal.getByRole('option', { name: '09:00 · Free' }).click();
  await modal.getByTestId('appointment-submit').click();
  await expect(modal).toBeHidden();

  await page.goto('/');
  const upcoming = page.locator('section').filter({ hasText: 'Upcoming agenda' });
  await expect(upcoming).toContainText('Browser Test Patient');
  await expect(upcoming).toContainText('09:00');

  await page.goto(`/agenda?date=${oldDate}`);
  await page.getByRole('link', { name: 'Open appointment', exact: true }).click();
  await expect(page).toHaveURL(/\/appointments\/\d+$/);
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();

  const rescheduleModal = page.getByTestId('reschedule-modal');
  await expect(rescheduleModal).toBeVisible();
  await rescheduleModal.getByRole('button', { name: 'Next day', exact: true }).click();
  await rescheduleModal.getByRole('button', { name: 'Next day', exact: true }).click();
  await rescheduleModal.getByRole('button', { name: /^10:00\b/ }).click();
  await rescheduleModal.getByRole('button', { name: 'Save reschedule', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/agenda\\?date=${newDate}$`));
  await expect(page.getByText(/10:00 · Browser Test Patient/)).toBeVisible();

  await page.goto(`/agenda?date=${oldDate}`);
  await expect(page.getByText('No appointments for this day', { exact: true })).toBeVisible();
  await expect(page.getByText('Browser Test Patient', { exact: true })).toHaveCount(0);
});
