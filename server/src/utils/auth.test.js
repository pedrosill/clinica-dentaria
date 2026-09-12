const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CSRF_COOKIE_NAME,
  createTotpCode,
  createTotpSecret,
  decryptMfaSecret,
  encryptMfaSecret,
  createCsrfToken,
  parseCookies,
  serializeCsrfCookie,
  verifyCsrfToken,
  verifyTotpCode,
} = require('./auth');

test('CSRF tokens are random, comparable in constant time, and serialized as readable cookies', () => {
  const first = createCsrfToken();
  const second = createCsrfToken();

  assert.notEqual(first, second);
  assert.equal(verifyCsrfToken(first, first), true);
  assert.equal(verifyCsrfToken(first, second), false);
  assert.equal(verifyCsrfToken(`${first}x`, first), false);

  const cookie = serializeCsrfCookie(first, { secure: true });
  assert.match(cookie, new RegExp(`^${CSRF_COOKIE_NAME}=`));
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(parseCookies(cookie)[CSRF_COOKIE_NAME], first);
});

test('TOTP accepts the current code once and rejects malformed or replayed codes', () => {
  const secret = createTotpSecret();
  const timestamp = 1_700_000_000_000;
  const code = createTotpCode(secret, timestamp);
  const verification = verifyTotpCode(secret, code, { timestamp });

  assert.equal(typeof verification.step, 'number');
  assert.equal(verifyTotpCode(secret, code, { timestamp, lastUsedStep: verification.step }), null);
  assert.equal(verifyTotpCode(secret, '12345', { timestamp }), null);
  assert.equal(verifyTotpCode(secret, '000000', { timestamp: timestamp + 90_000, window: 0 }), null);
});

test('MFA secrets are encrypted at rest and can be recovered for verification', () => {
  const secret = createTotpSecret();
  const encrypted = encryptMfaSecret(secret);

  assert.notEqual(encrypted, secret);
  assert.match(encrypted, /^enc:v1:/);
  assert.equal(decryptMfaSecret(encrypted), secret);
});
