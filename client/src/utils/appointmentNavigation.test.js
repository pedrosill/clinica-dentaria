import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAppointmentReturnState,
  getAppointmentReturnContext,
  getAppointmentReturnPath,
} from './appointmentNavigation.js';

test('preserves the Agenda origin and its query string for appointment detail', () => {
  const state = createAppointmentReturnState(
    { pathname: '/agenda', search: '?date=2026-09-12' },
    'Back to Agenda'
  );

  assert.deepEqual(state, {
    returnTo: {
      pathname: '/agenda',
      search: '?date=2026-09-12',
      labelKey: 'Back to Agenda',
    },
  });
  assert.deepEqual(getAppointmentReturnContext({ state }), state.returnTo);
  assert.equal(getAppointmentReturnPath({ state }), '/agenda?date=2026-09-12');
});

test('falls back to the patients context when an appointment has no known origin', () => {
  assert.deepEqual(getAppointmentReturnContext({ state: null }), {
    pathname: '/patients',
    search: '',
    labelKey: 'Back to patients',
  });
});

test('rejects malformed return context values without breaking navigation', () => {
  assert.deepEqual(getAppointmentReturnContext({
    state: { returnTo: { pathname: 'agenda', search: null, labelKey: '' } },
  }), {
    pathname: '/patients',
    search: '',
    labelKey: 'Back to patients',
  });
});
