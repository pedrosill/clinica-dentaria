const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');

const CONSENT_STATUSES = new Set(['granted', 'withdrawn']);
const REQUEST_TYPES = new Set(['access', 'rectification', 'restriction', 'erasure', 'anonymization']);
const REQUEST_STATUSES = new Set(['open', 'in_progress', 'completed', 'rejected']);
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

function text(value, field, maxLength, { required = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (required && !normalized) throw new HttpError(400, `${field} is required`);
  if (normalized.length > maxLength) throw new HttpError(400, `${field} must be ${maxLength} characters or fewer`);
  return normalized;
}

async function ensurePatientAccess(patientId, user, { write = false } = {}) {
  assertPermission(user, 'patient', write ? 'write' : 'read');
  const id = parseNumericId(patientId, 'patient id');
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      archivedAt: null,
      ...(user?.role === 'dentist'
        ? { appointments: { some: { doctorId: user.doctorId || -1, archivedAt: null } } }
        : {}),
    },
    select: { id: true },
  });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return id;
}

function consentSelect() {
  return {
    id: true,
    patientId: true,
    purpose: true,
    version: true,
    status: true,
    grantedAt: true,
    withdrawnAt: true,
    recordedBy: { select: { id: true, displayName: true } },
    signatureReference: true,
  };
}

async function listConsents(patientId, user) {
  const id = await ensurePatientAccess(patientId, user);
  return prisma.consentRecord.findMany({ where: { patientId: id }, select: consentSelect(), orderBy: { grantedAt: 'desc' } });
}

async function createConsent(patientId, payload = {}, user) {
  const id = await ensurePatientAccess(patientId, user, { write: true });
  const purpose = text(payload.purpose, 'Consent purpose', 160, { required: true });
  const version = text(payload.version || '1', 'Consent version', 80, { required: true });
  const signatureReference = text(payload.signatureReference, 'Signature reference', 255) || null;
  const result = await prisma.consentRecord.create({
    data: { patientId: id, purpose, version, recordedById: user.id, signatureReference },
    select: consentSelect(),
  });
  return result;
}

async function withdrawConsent(patientId, consentId, user) {
  const patient = await ensurePatientAccess(patientId, user, { write: true });
  const id = parseNumericId(consentId, 'consent id');
  const existing = await prisma.consentRecord.findFirst({ where: { id, patientId: patient, status: 'granted' } });
  if (!existing) throw new HttpError(404, 'Consent record not found');
  return prisma.consentRecord.update({
    where: { id },
    data: { status: 'withdrawn', withdrawnAt: new Date() },
    select: consentSelect(),
  });
}

function documentSelect() {
  return {
    id: true,
    patientId: true,
    fileName: true,
    mimeType: true,
    sizeBytes: true,
    sha256: true,
    version: true,
    uploadedAt: true,
    expiresAt: true,
    createdAt: true,
    createdBy: { select: { id: true, displayName: true } },
  };
}

async function listDocuments(patientId, user) {
  const id = await ensurePatientAccess(patientId, user);
  return prisma.patientDocument.findMany({ where: { patientId: id }, select: documentSelect(), orderBy: { createdAt: 'desc' } });
}

async function createDocument(patientId, payload = {}, user) {
  const id = await ensurePatientAccess(patientId, user, { write: true });
  const fileName = text(payload.fileName, 'File name', 255, { required: true });
  const mimeType = text(payload.mimeType, 'MIME type', 120, { required: true }).toLowerCase();
  const sizeBytes = Number(payload.sizeBytes);
  if (!DOCUMENT_MIME_TYPES.has(mimeType)) throw new HttpError(400, 'Unsupported document MIME type');
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new HttpError(400, 'Document size must be between 1 byte and 25 MB');
  }
  const storageKey = payload.storageKey === undefined || payload.storageKey === null
    ? null
    : text(payload.storageKey, 'Storage key', 500);
  if (storageKey && (!storageKey.startsWith('private/') || storageKey.includes('..'))) {
    throw new HttpError(400, 'Storage key must reference private storage');
  }
  return prisma.patientDocument.create({
    data: { patientId: id, fileName, mimeType, sizeBytes, storageKey, createdById: user.id },
    select: documentSelect(),
  });
}

async function exportPatient(patientId, user, req) {
  const id = await ensurePatientAccess(patientId, user);
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, phone: true, email: true, nif: true, nationality: true, dateOfBirth: true, createdAt: true,
      appointments: {
        where: { archivedAt: null },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        select: { id: true, doctorId: true, date: true, time: true, duration: true, treatmentType: true, performedTreatment: true, status: true, notes: true, completionNotes: true, createdAt: true },
      },
      clinicalProfile: true,
      toothChartEntries: true,
      clinicalNotes: {
        orderBy: { createdAt: 'asc' },
        include: { addenda: { orderBy: { version: 'asc' } } },
      },
      treatmentPlans: { include: { items: true } },
      consentRecords: { select: consentSelect(), orderBy: { grantedAt: 'asc' } },
      documents: { select: documentSelect(), orderBy: { createdAt: 'asc' } },
      dataSubjectRequests: { orderBy: { requestedAt: 'asc' } },
    },
  });
  if (!patient) throw new HttpError(404, 'Patient not found');
  const reason = text(req?.query?.reason || req?.body?.reason || 'internal governance request', 'Export reason', 300, { required: true });
  await recordAuditEvent({
    req,
    actor: user,
    action: 'export',
    resource: 'patient',
    resourceId: id,
    patientId: id,
    result: 'success',
    metadata: { reason, sections: ['identity', 'appointments', 'clinical', 'consents', 'documents', 'requests'] },
    required: true,
  });
  return { exportedAt: new Date().toISOString(), patient };
}

async function createDataSubjectRequest(payload = {}, user) {
  const patientId = await ensurePatientAccess(payload.patientId, user);
  const requestType = text(payload.requestType, 'Request type', 40, { required: true });
  if (!REQUEST_TYPES.has(requestType)) throw new HttpError(400, 'Invalid data subject request type');
  const description = text(payload.description, 'Description', 2000) || null;
  return prisma.dataSubjectRequest.create({
    data: { patientId, requestType, description, createdById: user.id },
  });
}

async function listDataSubjectRequests(user, filters = {}) {
  assertAdmin(user);
  const where = {};
  if (filters.patientId !== undefined) where.patientId = parseNumericId(filters.patientId, 'patient id');
  if (filters.status) where.status = text(filters.status, 'Status', 40);
  return prisma.dataSubjectRequest.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: { patient: { select: { id: true, fullName: true } }, createdBy: { select: { id: true, displayName: true } } },
  });
}

async function updateDataSubjectRequest(requestId, payload = {}, user) {
  assertAdmin(user);
  const id = parseNumericId(requestId, 'request id');
  const existing = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Data subject request not found');
  const status = payload.status === undefined ? existing.status : text(payload.status, 'Status', 40);
  if (!REQUEST_STATUSES.has(status)) throw new HttpError(400, 'Invalid data subject request status');
  const resolutionNote = payload.resolutionNote === undefined
    ? existing.resolutionNote
    : text(payload.resolutionNote, 'Resolution note', 2000) || null;
  const responseReference = payload.responseReference === undefined ? existing.responseReference : text(payload.responseReference, 'Response reference', 500) || null;
  if (payload.action === 'anonymize') {
    if (payload.confirm !== true) throw new HttpError(400, 'Explicit confirmation is required to anonymize a patient');
    if (!['erasure', 'anonymization'].includes(existing.requestType)) throw new HttpError(400, 'Only erasure or anonymization requests can be anonymized');
    const hold = await prisma.retentionHold.findFirst({ where: { patientId: existing.patientId, releasedAt: null } });
    if (hold) throw new HttpError(409, 'An active retention hold prevents anonymization');
    const now = new Date();
    const anonymized = await prisma.$transaction(async (transaction) => {
      await transaction.patient.update({ where: { id: existing.patientId }, data: { fullName: `ANONYMIZED-${existing.patientId}`, phone: '', email: '', nif: `ANONYMIZED-${existing.patientId}`, nationality: '', dateOfBirth: null, archivedAt: now } });
      return transaction.dataSubjectRequest.update({ where: { id }, data: { status: 'completed', resolutionNote: resolutionNote || 'Contact data anonymized after review. Clinical records retained where legally required.', responseReference, reviewedById: user.id, reviewedAt: now, resolvedAt: now } });
    });
    await recordAuditEvent({ req: null, actor: user, action: 'anonymize', resource: 'data_subject_request', resourceId: id, patientId: existing.patientId, result: 'success', metadata: { requestType: existing.requestType }, required: true });
    return anonymized;
  }
  return prisma.dataSubjectRequest.update({
    where: { id },
    data: { status, resolutionNote, responseReference, reviewedById: user.id, reviewedAt: new Date(), resolvedAt: ['completed', 'rejected'].includes(status) ? new Date() : null },
  });
}

function assertAdmin(user) {
  if (!user || user.role !== 'admin') throw new HttpError(403, 'You do not have permission for this action');
}

async function listAuditEvents(user, filters = {}) {
  assertAdmin(user);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const where = {};
  if (filters.patientId !== undefined) where.patientId = parseNumericId(filters.patientId, 'patient id');
  if (filters.resource) where.resource = text(filters.resource, 'Resource', 80);
  if (filters.action) where.action = text(filters.action, 'Action', 80);
  if (filters.result) where.result = text(filters.result, 'Result', 40);
  const events = await prisma.auditEvent.findMany({
    where,
    take: limit,
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    select: {
      id: true, actorId: true, actorRole: true, action: true, resource: true, resourceId: true,
      patientId: true, result: true, timestamp: true, requestId: true,
      actor: { select: { displayName: true } },
    },
  });
  return { events, limit };
}

async function getAuditEvent(eventId, user) {
  assertAdmin(user);
  const id = parseNumericId(eventId, 'audit event id');
  const event = await prisma.auditEvent.findUnique({
    where: { id },
    select: { id: true, actorId: true, actorRole: true, action: true, resource: true, resourceId: true, patientId: true, result: true, timestamp: true, requestId: true, metadataJson: true, actor: { select: { displayName: true } } },
  });
  if (!event) throw new HttpError(404, 'Audit event not found');
  return event;
}

async function listRetentionPolicies(user) {
  assertAdmin(user);
  return prisma.retentionPolicy.findMany({ orderBy: { resourceType: 'asc' } });
}

async function updateRetentionPolicy(resourceType, payload = {}, user) {
  assertAdmin(user);
  const normalizedType = text(resourceType, 'Resource type', 80, { required: true });
  const durationDays = payload.durationDays === null || payload.durationDays === undefined ? null : Number(payload.durationDays);
  const isActive = payload.isActive === true;
  if (durationDays !== null && (!Number.isSafeInteger(durationDays) || durationDays <= 0)) {
    throw new HttpError(400, 'Retention duration must be a positive number of days or null');
  }
  if (isActive && durationDays === null) throw new HttpError(400, 'An active retention policy requires an explicit duration');
  const description = text(payload.description, 'Description', 500) || null;
  return prisma.retentionPolicy.upsert({
    where: { resourceType: normalizedType },
    create: { resourceType: normalizedType, durationDays, isActive, description, updatedById: user.id },
    update: { durationDays, isActive, description, updatedById: user.id },
  });
}

async function retentionPreview(user, patientId) {
  assertAdmin(user);
  const policies = await prisma.retentionPolicy.findMany({ where: { isActive: true, durationDays: { not: null } } });
  const scopedPatientId = patientId === undefined ? null : parseNumericId(patientId, 'patient id');
  const candidates = [];
  for (const policy of policies) {
    if (policy.resourceType !== 'patient') continue;
    const cutoff = new Date(Date.now() - policy.durationDays * 86400000);
    const patients = await prisma.patient.findMany({
      where: { archivedAt: null, createdAt: { lt: cutoff }, ...(scopedPatientId === null ? {} : { id: scopedPatientId }) },
      select: { id: true, fullName: true, createdAt: true },
      take: 100,
    });
    candidates.push(...patients.map((patient) => ({ policy: policy.resourceType, patient })));
  }
  return { policies, candidates, automaticDeletion: false };
}

async function applyRetention(payload = {}, user) {
  assertAdmin(user);
  if (payload.confirm !== true) throw new HttpError(400, 'Admin confirmation is required to apply retention');
  const preview = await retentionPreview(user, payload.patientId);
  let applied = 0;
  for (const candidate of preview.candidates) {
    const existing = await prisma.retentionHold.findFirst({ where: { patientId: candidate.patient.id, resourceType: candidate.policy, releasedAt: null } });
    if (!existing) {
      await prisma.retentionHold.create({ data: { patientId: candidate.patient.id, resourceType: candidate.policy, reason: 'Retention applied explicitly by administrator', createdById: user.id } });
      applied += 1;
    }
  }
  return { previewed: preview.candidates.length, applied, automaticDeletion: false };
}

async function listRetentionHolds(user) {
  assertAdmin(user);
  return prisma.retentionHold.findMany({ where: { releasedAt: null }, orderBy: { startsAt: 'desc' }, take: 100, include: { patient: { select: { id: true, fullName: true } } } });
}

async function releaseRetentionHold(holdId, payload = {}, user) {
  assertAdmin(user);
  if (payload.confirm !== true) throw new HttpError(400, 'Admin confirmation is required to release a retention hold');
  const id = parseNumericId(holdId, 'retention hold id');
  try {
    return await prisma.retentionHold.update({ where: { id }, data: { releasedAt: new Date() } });
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Retention hold not found');
    throw error;
  }
}

module.exports = {
  MAX_DOCUMENT_BYTES,
  createConsent,
  createDataSubjectRequest,
  createDocument,
  ensurePatientAccess,
  exportPatient,
  getAuditEvent,
  listAuditEvents,
  listConsents,
  listDataSubjectRequests,
  listDocuments,
  listRetentionHolds,
  listRetentionPolicies,
  releaseRetentionHold,
  retentionPreview,
  applyRetention,
  updateDataSubjectRequest,
  updateRetentionPolicy,
  withdrawConsent,
};
