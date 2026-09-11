const authService = require('../services/authService');

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

module.exports = {
  requireAuth,
  requireRole,
};
