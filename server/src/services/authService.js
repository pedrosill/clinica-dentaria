const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const {
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  SESSION_COOKIE_NAME,
  verifyPassword,
} = require('../utils/auth');

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
};

async function createUser({ email, displayName, password, role = 'receptionist' }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(displayName || '').trim();
  const allowedRoles = new Set(['admin', 'receptionist', 'dentist']);

  if (!normalizedEmail || !normalizedName || String(password || '').length < 12) {
    throw new HttpError(400, 'Email, display name, and a password of at least 12 characters are required');
  }

  if (!allowedRoles.has(role)) {
    throw new HttpError(400, 'Invalid user role');
  }

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      displayName: normalizedName,
      passwordHash: hashPassword(password),
      role,
    },
    select: PUBLIC_USER_SELECT,
  });
}

async function login({ email, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpiry();

  await prisma.$transaction([
    prisma.userSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt,
        userAgent: String(userAgent || '').slice(0, 500) || null,
        ipAddress: String(ipAddress || '').slice(0, 100) || null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
    },
  };
}

async function getUserForSessionToken(token) {
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: PUBLIC_USER_SELECT,
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return session.user;
}

async function getUserFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return getUserForSessionToken(cookies[SESSION_COOKIE_NAME]);
}

async function revokeSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) return;

  await prisma.userSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  createUser,
  getUserFromRequest,
  login,
  revokeSessionFromRequest,
};
