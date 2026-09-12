const prisma = require('../lib/prisma');

const MAX_METADATA_BYTES = 8192;
const MAX_DEPTH = 4;
const SENSITIVE_KEY = /(password|token|secret|authorization|cookie|session|credential|clinicalfindings|treatmentperformed|completionnotes)/i;

function sanitizeMetadata(value, depth = 0) {
  if (depth > MAX_DEPTH || value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.slice(0, 300);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeMetadata(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .slice(0, 50)
        .map(([key, item]) => [key.slice(0, 80), sanitizeMetadata(item, depth + 1)])
        .filter(([, item]) => item !== undefined)
    );
  }
  return undefined;
}

function serializeMetadata(metadata) {
  if (metadata === undefined) return null;
  let serialized;
  try {
    serialized = JSON.stringify(sanitizeMetadata(metadata));
  } catch {
    serialized = JSON.stringify({ omitted: true, reason: 'unserializable' });
  }
  if (serialized === undefined) serialized = 'null';
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_METADATA_BYTES) return serialized;
  return JSON.stringify({ omitted: true, reason: 'metadata_limit_exceeded' });
}

function requestIdFrom(req) {
  const requestId = req?.id || req?.get?.('x-request-id');
  return requestId ? String(requestId).slice(0, 128) : null;
}

function optionalInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function recordAuditEvent({
  req,
  actor,
  action,
  resource,
  resourceId = null,
  patientId = null,
  result = 'success',
  metadata,
  required = false,
}) {
  try {
    return await prisma.auditEvent.create({
      data: {
        actorId: optionalInteger(actor?.id),
        actorRole: actor?.role ? String(actor.role).slice(0, 40) : null,
        action: String(action).slice(0, 80),
        resource: String(resource).slice(0, 80),
        resourceId: resourceId === null || resourceId === undefined ? null : String(resourceId).slice(0, 120),
        patientId: optionalInteger(patientId),
        result: String(result).slice(0, 40),
        requestId: requestIdFrom(req),
        metadataJson: serializeMetadata(metadata),
      },
    });
  } catch (error) {
    // Auditing must not turn a valid clinical operation into a 500, but the
    // failure remains visible to operators during development and in logs.
    if (required) throw error;
    if (error?.code !== 'P2021' && error?.code !== 'P2022') {
      console.error('Audit event could not be recorded', error?.message || error);
    }
    return null;
  }
}

function resourceForPath(pathname) {
  if (pathname.startsWith('/auth/')) return 'auth';
  if (pathname.startsWith('/compliance')) return 'compliance';
  if (pathname.includes('/documents')) return 'document';
  if (pathname.includes('/recalls')) return 'recall';
  if (pathname.startsWith('/patients/')) return pathname.includes('/clinical') ? 'clinical' : 'patient';
  if (pathname.startsWith('/patients')) return 'patient';
  if (pathname.startsWith('/appointments')) return 'appointment';
  if (pathname.startsWith('/doctors')) return 'doctor';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/users')) return 'user';
  if (pathname.startsWith('/audit-events')) return 'audit';
  if (pathname.startsWith('/data-subject-requests')) return 'data_subject_request';
  if (pathname.startsWith('/retention')) return 'retention';
  return 'internal';
}

function actionForRequest(req) {
  const pathname = req.path || '';
  if (pathname.endsWith('/export')) return 'export';
  if (pathname.endsWith('/validate')) return 'validate';
  if (pathname.endsWith('/content')) return 'download';
  if (pathname.endsWith('/login')) return 'login';
  if (pathname.endsWith('/logout')) return 'logout';
  if (req.method === 'GET' || req.method === 'HEAD') return 'read';
  if (req.method === 'POST') return 'create';
  if (req.method === 'PUT' || req.method === 'PATCH') return 'update';
  if (req.method === 'DELETE') return 'delete';
  return req.method.toLowerCase();
}

function patientIdForRequest(req, resource) {
  const pathPatientId = String(req.path || '').match(/\/patients\/(\d+)/)?.[1];
  const candidate = req.params?.patientId || (resource === 'patient' ? req.params?.id : null)
    || pathPatientId
    || (resource === 'appointment' ? req.body?.patientId : null);
  return Number.isInteger(Number(candidate)) ? Number(candidate) : null;
}

function resourceIdForRequest(req) {
  const paramId = req.params?.id || req.params?.appointmentId || req.params?.noteId || req.params?.requestId;
  if (paramId) return paramId;
  const match = String(req.path || '').match(/\/(?:patients|appointments|users|audit-events|data-subject-requests|notes|recalls)\/(\d+)/);
  return match?.[1] || null;
}

function auditRequest(req, res, next) {
  res.on('finish', () => {
    if (req.path === '/auth/csrf') return;
    const resource = resourceForPath(req.path || '');
    const actor = req.user || req.auditActor;
    void recordAuditEvent({
      req,
      actor,
      action: actionForRequest(req),
      resource,
      resourceId: resourceIdForRequest(req),
      patientId: req.auditPatientId || patientIdForRequest(req, resource),
      result: res.statusCode >= 400 ? 'failure' : 'success',
      metadata: { statusCode: res.statusCode },
    });
  });
  return next();
}

module.exports = {
  MAX_METADATA_BYTES,
  auditRequest,
  recordAuditEvent,
  resourceForPath,
  sanitizeMetadata,
  serializeMetadata,
};
