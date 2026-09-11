const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
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
  doctorProfile: {
    select: { id: true },
  },
};

function toPublicUser(user) {
  if (!user) return null;

  const { doctorProfile, passwordHash, ...publicUser } = user;
  return {
    ...publicUser,
    doctorId: doctorProfile?.id || null,
  };
}

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
  }).then(toPublicUser);
}

async function login({ email, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: {
      ...PUBLIC_USER_SELECT,
      passwordHash: true,
    },
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
      ...toPublicUser(user),
    },
  };
}

async function changePassword({ userId, currentPassword, newPassword, sessionToken }) {
  const id = parseNumericId(userId, 'user id');
  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!current || !current.isActive || !verifyPassword(currentPassword, current.passwordHash)) {
    throw new HttpError(401, 'Current password is incorrect');
  }

  if (String(newPassword || '').length < 12) {
    throw new HttpError(400, 'New password must be at least 12 characters');
  }

  if (verifyPassword(newPassword, current.passwordHash)) {
    throw new HttpError(400, 'New password must be different from the current password');
  }

  const currentTokenHash = sessionToken ? hashSessionToken(sessionToken) : null;
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.userSession.updateMany({
      where: {
        userId: id,
        revokedAt: null,
        ...(currentTokenHash ? { tokenHash: { not: currentTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  ]);
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

  return toPublicUser(session.user);
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

async function listUsers() {
  const users = await prisma.user.findMany({
    select: PUBLIC_USER_SELECT,
    orderBy: [{ isActive: 'desc' }, { displayName: 'asc' }],
  });
  return users.map(toPublicUser);
}

async function setUserActive(userId, isActive, actor) {
  const id = parseNumericId(userId, 'user id');
  if (id === Number(actor?.id) && !isActive) {
    throw new HttpError(400, 'An administrator cannot deactivate their own account');
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: PUBLIC_USER_SELECT,
    });
    if (!isActive) await prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return toPublicUser(updated);
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'User not found');
    throw error;
  }
}

module.exports = {
  createUser,
  changePassword,
  getUserFromRequest,
  listUsers,
  login,
  revokeSessionFromRequest,
  setUserActive,
};
