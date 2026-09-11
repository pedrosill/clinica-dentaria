const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const databaseFilename = `dentalpro-auth-${Date.now()}-${process.pid}.db`;
const databasePath = path.join(serverRoot, 'prisma', databaseFilename);
process.env.DATABASE_URL = `file:./${databaseFilename}`;

const migrations = [
  '20260528011229_init_refreshed',
  '20260911153000_add_authentication',
  '20260911170000_add_clinic_settings',
  '20260911190000_add_clinical_records',
  '20260911200000_add_clinic_language',
  '20260911210000_add_authorization_scope_and_archiving',
  '20260911220000_add_data_governance',
];
const database = new Database(databasePath);
migrations.forEach((migration) => database.exec(fs.readFileSync(path.join(serverRoot, 'prisma', 'migrations', migration, 'migration.sql'), 'utf8')));
database.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');

let server;
let baseUrl;
let csrfCookie;
let csrfToken;
let user;

function cookieValue(setCookie) {
  return setCookie.split(';')[0];
}

async function request(pathname, options = {}, sessionCookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `${csrfCookie}; ${sessionCookie}` } : { Cookie: csrfCookie }),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(password) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user.email, password }),
  });
  assert.equal(result.response.status, 200);
  return cookieValue(result.response.headers.get('set-cookie'));
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  user = await prisma.user.create({
    data: {
      email: `auth.integration.${suffix}@example.test`,
      displayName: 'Auth Integration User',
      passwordHash: hashPassword('current-password-123'),
      role: 'receptionist',
    },
  });
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  csrfToken = (await csrfResponse.json()).csrfToken;
  csrfCookie = cookieValue(csrfResponse.headers.get('set-cookie'));
});

test.after(async () => {
  await prisma.$disconnect();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(databasePath, { force: true });
});

test('password change is protected, validates policy, and revokes other sessions', async () => {
  const firstSession = await login('current-password-123');
  const secondSession = await login('current-password-123');

  const wrongCurrent = await request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'new-password-123' }),
  }, firstSession);
  assert.equal(wrongCurrent.response.status, 401);

  const shortPassword = await request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'current-password-123', newPassword: 'too-short' }),
  }, firstSession);
  assert.equal(shortPassword.response.status, 400);

  const samePassword = await request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'current-password-123', newPassword: 'current-password-123' }),
  }, firstSession);
  assert.equal(samePassword.response.status, 400);

  const changed = await request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'current-password-123', newPassword: 'new-password-123' }),
  }, firstSession);
  assert.equal(changed.response.status, 200);

  assert.equal((await request('/api/auth/me', {}, firstSession)).response.status, 200);
  assert.equal((await request('/api/auth/me', {}, secondSession)).response.status, 401);
  assert.equal((await login('new-password-123')).length > 0, true);
});

test('password change requires authentication and CSRF', async () => {
  const unauthenticated = await request('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'current-password-123', newPassword: 'new-password-123' }),
  });
  assert.equal(unauthenticated.response.status, 401);

  const session = await login('current-password-123');
  const csrfResponse = await fetch(`${baseUrl}/api/auth/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `${csrfCookie}; ${session}` },
    body: JSON.stringify({ currentPassword: 'current-password-123', newPassword: 'new-password-123' }),
  });
  assert.equal(csrfResponse.status, 403);
});
