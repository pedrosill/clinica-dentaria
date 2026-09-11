const assert = require('node:assert/strict');
const test = require('node:test');
const {
  parseAllowedOrigins,
  parseTrustProxy,
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
