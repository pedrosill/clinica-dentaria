const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId, parseDateOnly } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');

const WAITLIST_STATUSES = new Set(['waiting', 'contacted', 'booked', 'removed']);
const WAITLIST_PRIORITIES = new Set(['normal', 'urgent']);
const ACTIVE_STATUSES = ['waiting', 'contacted'];
const TRANSITIONS = Object.freeze({
  waiting: new Set(['contacted', 'booked', 'removed']),
  contacted: new Set(['waiting', 'booked', 'removed']),
  booked: new Set(),
  removed: new Set(),
});
const MAX_LIMIT = 100;
const MAX_REASON_LENGTH = 240;
const MAX_NOTES_LENGTH = 500;

function positiveId(value, fieldName) {
  const id = parseNumericId(value, fieldName);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, `Invalid ${fieldName}`);
  return id;
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function formatLocalDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLimit(value) {
  if (value === undefined || value === '') return 100;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `Limit must be between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function parseStatusFilter(value) {
  if (value === undefined || value === '') return { in: ACTIVE_STATUSES };
  if (String(value).trim() === 'all') return undefined;
  const statuses = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  if (statuses.length === 0 || statuses.some((status) => !WAITLIST_STATUSES.has(status))) {
    throw new HttpError(400, 'Invalid waitlist status filter');
  }
  return statuses.length === 1 ? statuses[0] : { in: [...new Set(statuses)] };
}

function patientScope(user) {
  return {
    archivedAt: null,
    ...(user?.role === 'dentist'
      ? { appointments: { some: { doctorId: Number(user.doctorId) || -1, archivedAt: null } } }
      : {}),
  };
}

function entryScope(user) {
  if (user?.role !== 'dentist') return {};
  const doctorId = Number(user.doctorId) || -1;
  return {
    OR: [
      { doctorId },
      { patient: { appointments: { some: { doctorId, archivedAt: null } } } },
    ],
  };
}

async function ensurePatientAccess(patientIdValue, user) {
  assertPermission(user, 'waitlist', 'read');
  const patientId = positiveId(patientIdValue, 'patient id');
  const patient = await prisma.patient.findFirst({ where: { id: patientId, ...patientScope(user) }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return patientId;
}

async function ensureEntryAccess(entryIdValue, user) {
  assertPermission(user, 'waitlist', 'read');
  const id = positiveId(entryIdValue, 'waitlist id');
  const entry = await prisma.waitlistEntry.findFirst({
    where: { id, patient: patientScope(user), ...entryScope(user) },
    select: { id: true, patientId: true, doctorId: true, status: true },
  });
  if (!entry) throw new HttpError(404, 'Waitlist entry not found');
  return entry;
}

function waitlistSelect() {
  return {
    id: true,
    patientId: true,
    doctorId: true,
    requestedDate: true,
    reason: true,
    priority: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    patient: { select: { id: true, fullName: true } },
    doctor: { select: { id: true, name: true } },
  };
}

function serializeEntry(entry) {
  return { ...entry, requestedDate: entry.requestedDate ? formatLocalDate(entry.requestedDate) : null };
}

async function listWaitlist(query = {}, user) {
  assertPermission(user, 'waitlist', 'read');
  const status = parseStatusFilter(query.status);
  const where = { patient: { archivedAt: null }, ...entryScope(user), ...(status ? { status } : {}) };
  if (query.patientId !== undefined) where.patientId = await ensurePatientAccess(query.patientId, user);
  const entries = await prisma.waitlistEntry.findMany({
    where,
    select: waitlistSelect(),
    orderBy: [{ priority: 'desc' }, { requestedDate: 'asc' }, { createdAt: 'asc' }],
    take: parseLimit(query.limit),
  });
  return entries.map(serializeEntry);
}

async function validateDoctor(doctorId, user) {
  if (doctorId === null) return user.role === 'dentist' ? (Number(user.doctorId) || null) : null;
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true, userId: true } });
  if (!doctor) throw new HttpError(400, 'Doctor not found');
  if (user.role === 'dentist' && doctor.userId !== user.id) throw new HttpError(403, 'Dentists may only use their own doctor scope');
  return doctor.id;
}

async function createWaitlistEntry(patientIdValue, payload = {}, user, req) {
  assertPermission(user, 'waitlist', 'write');
  const patientId = await ensurePatientAccess(patientIdValue, user);
  const reason = normalizeText(payload.reason);
  if (!reason) throw new HttpError(400, 'Waitlist reason is required');
  if (reason.length > MAX_REASON_LENGTH) throw new HttpError(400, `Waitlist reason must be ${MAX_REASON_LENGTH} characters or fewer`);
  const notes = payload.notes === undefined || payload.notes === null || payload.notes === '' ? null : normalizeText(payload.notes);
  if (notes && notes.length > MAX_NOTES_LENGTH) throw new HttpError(400, `Waitlist notes must be ${MAX_NOTES_LENGTH} characters or fewer`);
  const priority = String(payload.priority || 'normal').trim();
  if (!WAITLIST_PRIORITIES.has(priority)) throw new HttpError(400, 'Invalid waitlist priority');
  const requestedDate = payload.requestedDate === undefined || payload.requestedDate === null || payload.requestedDate === '' ? null : parseDateOnly(payload.requestedDate, 'requested date');
  const requestedDoctorId = payload.doctorId === undefined || payload.doctorId === null || payload.doctorId === '' ? null : positiveId(payload.doctorId, 'doctor id');
  const doctorId = await validateDoctor(requestedDoctorId, user);
  const existing = await prisma.waitlistEntry.findMany({ where: { patientId, status: { in: ACTIVE_STATUSES } }, select: { doctorId: true, requestedDate: true, reason: true } });
  const requestedDateKey = requestedDate ? formatLocalDate(requestedDate) : null;
  if (existing.some((entry) => entry.doctorId === doctorId && (entry.requestedDate ? formatLocalDate(entry.requestedDate) : null) === requestedDateKey && normalizeText(entry.reason).toLocaleLowerCase('en-GB') === reason.toLocaleLowerCase('en-GB'))) {
    throw new HttpError(409, 'An equivalent active waitlist entry already exists');
  }
  const created = await prisma.waitlistEntry.create({ data: { patientId, doctorId, requestedDate, reason, priority, notes }, select: waitlistSelect() });
  await recordAuditEvent({ req, actor: user, action: 'create', resource: 'waitlist', resourceId: created.id, patientId, metadata: { status: created.status, priority: created.priority, requestedDate: created.requestedDate ? formatLocalDate(created.requestedDate) : null, doctorLinked: Boolean(created.doctorId) } });
  return serializeEntry(created);
}

async function transitionWaitlistEntry(entryIdValue, payload = {}, user, req) {
  assertPermission(user, 'waitlist', 'write');
  const existing = await ensureEntryAccess(entryIdValue, user);
  const status = String(payload.status || '').trim();
  if (!WAITLIST_STATUSES.has(status)) throw new HttpError(400, 'Invalid waitlist status');
  if (!TRANSITIONS[existing.status]?.has(status)) throw new HttpError(409, `Cannot transition waitlist entry from ${existing.status} to ${status}`);
  const updatedCount = await prisma.waitlistEntry.updateMany({ where: { id: existing.id, status: existing.status }, data: { status } });
  if (updatedCount.count !== 1) throw new HttpError(409, 'Waitlist entry changed before the transition could be saved');
  const updated = await prisma.waitlistEntry.findUnique({ where: { id: existing.id }, select: waitlistSelect() });
  await recordAuditEvent({ req, actor: user, action: 'transition', resource: 'waitlist', resourceId: existing.id, patientId: updated.patientId, metadata: { fromStatus: existing.status, toStatus: status } });
  return serializeEntry(updated);
}

module.exports = { createWaitlistEntry, listWaitlist, transitionWaitlistEntry, WAITLIST_STATUSES, WAITLIST_PRIORITIES, TRANSITIONS };
