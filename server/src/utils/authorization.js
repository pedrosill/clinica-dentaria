const HttpError = require('./httpError');

// Keep the role/resource policy in one place. Relationship checks for dentists
// are deliberately performed by the services once the resource is loaded.
const AUTHORIZATION_MATRIX = Object.freeze({
  admin: Object.freeze({
    patient: Object.freeze(['read', 'write', 'archive']),
    doctor: Object.freeze(['read', 'write', 'archive']),
    appointment: Object.freeze(['read', 'schedule', 'status', 'clinicalWrite', 'archive']),
    clinical: Object.freeze(['read', 'write']),
    settings: Object.freeze(['read', 'write']),
    recall: Object.freeze(['read', 'write']),
    waitlist: Object.freeze(['read', 'write']),
    report: Object.freeze(['read']),
  }),
  receptionist: Object.freeze({
    patient: Object.freeze(['read', 'write']),
    doctor: Object.freeze(['read']),
    appointment: Object.freeze(['read', 'schedule', 'status']),
    settings: Object.freeze(['read']),
    recall: Object.freeze(['read', 'write']),
    waitlist: Object.freeze(['read', 'write']),
    report: Object.freeze(['read']),
  }),
  dentist: Object.freeze({
    patient: Object.freeze(['read']),
    doctor: Object.freeze(['read']),
    appointment: Object.freeze(['read', 'schedule', 'status', 'clinicalWrite']),
    clinical: Object.freeze(['read', 'write']),
    settings: Object.freeze(['read']),
    recall: Object.freeze(['read', 'write']),
    waitlist: Object.freeze(['read', 'write']),
    report: Object.freeze(['read']),
  }),
});

function hasPermission(role, resource, action) {
  return Boolean(AUTHORIZATION_MATRIX[role]?.[resource]?.includes(action));
}

function assertPermission(user, resource, action) {
  if (!user || !hasPermission(user.role, resource, action)) {
    throw new HttpError(403, 'You do not have permission for this action');
  }
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
  AUTHORIZATION_MATRIX,
  assertPermission,
  hasPermission,
  requirePermission,
};
