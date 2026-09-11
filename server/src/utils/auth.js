const crypto = require('node:crypto');

const SESSION_COOKIE_NAME = 'dentalpro_session';
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
      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
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
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  serializeSessionCookie,
  verifyPassword,
};
