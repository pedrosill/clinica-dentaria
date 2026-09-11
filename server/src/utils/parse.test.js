const assert = require('node:assert/strict');
const test = require('node:test');
const { parseDateOnly } = require('./parse');

test('accepts valid date-only values without changing the calendar day', () => {
  const value = parseDateOnly('2026-10-15', 'appointment date');

  assert.equal(value.getFullYear(), 2026);
  assert.equal(value.getMonth(), 9);
  assert.equal(value.getDate(), 15);
});

test('rejects malformed and impossible date-only values', () => {
  assert.throws(() => parseDateOnly('2026-2-5', 'appointment date'), /Invalid appointment date/);
  assert.throws(() => parseDateOnly('2026-02-30', 'appointment date'), /Invalid appointment date/);
  assert.throws(() => parseDateOnly('2026-13-01', 'appointment date'), /Invalid appointment date/);
});
