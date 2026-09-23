const authService = require('../services/authService');
const { parseCookies, SESSION_COOKIE_NAME } = require('../utils/auth');
const { CLIENT_ORIGIN, LOCAL_ONLY, NODE_ENV } = require('../config/env');
const {
  createCsrfToken,
  serializeCsrfCookie,
  serializeSessionCookie,
} = require('../utils/auth');

function buildDevelopmentRecoveryUrl(token) {
  const configuredBaseUrl = String(process.env.PASSWORD_RECOVERY_BASE_URL || '').trim();
  const baseUrl = configuredBaseUrl || `${CLIENT_ORIGIN}/login`;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

function isSecureRequest(req) {
  return req.secure || (NODE_ENV === 'production' && !LOCAL_ONLY);
}

function csrf(req, res) {
  const token = createCsrfToken();
  res.setHeader('Set-Cookie', serializeCsrfCookie(token, { secure: isSecureRequest(req) }));
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ csrfToken: token });
}

async function login(req, res, next) {
  try {
    const result = await authService.login({
      userId: req.body?.userId,
      email: req.body?.email,
      password: req.body?.password,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    if (result.mfaRequired) {
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ mfaRequired: true, challengeToken: result.challengeToken });
    }

    req.auditActor = result.user;
    res.setHeader('Set-Cookie', serializeSessionCookie(result.token, { secure: isSecureRequest(req) }));
    return res.json({ user: result.user });
  } catch (error) {
    return next(error);
  }
}

async function verifyMfa(req, res, next) {
  try {
    const result = await authService.verifyMfa({
      challengeToken: req.body?.challengeToken,
      code: req.body?.code,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    req.auditActor = result.user;
    res.setHeader('Set-Cookie', serializeSessionCookie(result.token, { secure: isSecureRequest(req) }));
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ user: result.user });
  } catch (error) {
    return next(error);
  }
}

async function setupMfa(req, res) {
  const result = await authService.setupMfa({
    userId: req.user.id,
    currentPassword: req.body?.currentPassword,
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.json(result);
}

async function enableMfa(req, res) {
  await authService.enableMfa({ userId: req.user.id, code: req.body?.code });
  return res.json({ message: 'MFA enabled successfully' });
}

async function disableMfa(req, res) {
  await authService.disableMfa({
    userId: req.user.id,
    currentPassword: req.body?.currentPassword,
  });
  return res.json({ message: 'MFA disabled successfully' });
}

async function requestPasswordRecovery(req, res) {
  const result = await authService.requestPasswordRecovery({ email: req.body?.email });
  res.setHeader('Cache-Control', 'no-store');
  const response = {
    message: 'If an active account matches that email, recovery instructions will be sent shortly.',
  };

  // Email delivery is not configured for the local development profile. Keep the
  // production response generic, but give local operators a usable recovery link.
  if (NODE_ENV !== 'production' && result?.token) {
    response.recoveryUrl = buildDevelopmentRecoveryUrl(result.token);
  }

  return res.status(202).json(response);
}

async function resetPassword(req, res) {
  await authService.resetPassword({
    token: req.body?.token,
    newPassword: req.body?.newPassword,
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ message: 'Password reset successfully' });
}

async function loginUsers(req, res) {
  const users = await authService.listLoginUsers();
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ users });
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
  disableMfa,
  enableMfa,
  login,
  loginUsers,
  logout,
  me,
  requestPasswordRecovery,
  resetPassword,
  setupMfa,
  verifyMfa,
};
