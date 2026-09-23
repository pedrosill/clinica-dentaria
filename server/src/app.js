const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const {
  CLIENT_ORIGINS,
  LOCAL_ONLY,
  NODE_ENV,
  TRUST_PROXY,
} = require('./config/env');
const prisma = require('./lib/prisma');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const {
  CSRF_COOKIE_NAME,
  createCsrfToken,
  parseCookies,
  serializeCsrfCookie,
  verifyCsrfToken,
} = require('./utils/auth');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

  if (NODE_ENV === 'production' && !LOCAL_ONLY) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return next();
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || CLIENT_ORIGINS.includes(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getRefererOrigin(referer) {
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function rejectRequest(res, message) {
  return res.status(403).json({ message });
}

function validateRequestOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  const refererOrigin = getRefererOrigin(referer);
  const requestOrigins = [origin, refererOrigin].filter(Boolean);

  if (origin === 'null' || (origin && !CLIENT_ORIGINS.includes(origin))) {
    return rejectRequest(res, 'Request origin is not allowed');
  }

  if (refererOrigin && !CLIENT_ORIGINS.includes(refererOrigin)) {
    return rejectRequest(res, 'Request referer is not allowed');
  }

  if (referer && !refererOrigin) {
    return rejectRequest(res, 'Request referer is invalid');
  }

  if (requestOrigins.length > 1 && new Set(requestOrigins).size !== 1) {
    return rejectRequest(res, 'Origin and referer do not match');
  }

  if (NODE_ENV === 'production' && requestOrigins.length === 0) {
    return rejectRequest(res, 'Origin or referer is required');
  }

  return next();
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.path.startsWith('/api/public/appointment-confirmations/') || req.path.startsWith('/api/public/privacy-notices/')) return next();

  const cookies = parseCookies(req.headers.cookie);
  const requestToken = req.get('x-csrf-token');

  if (!verifyCsrfToken(requestToken, cookies[CSRF_COOKIE_NAME])) {
    return rejectRequest(res, 'CSRF validation failed');
  }

  return next();
}

app.use(validateRequestOrigin);
app.use(csrfProtection);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready' });
  } catch (error) {
    return next(error);
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'DentalPro API is running',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
