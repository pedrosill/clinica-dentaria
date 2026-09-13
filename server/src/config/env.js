const dotenv = require('dotenv');
const net = require('node:net');

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;
const LOCAL_ONLY = ['1', 'true', 'yes'].includes(String(process.env.LOCAL_ONLY || '').trim().toLowerCase());

function isLoopbackHost(value) {
  const host = String(value || '').trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === '::1') return true;

  if (net.isIP(host) === 4) {
    return host.split('.').length === 4 && host.split('.')[0] === '127';
  }

  return false;
}

function validateHost(value, { localOnly = false } = {}) {
  const host = String(value || '127.0.0.1').trim();

  if (!host) {
    throw new Error('HOST must not be empty');
  }

  if (localOnly && !isLoopbackHost(host)) {
    throw new Error('HOST must be a loopback address when LOCAL_ONLY is enabled');
  }

  return host;
}

function isLoopbackOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function parseAllowedOrigins(value, { nodeEnv = NODE_ENV, localOnly = false } = {}) {
  const origins = String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    if (nodeEnv === 'production') {
      throw new Error('CLIENT_ORIGIN is required in production');
    }

    return [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];
  }

  return origins.map((origin) => {
    let parsed;

    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CLIENT_ORIGIN contains an invalid origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, '')) {
      throw new Error(`CLIENT_ORIGIN must contain origins without paths: ${origin}`);
    }

    if (nodeEnv === 'production' && parsed.protocol !== 'https:' && !(localOnly && parsed.protocol === 'http:' && isLoopbackOrigin(parsed.origin))) {
      throw new Error('CLIENT_ORIGIN must use HTTPS in production');
    }

    return parsed.origin;
  });
}

function parseTrustProxy(value, { nodeEnv = NODE_ENV, localOnly = false } = {}) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    if (nodeEnv === 'production' && !localOnly) {
      throw new Error('TRUST_PROXY is required in production and must identify the trusted proxy');
    }

    return false;
  }

  const entries = rawValue.split(',').map((entry) => entry.trim()).filter(Boolean);

  if (entries.some((entry) => ['true', '*', 'yes'].includes(entry.toLowerCase()))) {
    throw new Error('TRUST_PROXY must not trust every proxy; use explicit proxy IPs/CIDRs or loopback');
  }

  if (entries.some((entry) => /^\d+$/.test(entry))) {
    throw new Error('TRUST_PROXY must use explicit proxy IPs/CIDRs, not a hop count');
  }

  const trustedNames = new Set(['loopback', 'linklocal', 'uniquelocal']);
  for (const entry of entries) {
    if (trustedNames.has(entry.toLowerCase())) continue;

    const [address, prefix] = entry.split('/');
    const addressFamily = net.isIP(address);
    const prefixLength = prefix === undefined ? null : Number(prefix);
    const maxPrefixLength = addressFamily === 4 ? 32 : addressFamily === 6 ? 128 : -1;

    if (
      !addressFamily ||
      (prefix !== undefined && (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > maxPrefixLength))
    ) {
      throw new Error(`TRUST_PROXY contains an invalid proxy IP/CIDR: ${entry}`);
    }
  }

  return entries.length === 1 ? entries[0] : entries;
}

function validateDatabaseUrl(value, { nodeEnv = NODE_ENV } = {}) {
  if (!value && nodeEnv === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  if (value && !String(value).startsWith('file:')) {
    throw new Error('DATABASE_URL must use the SQLite file: URL format');
  }

  return value;
}

validateDatabaseUrl(DATABASE_URL);
const CLIENT_ORIGINS = parseAllowedOrigins(process.env.CLIENT_ORIGIN, { localOnly: LOCAL_ONLY });
const TRUST_PROXY = parseTrustProxy(process.env.TRUST_PROXY, { localOnly: LOCAL_ONLY });
const HOST = validateHost(process.env.HOST, { localOnly: LOCAL_ONLY });

module.exports = {
  CLIENT_ORIGIN: CLIENT_ORIGINS[0],
  CLIENT_ORIGINS,
  DATABASE_URL,
  HOST,
  LOCAL_ONLY,
  NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
  TRUST_PROXY,
  parseAllowedOrigins,
  parseTrustProxy,
  validateHost,
  validateDatabaseUrl,
};
