const authService = require('../services/authService');
const { assertPermission } = require('../utils/authorization');

async function requireAuth(req, res, next) {
  try {
    const user = await authService.getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }

    return next();
  };
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    try {
      assertPermission(req.user, resource, action);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
};
