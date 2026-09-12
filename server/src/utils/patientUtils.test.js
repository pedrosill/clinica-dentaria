const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePatientContacts } = require('./patientUtils');

test('accepts Portuguese and international phone formats with a valid email', () => {
  assert.doesNotThrow(() => validatePatientContacts({
    phone: '+351 912-345-678',
    email: 'patient@example.pt',
  }));
});

test('rejects unusable patient contact values', () => {
  assert.throws(
    () => validatePatientContacts({ phone: '123', email: 'patient@example.pt' }),
    /between 7 and 15 digits/
  );
  assert.throws(
    () => validatePatientContacts({ phone: '912345678', email: 'not-an-email' }),
    /email is invalid/
  );
});
