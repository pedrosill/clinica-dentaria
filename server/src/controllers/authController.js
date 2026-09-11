const authService = require('../services/authService');
const { serializeSessionCookie } = require('../utils/auth');

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function isSecureRequest(req) {
  return process.env.NODE_ENV === 'production' || req.secure;
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

async function logout(req, res, next) {
  try {
    await authService.revokeSessionFromRequest(req);
    res.setHeader('Set-Cookie', serializeSessionCookie('', { clear: true, secure: isSecureRequest(req) }));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  logout,
  me,
};
