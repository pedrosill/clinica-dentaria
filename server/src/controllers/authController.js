const authService = require('../services/authService');
const { parseCookies, SESSION_COOKIE_NAME } = require('../utils/auth');
const { NODE_ENV } = require('../config/env');
const {
  createCsrfToken,
  serializeCsrfCookie,
  serializeSessionCookie,
} = require('../utils/auth');

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function isSecureRequest(req) {
  return NODE_ENV === 'production' || req.secure;
}

function csrf(req, res) {
  const token = createCsrfToken();
  res.setHeader('Set-Cookie', serializeCsrfCookie(token, { secure: isSecureRequest(req) }));
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ csrfToken: token });
}

async function login(req, res, next) {
  try {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (attempt && now - attempt.startedAt < LOGIN_WINDOW_MS && attempt.count >= MAX_LOGIN_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    }

    const result = await authService.login({
      email: req.body?.email,
      password: req.body?.password,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    req.auditActor = result.user;

    res.setHeader(
      'Set-Cookie',
      serializeSessionCookie(result.token, { secure: isSecureRequest(req) })
    );
    loginAttempts.delete(key);
    return res.json({ user: result.user });
  } catch (error) {
    if (error.statusCode === 401) {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const attempt = loginAttempts.get(key);
      const nextAttempt =
        !attempt || now - attempt.startedAt >= LOGIN_WINDOW_MS
          ? { startedAt: now, count: 1 }
          : { ...attempt, count: attempt.count + 1 };
      loginAttempts.set(key, nextAttempt);
    }
    return next(error);
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

async function changePassword(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  await authService.changePassword({
    userId: req.user.id,
    currentPassword: req.body?.currentPassword,
    newPassword: req.body?.newPassword,
    sessionToken: cookies[SESSION_COOKIE_NAME],
  });
  return res.json({ message: 'Password changed successfully' });
}

async function logout(req, res, next) {
  try {
    req.auditActor = await authService.getUserFromRequest(req);
    await authService.revokeSessionFromRequest(req);
    res.setHeader('Set-Cookie', serializeSessionCookie('', { clear: true, secure: isSecureRequest(req) }));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  csrf,
  changePassword,
  login,
  logout,
  me,
};
