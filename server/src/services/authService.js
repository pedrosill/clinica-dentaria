const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const {
  createOpaqueToken,
  createSessionToken,
  createTotpOtpAuthUri,
  createTotpSecret,
  decryptMfaSecret,
  encryptMfaSecret,
  hashOpaqueToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  MFA_CHALLENGE_DURATION_MS,
  normalizeEmail,
  PASSWORD_RECOVERY_DURATION_MS,
  parseCookies,
  SESSION_COOKIE_NAME,
  verifyTotpCode,
  verifyPassword,
} = require('../utils/auth');

const MFA_MAX_ATTEMPTS = 5;
const MFA_ERROR_MESSAGE = 'Invalid MFA challenge or verification code';
const RECOVERY_ERROR_MESSAGE = 'This recovery link is invalid or has expired';
const MIN_RECOVERY_PASSWORD_LENGTH = 8;
const MIN_PASSWORD_LENGTH = 8;

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  doctorProfile: {
    select: { id: true, name: true },
  },
};

function toPublicUser(user) {
  if (!user) return null;

  const {
    doctorProfile,
    passwordHash,
    mfaEnabled,
    mfaSecret,
    mfaLastUsedStep,
    ...publicUser
  } = user;
  return {
    ...publicUser,
    doctorId: doctorProfile?.id || null,
    doctorProfile: doctorProfile ? { id: doctorProfile.id, name: doctorProfile.name } : null,
  };
}

async function createUser({ email, displayName, password, role = 'receptionist', doctorId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(displayName || '').trim();
  const allowedRoles = new Set(['admin', 'receptionist', 'dentist']);

  if (!normalizedEmail || !normalizedName || !String(password || '')) {
    throw new HttpError(400, 'Email, display name, and a password are required');
  }
  if (String(password).length < MIN_PASSWORD_LENGTH) throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

  if (!allowedRoles.has(role)) {
    throw new HttpError(400, 'Invalid user role');
  }

  if (role !== 'dentist' && doctorId !== null && doctorId !== undefined && String(doctorId).trim() !== '') {
    throw new HttpError(400, 'Only dentist accounts can be linked to a doctor profile');
  }

  const normalizedDoctorId = doctorId ? parseNumericId(doctorId, 'doctor id') : null;
  if (role === 'dentist' && !normalizedDoctorId) {
    throw new HttpError(400, 'A dentist account must be linked to a doctor profile');
  }

  if (normalizedDoctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: normalizedDoctorId }, select: { id: true, userId: true } });
    if (!doctor) throw new HttpError(404, 'Doctor not found');
    if (doctor.userId) throw new HttpError(409, 'This doctor profile is already linked to a user');
  }

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        email: normalizedEmail,
        displayName: normalizedName,
        passwordHash: hashPassword(password),
        role,
      },
    });

    if (normalizedDoctorId) {
      await transaction.doctor.update({ where: { id: normalizedDoctorId }, data: { userId: createdUser.id } });
    }

    return transaction.user.findUnique({ where: { id: createdUser.id }, select: PUBLIC_USER_SELECT });
  });

  return toPublicUser(user);
}

async function createAuthenticatedSession({ user, userAgent, ipAddress }, transaction = prisma) {
  const token = createSessionToken();
  const expiresAt = getSessionExpiry();

  await transaction.userSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt,
      userAgent: String(userAgent || '').slice(0, 500) || null,
      ipAddress: String(ipAddress || '').slice(0, 100) || null,
    },
  });

  await transaction.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { token, user: toPublicUser(user) };
}

async function login({ userId, email, password, userAgent, ipAddress }) {
  const normalizedUserId = userId ? parseNumericId(userId, 'user id') : null;
  const user = await prisma.user.findUnique({
    where: normalizedUserId ? { id: normalizedUserId } : { email: normalizeEmail(email) },
    select: {
      ...PUBLIC_USER_SELECT,
      passwordHash: true,
      mfaEnabled: true,
      mfaSecret: true,
      mfaLastUsedStep: true,
    },
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    throw new HttpError(401, 'Invalid user or password');
  }

  if (user.mfaEnabled) {
    if (!user.mfaSecret) throw new HttpError(503, 'MFA is not configured correctly for this account');

    const challengeToken = createOpaqueToken();
    await prisma.mfaChallenge.create({
      data: {
        tokenHash: hashOpaqueToken(challengeToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + MFA_CHALLENGE_DURATION_MS),
      },
    });

    return { mfaRequired: true, challengeToken };
  }

  return createAuthenticatedSession({ user, userAgent, ipAddress });
}

async function incrementMfaAttempts(challengeId) {
  await prisma.mfaChallenge.updateMany({
    where: { id: challengeId, consumedAt: null, attempts: { lt: MFA_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
}

async function verifyMfa({ challengeToken, code, userAgent, ipAddress }) {
  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(challengeToken) },
    include: {
      user: {
        select: {
          ...PUBLIC_USER_SELECT,
          mfaEnabled: true,
          mfaSecret: true,
          mfaLastUsedStep: true,
        },
      },
    },
  });

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt <= new Date() ||
    challenge.attempts >= MFA_MAX_ATTEMPTS ||
    !challenge.user.isActive ||
    !challenge.user.mfaEnabled ||
    !challenge.user.mfaSecret
  ) {
    throw new HttpError(401, MFA_ERROR_MESSAGE);
  }

  let secret;
  try {
    secret = decryptMfaSecret(challenge.user.mfaSecret);
  } catch {
    throw new HttpError(401, MFA_ERROR_MESSAGE);
  }

  const verification = verifyTotpCode(secret, code, { lastUsedStep: challenge.user.mfaLastUsedStep });
  if (!verification) {
    await incrementMfaAttempts(challenge.id);
    throw new HttpError(401, MFA_ERROR_MESSAGE);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const claimedChallenge = await transaction.mfaChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attempts: { lt: MFA_MAX_ATTEMPTS },
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (claimedChallenge.count !== 1) throw new HttpError(401, MFA_ERROR_MESSAGE);

      const markedStep = await transaction.user.updateMany({
        where: {
          id: challenge.user.id,
          isActive: true,
          mfaEnabled: true,
          OR: [
            { mfaLastUsedStep: null },
            { mfaLastUsedStep: { lt: verification.step } },
          ],
        },
        data: { mfaLastUsedStep: verification.step },
      });
      if (markedStep.count !== 1) throw new HttpError(401, MFA_ERROR_MESSAGE);

      return createAuthenticatedSession({
        user: challenge.user,
        userAgent,
        ipAddress,
      }, transaction);
    });
  } catch (error) {
    if (error.statusCode === 401) throw error;
    throw error;
  }
}

async function setupMfa({ userId, currentPassword }) {
  const id = parseNumericId(userId, 'user id');
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new HttpError(401, 'Current password is incorrect');
  }

  const secret = createTotpSecret();
  await prisma.user.update({
    where: { id },
    data: {
      mfaSecret: encryptMfaSecret(secret),
      mfaEnabled: false,
      mfaLastUsedStep: null,
    },
  });

  return {
    secret,
    otpauthUri: createTotpOtpAuthUri({ secret, accountName: user.email }),
  };
}

async function enableMfa({ userId, code }) {
  const id = parseNumericId(userId, 'user id');
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, mfaSecret: true, mfaLastUsedStep: true, mfaEnabled: true, isActive: true },
  });
  if (!user || !user.isActive || !user.mfaSecret) throw new HttpError(400, 'MFA setup has not been started');

  const verification = verifyTotpCode(decryptMfaSecret(user.mfaSecret), code, { lastUsedStep: user.mfaLastUsedStep });
  if (!verification) throw new HttpError(401, 'Invalid MFA verification code');

  const updated = await prisma.user.updateMany({
    where: { id, isActive: true, mfaEnabled: false },
    data: { mfaEnabled: true, mfaLastUsedStep: verification.step },
  });
  if (updated.count !== 1) throw new HttpError(409, 'MFA is already enabled');
}

async function disableMfa({ userId, currentPassword }) {
  const id = parseNumericId(userId, 'user id');
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new HttpError(401, 'Current password is incorrect');
  }

  await prisma.user.update({
    where: { id },
    data: { mfaEnabled: false, mfaSecret: null, mfaLastUsedStep: null },
  });
}

async function requestPasswordRecovery({ email }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { token: null };

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) return { token: null };

  const token = createOpaqueToken();
  const now = new Date();
  await prisma.$transaction([
    prisma.passwordRecoveryToken.updateMany({
      where: { userId: user.id, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.passwordRecoveryToken.create({
      data: {
        tokenHash: hashOpaqueToken(token),
        userId: user.id,
        expiresAt: new Date(now.getTime() + PASSWORD_RECOVERY_DURATION_MS),
      },
    }),
  ]);

  return { token };
}

async function resetPassword({ token, newPassword }) {
  if (!String(newPassword || '') || String(newPassword).length < MIN_RECOVERY_PASSWORD_LENGTH) {
    throw new HttpError(400, `New password must be at least ${MIN_RECOVERY_PASSWORD_LENGTH} characters`);
  }

  const recovery = await prisma.passwordRecoveryToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, revokedAt: true, user: { select: { isActive: true } } },
  });
  const now = new Date();
  if (!recovery || recovery.usedAt || recovery.revokedAt || recovery.expiresAt <= now || !recovery.user.isActive) {
    throw new HttpError(400, RECOVERY_ERROR_MESSAGE);
  }

  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.passwordRecoveryToken.updateMany({
      where: { id: recovery.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new HttpError(400, RECOVERY_ERROR_MESSAGE);

    await transaction.user.update({
      where: { id: recovery.userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    await transaction.userSession.updateMany({
      where: { userId: recovery.userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
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

  if (!String(newPassword || '')) {
    throw new HttpError(400, 'New password is required');
  }
  if (String(newPassword).length < MIN_PASSWORD_LENGTH) throw new HttpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);

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
    prisma.passwordRecoveryToken.updateMany({
      where: { userId: id, usedAt: null, revokedAt: null },
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

async function listLoginUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, role: true },
    orderBy: { displayName: 'asc' },
  });
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

async function updateUser(userId, { email, displayName, role, doctorId }, actor) {
  const id = parseNumericId(userId, 'user id');
  const allowedRoles = new Set(['admin', 'receptionist', 'dentist']);
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(displayName || '').trim();

  if (!normalizedEmail || !normalizedName || !role) {
    throw new HttpError(400, 'Email, display name, and a role are required');
  }
  if (!allowedRoles.has(role)) throw new HttpError(400, 'Invalid user role');
  if (Number(actor?.id) === id && role !== 'admin') {
    throw new HttpError(400, 'An administrator cannot remove their own administrator role');
  }

  if (role !== 'dentist' && doctorId !== null && doctorId !== undefined && String(doctorId).trim() !== '') {
    throw new HttpError(400, 'Only dentist accounts can be linked to a doctor profile');
  }

  const normalizedDoctorId = role === 'dentist' && doctorId !== null && doctorId !== '' && doctorId !== undefined
    ? parseNumericId(doctorId, 'doctor id')
    : null;

  if (role === 'dentist' && !normalizedDoctorId) {
    throw new HttpError(400, 'A dentist account must be linked to a doctor profile');
  }

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const currentUser = await transaction.user.findUnique({
        where: { id },
        select: { id: true, doctorProfile: { select: { id: true } } },
      });
      if (!currentUser) throw new HttpError(404, 'User not found');

      const emailOwner = await transaction.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (emailOwner && emailOwner.id !== id) throw new HttpError(409, 'This email is already in use');

      if (normalizedDoctorId) {
        const doctor = await transaction.doctor.findUnique({
          where: { id: normalizedDoctorId },
          select: { id: true, userId: true },
        });
        if (!doctor) throw new HttpError(404, 'Doctor not found');
        if (doctor.userId && doctor.userId !== id) throw new HttpError(409, 'This doctor profile is already linked to a user');
      }

      if (currentUser.doctorProfile && (role !== 'dentist' || currentUser.doctorProfile.id !== normalizedDoctorId)) {
        await transaction.doctor.update({
          where: { id: currentUser.doctorProfile.id },
          data: { userId: null },
        });
      }

      if (normalizedDoctorId) {
        await transaction.doctor.update({
          where: { id: normalizedDoctorId },
          data: { userId: id },
        });
      }

      return transaction.user.update({
        where: { id },
        data: { email: normalizedEmail, displayName: normalizedName, role },
        select: PUBLIC_USER_SELECT,
      });
    });

    return toPublicUser(updated);
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'This email is already in use');
    if (error?.code === 'P2025') throw new HttpError(404, 'User or doctor not found');
    throw error;
  }
}

module.exports = {
  disableMfa,
  enableMfa,
  createUser,
  changePassword,
  getUserFromRequest,
  listLoginUsers,
  listUsers,
  login,
  requestPasswordRecovery,
  resetPassword,
  revokeSessionFromRequest,
  setupMfa,
  setUserActive,
  updateUser,
  verifyMfa,
};
