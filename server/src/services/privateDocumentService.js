const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { recordAuditEvent } = require('./auditService');
const { ensurePatientAccess, MAX_DOCUMENT_BYTES } = require('./governanceService');

const MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const serverRoot = path.resolve(__dirname, '../..');

function storageRoot() {
  const configured = process.env.PRIVATE_DOCUMENTS_DIR;
  if (configured) return path.resolve(configured);
  return path.resolve(serverRoot, '..', 'private-documents');
}

function safeFileName(value) {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
  if (!normalized || normalized === '.' || normalized === '..') throw new HttpError(400, 'A valid file name is required');
  return normalized;
}

function safeStoragePath(storageKey) {
  const normalized = String(storageKey || '');
  if (!normalized.startsWith('private/') || normalized.includes('..')) throw new HttpError(400, 'Invalid private storage key');
  const root = storageRoot();
  const target = path.resolve(root, normalized.slice('private/'.length));
  if (!target.startsWith(`${root}${path.sep}`)) throw new HttpError(400, 'Invalid private storage key');
  return target;
}

function selectDocument() {
  return { id: true, patientId: true, appointmentId: true, fileName: true, mimeType: true, sizeBytes: true, sha256: true, version: true, uploadedAt: true, expiresAt: true, createdAt: true, createdBy: { select: { id: true, displayName: true } } };
}

async function uploadDocument(patientId, buffer, metadata, user, req) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > MAX_DOCUMENT_BYTES) throw new HttpError(400, 'Document size must be between 1 byte and 25 MB');
  const id = await ensurePatientAccess(patientId, user, { write: true });
  const appointmentId = metadata.appointmentId ? parseNumericId(metadata.appointmentId, 'appointment id') : null;
  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, patientId: true, doctorId: true, archivedAt: true },
    });
    if (!appointment || appointment.archivedAt || appointment.patientId !== id) {
      throw new HttpError(400, 'The evidence appointment does not belong to this patient');
    }
    if (user.role === 'dentist' && Number(user.doctorId) !== Number(appointment.doctorId)) {
      throw new HttpError(403, 'Dentists may only attach evidence to their own appointments');
    }
  }
  const fileName = safeFileName(metadata.fileName);
  const mimeType = String(metadata.mimeType || '').toLowerCase();
  if (!MIME_TYPES.has(mimeType)) throw new HttpError(400, 'Unsupported document MIME type');
  const storageKey = `private/${crypto.randomUUID()}.bin`;
  const target = safeStoragePath(storageKey);
  await fs.promises.mkdir(storageRoot(), { recursive: true, mode: 0o700 });
  await fs.promises.writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
  try {
    const document = await prisma.patientDocument.create({
      data: { patientId: id, appointmentId, fileName, mimeType, sizeBytes: buffer.length, storageKey, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), version: 1, uploadedAt: new Date(), createdById: user.id },
      select: selectDocument(),
    });
    await recordAuditEvent({ req, actor: user, action: 'upload', resource: 'document', resourceId: document.id, patientId: id, result: 'success', metadata: { mimeType, sizeBytes: buffer.length }, required: true });
    return document;
  } catch (error) {
    await fs.promises.rm(target, { force: true });
    throw error;
  }
}

async function getDocument(patientId, documentId, user, req) {
  const patient = await ensurePatientAccess(patientId, user);
  const id = parseNumericId(documentId, 'document id');
  const document = await prisma.patientDocument.findFirst({ where: { id, patientId: patient }, select: { ...selectDocument(), storageKey: true } });
  if (!document || !document.storageKey) throw new HttpError(404, 'Document content not found');
  const target = safeStoragePath(document.storageKey);
  try { await fs.promises.access(target, fs.constants.R_OK); } catch { throw new HttpError(404, 'Document content not found'); }
  await recordAuditEvent({ req, actor: user, action: 'download', resource: 'document', resourceId: id, patientId: patient, result: 'success', metadata: { fileName: document.fileName, mimeType: document.mimeType }, required: true });
  return { ...document, target };
}

module.exports = { getDocument, uploadDocument, storageRoot };
