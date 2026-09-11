const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidClinicAppointmentTime,
  isValidAppointmentDuration,
} = require('./appointmentUtils');

test('accepts only clinic start times that fit the appointment duration', () => {
  assert.equal(isValidClinicAppointmentTime('08:00', 30), true);
  assert.equal(isValidClinicAppointmentTime('19:30', 30), true);
  assert.equal(isValidClinicAppointmentTime('19:30', 60), false);
  assert.equal(isValidClinicAppointmentTime('07:30', 30), false);
  assert.equal(isValidClinicAppointmentTime('20:00', 30), false);
});

test('requires positive appointment durations in 30-minute increments', () => {
  assert.equal(isValidAppointmentDuration(30), true);
  assert.equal(isValidAppointmentDuration(60), true);
  assert.equal(isValidAppointmentDuration(10), false);
  assert.equal(isValidAppointmentDuration(0), false);
  assert.equal(isValidAppointmentDuration(-30), false);
});
