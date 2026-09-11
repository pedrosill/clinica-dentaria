const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId, parseDateOnly } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');

const RECALL_STATUSES = new Set(['due', 'scheduled', 'completed', 'dismissed']);
const OPEN_RECALL_STATUSES = ['due', 'scheduled'];
const TRANSITIONS = Object.freeze({
  due: new Set(['scheduled', 'completed', 'dismissed']),
  scheduled: new Set(['due', 'completed', 'dismissed']),
  completed: new Set(),
  dismissed: new Set(),
});
const MAX_LIMIT = 100;

function positiveId(value, fieldName) {
  const id = parseNumericId(value, fieldName);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, `Invalid ${fieldName}`);
  return id;
}

function normalizeReason(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function reasonKey(value) {
  return normalizeReason(value).toLocaleLowerCase('en-GB');
}

function formatLocalDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recallScope(user) {
  if (user?.role !== 'dentist') return {};
  const doctorId = Number(user.doctorId) || -1;
  return {
    OR: [
      { doctorId },
      { patient: { appointments: { some: { doctorId, archivedAt: null } } } },
    ],
  };
}

function patientScope(user) {
  return {
    archivedAt: null,
    ...(user?.role === 'dentist'
      ? { appointments: { some: { doctorId: Number(user.doctorId) || -1, archivedAt: null } } }
      : {}),
  };
}

async function ensurePatientAccess(patientId, user) {
  assertPermission(user, 'recall', 'read');
  const id = positiveId(patientId, 'patient id');
  const patient = await prisma.patient.findFirst({ where: { id, ...patientScope(user) }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return id;
}

async function ensureRecallAccess(recallId, user) {
  assertPermission(user, 'recall', 'read');
  const id = positiveId(recallId, 'recall id');
  const recall = await prisma.patientRecall.findFirst({
    where: { id, patient: patientScope(user), ...recallScope(user) },
    select: { id: true, patientId: true, doctorId: true, status: true },
  });
  if (!recall) throw new HttpError(404, 'Recall not found');
  return recall;
}

function parseLimit(value) {
  if (value === undefined || value === '') return 50;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `Limit must be between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function parseStatusFilter(value) {
  const status = String(value || 'open').trim();
  if (status === 'open') return { in: OPEN_RECALL_STATUSES };
  if (status === 'all') return undefined;
  if (!RECALL_STATUSES.has(status)) throw new HttpError(400, 'Invalid recall status filter');
  return status;
}

function recallSelect() {
  return {
    id: true,
    patientId: true,
    appointmentId: true,
    doctorId: true,
    dueDate: true,
    reason: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
    patient: { select: { id: true, fullName: true } },
    doctor: { select: { id: true, name: true } },
    appointment: { select: { id: true, date: true, time: true, status: true } },
  };
}

function serializeRecall(recall) {
  return {
    ...recall,
    dueDate: formatLocalDate(recall.dueDate),
    appointment: recall.appointment
      ? { ...recall.appointment, date: formatLocalDate(recall.appointment.date) }
      : null,
  };
}

async function listRecalls(query = {}, user) {
  assertPermission(user, 'recall', 'read');
  const status = parseStatusFilter(query.status);
  const limit = parseLimit(query.limit);
  const where = {
    patient: { archivedAt: null },
    ...recallScope(user),
    ...(status ? { status } : {}),
  };
  if (query.patientId !== undefined) where.patientId = await ensurePatientAccess(query.patientId, user);
  const recalls = await prisma.patientRecall.findMany({
    where,
    select: recallSelect(),
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return recalls.map(serializeRecall);
}

async function validateLinks({ patientId, appointmentId, doctorId, user }) {
  let appointment = null;
  if (appointmentId !== null) {
    appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId, archivedAt: null, patient: { archivedAt: null } },
      select: { id: true, doctorId: true },
    });
    if (!appointment) throw new HttpError(400, 'Appointment must belong to the patient and be active');
  }

  if (doctorId !== null) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } });
    if (!doctor) throw new HttpError(400, 'Doctor not found');
  }

  if (appointment && doctorId !== null && appointment.doctorId !== doctorId) {
    throw new HttpError(400, 'Linked doctor must match the appointment doctor');
  }

  const resolvedDoctorId = doctorId ?? appointment?.doctorId ?? (user.role === 'dentist' ? Number(user.doctorId) : null);
  if (user.role === 'dentist') {
    const ownDoctorId = Number(user.doctorId) || -1;
    if (resolvedDoctorId !== ownDoctorId) throw new HttpError(403, 'Dentists may only manage recalls assigned to them');
    const patient = await prisma.patient.findFirst({ where: { id: patientId, ...patientScope(user) }, select: { id: true } });
    if (!patient) throw new HttpError(403, 'Dentists may only manage recalls for their patients');
  }
  return { appointmentId: appointment?.id ?? null, doctorId: resolvedDoctorId ?? null };
}

async function createRecall(patientIdValue, payload = {}, user, req) {
  assertPermission(user, 'recall', 'write');
  const patientId = await ensurePatientAccess(patientIdValue, user);
  const reason = normalizeReason(payload.reason);
  if (!reason) throw new HttpError(400, 'Recall reason is required');
  if (reason.length > 240) throw new HttpError(400, 'Recall reason must be 240 characters or fewer');
  const dueDate = parseDateOnly(payload.dueDate, 'due date');
  const appointmentId = payload.appointmentId === undefined || payload.appointmentId === null || payload.appointmentId === '' ? null : positiveId(payload.appointmentId, 'appointment id');
  const doctorId = payload.doctorId === undefined || payload.doctorId === null || payload.doctorId === '' ? null : positiveId(payload.doctorId, 'doctor id');
  const links = await validateLinks({ patientId, appointmentId, doctorId, user });
  const existing = await prisma.patientRecall.findMany({ where: { patientId, dueDate, status: { in: OPEN_RECALL_STATUSES } }, select: { appointmentId: true, doctorId: true, reason: true } });
  if (existing.some((item) => item.appointmentId === links.appointmentId && item.doctorId === links.doctorId && reasonKey(item.reason) === reasonKey(reason))) {
    throw new HttpError(409, 'An equivalent active recall already exists');
  }
  const created = await prisma.patientRecall.create({
    data: { patientId, appointmentId: links.appointmentId, doctorId: links.doctorId, dueDate, reason },
    select: recallSelect(),
  });
  await recordAuditEvent({ req, actor: user, action: 'create', resource: 'recall', resourceId: created.id, patientId, metadata: { status: created.status, dueDate: formatLocalDate(created.dueDate), appointmentLinked: Boolean(created.appointmentId), doctorLinked: Boolean(created.doctorId) } });
  return serializeRecall(created);
}

async function transitionRecall(recallIdValue, payload = {}, user, req) {
  assertPermission(user, 'recall', 'write');
  const existing = await ensureRecallAccess(recallIdValue, user);
  const status = String(payload.status || '').trim();
  if (!RECALL_STATUSES.has(status)) throw new HttpError(400, 'Invalid recall status');
  if (!TRANSITIONS[existing.status]?.has(status)) throw new HttpError(409, `Cannot transition recall from ${existing.status} to ${status}`);
  const updatedCount = await prisma.patientRecall.updateMany({ where: { id: existing.id, status: existing.status }, data: { status, completedAt: status === 'completed' ? new Date() : null } });
  if (updatedCount.count !== 1) throw new HttpError(409, 'Recall changed before the transition could be saved');
  const updated = await prisma.patientRecall.findUnique({ where: { id: existing.id }, select: recallSelect() });
  await recordAuditEvent({ req, actor: user, action: 'transition', resource: 'recall', resourceId: existing.id, patientId: updated.patientId, metadata: { fromStatus: existing.status, toStatus: status } });
  return serializeRecall(updated);
}

module.exports = { createRecall, listRecalls, transitionRecall, RECALL_STATUSES, TRANSITIONS };
