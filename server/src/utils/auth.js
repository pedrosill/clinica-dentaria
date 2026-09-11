const crypto = require('node:crypto');

const SESSION_COOKIE_NAME = 'dentalpro_session';
const CSRF_COOKIE_NAME = 'dentalpro_csrf';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, PASSWORD_KEY_LENGTH);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHash] = String(storedHash || '').split(':');

  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(String(password), salt, PASSWORD_KEY_LENGTH).toString('hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');

  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function verifyCsrfToken(token, expectedToken) {
  if (!token || !expectedToken) return false;

  const actualBuffer = Buffer.from(String(token));
  const expectedBuffer = Buffer.from(String(expectedToken));

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

function parseCookies(cookieHeader = '') {
  return String(cookieHeader)
    .split(';')
    .map((part) => part.trim().split('='))
    .filter(([name, value]) => name && value)
    .reduce((cookies, [name, ...valueParts]) => {
      try {
        cookies[name] = decodeURIComponent(valueParts.join('='));
      } catch {
        cookies[name] = '';
      }
      return cookies;
    }, {});
}

function serializeCsrfCookie(token, { clear = false, secure = false } = {}) {
  const parts = [
    `${CSRF_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
  ];

  if (secure) parts.push('Secure');
  parts.push(`Max-Age=${clear ? 0 : Math.floor(SESSION_DURATION_MS / 1000)}`);
  return parts.join('; ');
}

function serializeSessionCookie(token, { clear = false, secure = false } = {}) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
  ];

  if (secure) parts.push('Secure');
  parts.push(`Max-Age=${clear ? 0 : Math.floor(SESSION_DURATION_MS / 1000)}`);
  return parts.join('; ');
}

module.exports = {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  createCsrfToken,
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  serializeCsrfCookie,
  serializeSessionCookie,
  verifyCsrfToken,
  verifyPassword,
};
