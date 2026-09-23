const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('./app');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('sets baseline security headers and rejects CSRF/origin failures', async () => {
  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthResponse.headers.get('x-frame-options'), 'DENY');
  assert.equal(healthResponse.headers.get('x-powered-by'), null);

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrfToken = (await csrfResponse.json()).csrfToken;
  const csrfCookie = csrfResponse.headers.get('set-cookie').split(';')[0];

  const missingTokenResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: csrfCookie },
    body: '{}',
  });
  assert.equal(missingTokenResponse.status, 403);

  const untrustedOriginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrfCookie,
      'X-CSRF-Token': csrfToken,
      Origin: 'https://untrusted.example',
    },
    body: '{}',
  });
  assert.equal(untrustedOriginResponse.status, 403);

  const publicPrivacyResponse = await fetch(`${baseUrl}/api/public/privacy-notices/not-a-real-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: baseUrl,
      Referer: `${baseUrl}/api/public/privacy-notices/not-a-real-token`,
    },
    body: 'choice=acknowledged',
  });
  assert.equal(publicPrivacyResponse.status, 404);
});
