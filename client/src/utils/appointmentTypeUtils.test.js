import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getActiveAppointmentTypes,
  getAppointmentDurationOptions,
  getAppointmentTypeOptions,
} from './appointmentTypeUtils.js';

const configuredTypes = [
  { id: 1, name: 'Initial exam', duration: 30, isActive: true },
  { id: 2, name: 'Cleaning', duration: 60, isActive: true },
  { id: 3, name: 'Old service', duration: 90, isActive: false },
];

test('uses active configured appointment types and excludes archived types', () => {
  assert.deepEqual(getActiveAppointmentTypes(configuredTypes).map((type) => type.name), [
    'Initial exam',
    'Cleaning',
  ]);
  assert.deepEqual(getAppointmentTypeOptions(configuredTypes).map((option) => option.value), [
    'Initial exam',
    'Cleaning',
  ]);
});

test('keeps an existing archived label only as an explicit historical option', () => {
  assert.deepEqual(
    getAppointmentTypeOptions(configuredTypes, 'Old service').map((option) => option.value),
    ['Initial exam', 'Cleaning', 'Old service']
  );
  assert.deepEqual(getAppointmentTypeOptions([]), []);
});

test('derives durations from active types and preserves an existing historical duration', () => {
  assert.deepEqual(getAppointmentDurationOptions(configuredTypes), [
    { value: '30', label: '30 min' },
    { value: '60', label: '60 min' },
  ]);
  assert.deepEqual(getAppointmentDurationOptions(configuredTypes, 90), [
    { value: '30', label: '30 min' },
    { value: '60', label: '60 min' },
    { value: '90', label: '90 min' },
  ]);
});
