const assert = require('node:assert/strict');
const test = require('node:test');
const {
  parseAllowedOrigins,
  parseTrustProxy,
  validateHost,
  validateDatabaseUrl,
} = require('./env');

test('production origins must be explicit HTTPS origins', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://clinic.example,https://admin.example/', { nodeEnv: 'production' }),
    ['https://clinic.example', 'https://admin.example']
  );
  assert.throws(
    () => parseAllowedOrigins('http://localhost:5173', { nodeEnv: 'production' }),
    /HTTPS in production/
  );
  assert.throws(
    () => parseAllowedOrigins('', { nodeEnv: 'production' }),
    /CLIENT_ORIGIN is required/
  );
});

test('local-only production permits loopback HTTP without permitting network origins', () => {
  assert.deepEqual(
    parseAllowedOrigins('http://localhost:5173,http://127.0.0.1:5173', { nodeEnv: 'production', localOnly: true }),
    ['http://localhost:5173', 'http://127.0.0.1:5173']
  );
  assert.throws(
    () => parseAllowedOrigins('http://clinic.local:5173', { nodeEnv: 'production', localOnly: true }),
    /HTTPS in production/
  );
  assert.equal(parseTrustProxy('', { nodeEnv: 'production', localOnly: true }), false);
});

test('production trust proxy configuration rejects broad or hop-count trust', () => {
  assert.equal(parseTrustProxy('loopback', { nodeEnv: 'production' }), 'loopback');
  assert.deepEqual(parseTrustProxy('10.0.0.10,192.0.2.10', { nodeEnv: 'production' }), [
    '10.0.0.10',
    '192.0.2.10',
  ]);
  assert.throws(() => parseTrustProxy('true', { nodeEnv: 'production' }), /must not trust every proxy/);
  assert.throws(() => parseTrustProxy('1', { nodeEnv: 'production' }), /not a hop count/);
  assert.throws(() => parseTrustProxy('not-a-proxy', { nodeEnv: 'production' }), /invalid proxy IP\/CIDR/);
  assert.throws(() => parseTrustProxy('', { nodeEnv: 'production' }), /TRUST_PROXY is required/);
});

test('database configuration remains SQLite-only', () => {
  assert.equal(validateDatabaseUrl('file:./clinic.db', { nodeEnv: 'production' }), 'file:./clinic.db');
  assert.throws(() => validateDatabaseUrl('', { nodeEnv: 'production' }), /DATABASE_URL is required/);
  assert.throws(() => validateDatabaseUrl('postgres://example', { nodeEnv: 'development' }), /SQLite/);
});

test('local-only configuration rejects an exposed host', () => {
  assert.equal(validateHost('127.0.0.1', { localOnly: true }), '127.0.0.1');
  assert.equal(validateHost('::1', { localOnly: true }), '::1');
  assert.equal(validateHost('localhost', { localOnly: true }), 'localhost');
  assert.throws(
    () => validateHost('0.0.0.0', { localOnly: true }),
    /loopback address when LOCAL_ONLY is enabled/
  );
  assert.throws(
    () => validateHost('192.168.1.20', { localOnly: true }),
    /loopback address when LOCAL_ONLY is enabled/
  );
});
