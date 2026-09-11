const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEVELOPMENT_DEFAULTS,
  ensureDefaultAdmin,
  getDefaultAdminConfig,
} = require('./defaultAdmin');

test('development startup configures the documented default administrator', () => {
  assert.deepEqual(getDefaultAdminConfig({}), DEVELOPMENT_DEFAULTS);
});

test('default administrator is created only when no users exist', async () => {
  const calls = [];
  const fakePrisma = { user: { count: async () => 0 } };
  const createUserFn = async (data) => {
    calls.push(data);
    return { email: data.email };
  };

  const result = await ensureDefaultAdmin({
    prismaClient: fakePrisma,
    createUserFn,
    env: {},
  });

  assert.equal(result.created, true);
  assert.deepEqual(calls, [{ ...DEVELOPMENT_DEFAULTS, role: 'admin' }]);
});

test('default administrator is not duplicated when a user already exists', async () => {
  let createCalled = false;
  const result = await ensureDefaultAdmin({
    prismaClient: { user: { count: async () => 1 } },
    createUserFn: async () => {
      createCalled = true;
      return { email: 'unexpected@example.test' };
    },
    env: {},
  });

  assert.deepEqual(result, { created: false, reason: 'users-exist' });
  assert.equal(createCalled, false);
});

test('production startup provisioning is disabled even when explicitly requested', async () => {
  assert.equal(
    getDefaultAdminConfig({ NODE_ENV: 'production', CREATE_DEFAULT_ADMIN: 'true' }),
    null
  );

  await assert.rejects(
    ensureDefaultAdmin({
      prismaClient: { user: { count: async () => 0 } },
      createUserFn: async () => ({ email: 'unexpected@example.test' }),
      env: {
        NODE_ENV: 'production',
        CREATE_DEFAULT_ADMIN: 'true',
        DEFAULT_ADMIN_PASSWORD: 'a-production-password',
      },
    }),
    /disabled in production/
  );
});
