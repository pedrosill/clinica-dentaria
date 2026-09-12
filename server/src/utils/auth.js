const crypto = require('node:crypto');

const SESSION_COOKIE_NAME = 'dentalpro_session';
const CSRF_COOKIE_NAME = 'dentalpro_csrf';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MFA_CHALLENGE_DURATION_MS = 5 * 60 * 1000;
const PASSWORD_RECOVERY_DURATION_MS = 30 * 60 * 1000;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
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

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function encodeBase32(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value) {
  const normalized = String(value || '').replace(/[\s-]/g, '').toUpperCase();
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) return null;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let buffer = 0;
  const output = [];

  for (const character of normalized) {
    buffer = (buffer << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function createTotpSecret() {
  return encodeBase32(crypto.randomBytes(20));
}

function createTotpCode(secret, timestamp = Date.now()) {
  const key = decodeBase32(secret);
  if (!key) throw new Error('Invalid TOTP secret');

  const counter = Math.floor(Number(timestamp) / 1000 / TOTP_PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binaryCode % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

function verifyTotpCode(secret, code, { timestamp = Date.now(), window = 1, lastUsedStep = null } = {}) {
  const normalizedCode = String(code || '').trim();
  if (!/^\d{6}$/.test(normalizedCode)) return null;

  const currentStep = Math.floor(Number(timestamp) / 1000 / TOTP_PERIOD_SECONDS);
  for (let offset = -Math.max(0, Number(window) || 0); offset <= Math.max(0, Number(window) || 0); offset += 1) {
    const step = currentStep + offset;
    if (step < 0 || (lastUsedStep !== null && step <= Number(lastUsedStep))) continue;

    const expected = createTotpCode(secret, step * TOTP_PERIOD_SECONDS * 1000);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(normalizedCode);
    if (crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return { step };
  }

  return null;
}

function getMfaEncryptionKey() {
  const configuredKey = process.env.MFA_ENCRYPTION_KEY || process.env.AUTH_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!configuredKey && process.env.NODE_ENV === 'production') {
    throw new Error('MFA_ENCRYPTION_KEY is required in production');
  }

  return crypto.createHash('sha256')
    .update(String(configuredKey || 'dentalpro-development-mfa-key'))
    .digest();
}

function encryptMfaSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMfaEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(secret)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptMfaSecret(value) {
  const serialized = String(value || '');
  if (!serialized.startsWith('enc:v1:')) return serialized;

  const [, version, ivValue, tagValue, encryptedValue] = serialized.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new Error('Invalid MFA secret');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getMfaEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function createTotpOtpAuthUri({ secret, accountName, issuer = 'DentalPro' }) {
  const label = `${issuer}:${accountName}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
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
  MFA_CHALLENGE_DURATION_MS,
  PASSWORD_RECOVERY_DURATION_MS,
  TOTP_PERIOD_SECONDS,
  TOTP_DIGITS,
  createCsrfToken,
  createOpaqueToken,
  createSessionToken,
  createTotpCode,
  createTotpOtpAuthUri,
  createTotpSecret,
  decryptMfaSecret,
  encryptMfaSecret,
  getSessionExpiry,
  hashPassword,
  hashOpaqueToken,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  serializeCsrfCookie,
  serializeSessionCookie,
  verifyTotpCode,
  verifyCsrfToken,
  verifyPassword,
};
