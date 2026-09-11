const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CSRF_COOKIE_NAME,
  createCsrfToken,
  parseCookies,
  serializeCsrfCookie,
  verifyCsrfToken,
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
