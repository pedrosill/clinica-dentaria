const prisma = require('../lib/prisma');
const { createUser } = require('../services/authService');
const { NODE_ENV } = require('../config/env');

const DEVELOPMENT_DEFAULTS = {
  email: 'admin@dentalpro.local',
  displayName: 'DentalPro Administrator',
  password: 'DentalProAdmin123!',
};

function getDefaultAdminConfig(env = process.env) {
  const runtimeEnvironment = env.NODE_ENV || NODE_ENV;
  const isDevelopment = runtimeEnvironment === 'development';
  const isExplicitlyEnabled = env.CREATE_DEFAULT_ADMIN === 'true';

  if (!isDevelopment && !isExplicitlyEnabled) {
    return null;
  }

  const password = env.DEFAULT_ADMIN_PASSWORD || (isDevelopment ? DEVELOPMENT_DEFAULTS.password : null);

  if (!password) {
    return null;
  }

  return {
    email: env.DEFAULT_ADMIN_EMAIL || DEVELOPMENT_DEFAULTS.email,
    displayName: env.DEFAULT_ADMIN_NAME || DEVELOPMENT_DEFAULTS.displayName,
    password,
  };
}

async function ensureDefaultAdmin({
  prismaClient = prisma,
  createUserFn = createUser,
  env = process.env,
} = {}) {
  const config = getDefaultAdminConfig(env);

  if (!config) {
    return { created: false, reason: 'disabled' };
  }

  const userCount = await prismaClient.user.count();

  if (userCount > 0) {
    return { created: false, reason: 'users-exist' };
  }

  const user = await createUserFn({
    ...config,
    role: 'admin',
  });

  console.log(`Default administrator ready: ${user.email}`);
  return { created: true, user };
}

module.exports = {
  DEVELOPMENT_DEFAULTS,
  ensureDefaultAdmin,
  getDefaultAdminConfig,
};
