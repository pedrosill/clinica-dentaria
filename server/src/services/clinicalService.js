const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');

const VALID_TOOTH_NUMBERS = new Set([
  ...[1, 2, 3, 4].flatMap((quadrant) =>
    Array.from({ length: 8 }, (_, index) => `${quadrant}${index + 1}`)
  ),
  ...[5, 6, 7, 8].flatMap((quadrant) =>
    Array.from({ length: 5 }, (_, index) => `${quadrant}${index + 1}`)
  ),
]);

const VALID_SURFACES = new Set([
  'whole',
  'mesial',
  'distal',
  'occlusal',
  'incisal',
  'buccal',
  'lingual',
  'palatal',
]);

const VALID_TOOTH_CONDITIONS = new Set([
  'healthy',
  'caries',
  'restoration',
  'missing',
  'fracture',
  'crown',
  'implant',
  'root_canal',
  'extraction_needed',
  'other',
]);

const VALID_TOOTH_STATUSES = new Set(['active', 'planned', 'completed', 'historical']);
const VALID_NOTE_STATUSES = new Set(['draft', 'final']);
const VALID_PLAN_STATUSES = new Set(['draft', 'accepted', 'in_progress', 'completed', 'declined']);
const VALID_PLAN_ITEM_STATUSES = new Set(['planned', 'scheduled', 'in_progress', 'completed', 'declined']);

function assertTranscriptionPayload(payload, user) {
  if (user?.role !== 'receptionist') return;
  if (payload?.transcriptionMode !== true) {
    throw new HttpError(403, 'The secretary may only edit clinical data in transcription mode');
  }
}

function noteSourceData(payload, user, status = 'draft') {
  const transcription = payload?.transcriptionMode === true || payload?.sourceType === 'paper_transcription';
  if (!transcription) return { sourceType: 'clinical', transcriptionStatus: 'not_applicable' };
  if (status === 'final') throw new HttpError(403, 'Paper transcriptions must be validated by the doctor');
  return {
    sourceType: 'paper_transcription',
    transcriptionStatus: 'transcribed',
    transcribedById: user.id,
    transcribedAt: new Date(),
  };
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function optionalString(value, maxLength = 5000) {
  const normalized = stringValue(value);
  if (normalized.length > maxLength) {
    throw new HttpError(400, `Text must be ${maxLength} characters or fewer`);
  }
  return normalized;
}

function validateEnum(value, allowed, label) {
  const normalized = stringValue(value);
  if (!allowed.has(normalized)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return normalized;
}

function normalizeClinicalTreatments(payload = {}) {
  const source = Array.isArray(payload.treatments) && payload.treatments.length > 0
    ? payload.treatments
    : [{ procedureName: payload.performedTreatment }];

  if (source.length > 30) throw new HttpError(400, 'A visit cannot contain more than 30 treatments');

  return source.map((item) => {
    const procedureName = optionalString(item?.procedureName, 200);
    if (!procedureName) throw new HttpError(400, 'Each treatment must have a name');
    const toothNumber = stringValue(item?.toothNumber);
    if (toothNumber && !VALID_TOOTH_NUMBERS.has(toothNumber)) {
      throw new HttpError(400, 'Invalid FDI tooth number in treatment');
    }
    const surface = stringValue(item?.surface);
    if (surface && !VALID_SURFACES.has(surface)) {
      throw new HttpError(400, 'Invalid tooth surface in treatment');
    }
    const toothCondition = stringValue(item?.toothCondition);
    if (toothCondition && !VALID_TOOTH_CONDITIONS.has(toothCondition)) {
      throw new HttpError(400, 'Invalid tooth condition in treatment');
    }
    const toothStatus = stringValue(item?.toothStatus);
    if (toothStatus && !VALID_TOOTH_STATUSES.has(toothStatus)) {
      throw new HttpError(400, 'Invalid tooth status in treatment');
    }
    return {
      procedureName,
      toothNumber: toothNumber || null,
      surface: surface || null,
      notes: optionalString(item?.notes, 1000),
      toothCondition: toothCondition || null,
      toothStatus: toothStatus || null,
    };
  });
}

function noteTreatmentData(payload) {
  return normalizeClinicalTreatments(payload).map(({ toothCondition, toothStatus, ...treatment }) => treatment);
}

async function ensurePatient(patientId, user, action = 'read') {
  assertPermission(user, 'clinical', action);
  const id = parseNumericId(patientId, 'patient id');
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      archivedAt: null,
      ...(user.role === 'dentist'
        ? {
            appointments: {
              some: { doctorId: user.doctorId || -1, archivedAt: null },
            },
          }
        : {}),
    },
    select: { id: true },
  });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return id;
}

async function ensureAppointmentForPatient(appointmentId, patientId, user) {
  const id = parseNumericId(appointmentId, 'appointment id');
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, patientId: true, doctorId: true, archivedAt: true },
  });

  if (!appointment || appointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  if (appointment.patientId !== patientId) {
    throw new HttpError(400, 'Appointment does not belong to this patient');
  }
  if (user.role === 'dentist' && Number(user.doctorId) !== Number(appointment.doctorId)) {
    throw new HttpError(403, 'Dentists may only access appointments assigned to them');
  }
  return appointment;
}

async function getClinicalRecord(patientId, user) {
  const id = await ensurePatient(patientId, user, 'read');
  const [profile, toothChart, notes, treatmentPlans] = await Promise.all([
    prisma.patientClinicalProfile.findUnique({ where: { patientId: id } }),
    prisma.toothChartEntry.findMany({
      where: { patientId: id },
      orderBy: [{ toothNumber: 'asc' }, { surface: 'asc' }],
    }),
    prisma.clinicalNote.findMany({
      where: { patientId: id },
      include: {
        author: { select: { id: true, displayName: true } },
        transcribedBy: { select: { id: true, displayName: true } },
        validatedBy: { select: { id: true, displayName: true } },
        appointment: { select: { id: true, date: true, time: true, treatmentType: true } },
        addenda: { orderBy: { version: 'asc' } },
        treatments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.treatmentPlan.findMany({
      where: { patientId: id },
      include: {
        createdBy: { select: { id: true, displayName: true } },
        items: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return {
    patientId: id,
    profile: profile || {
      allergies: '',
      medications: '',
      medicalConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      dentalNotes: '',
    },
    toothChart,
    notes,
    treatmentPlans,
  };
}

async function updateClinicalProfile(patientId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const id = await ensurePatient(patientId, user, 'write');
  const data = {
    allergies: optionalString(payload.allergies),
    medications: optionalString(payload.medications),
    medicalConditions: optionalString(payload.medicalConditions),
    emergencyContactName: optionalString(payload.emergencyContactName, 160) || null,
    emergencyContactPhone: optionalString(payload.emergencyContactPhone, 80) || null,
    dentalNotes: optionalString(payload.dentalNotes),
  };

  return prisma.patientClinicalProfile.upsert({
    where: { patientId: id },
    create: { patientId: id, ...data },
    update: data,
  });
}

async function upsertToothChartEntry(patientId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const id = await ensurePatient(patientId, user, 'write');
  const toothNumber = stringValue(payload.toothNumber);
  const surface = validateEnum(payload.surface || 'whole', VALID_SURFACES, 'tooth surface');
  const condition = validateEnum(payload.condition, VALID_TOOTH_CONDITIONS, 'tooth condition');
  const status = validateEnum(payload.status || 'active', VALID_TOOTH_STATUSES, 'tooth status');

  if (!VALID_TOOTH_NUMBERS.has(toothNumber)) {
    throw new HttpError(400, 'Invalid FDI tooth number');
  }

  return prisma.toothChartEntry.upsert({
    where: {
      patientId_toothNumber_surface: { patientId: id, toothNumber, surface },
    },
    create: {
      patientId: id,
      toothNumber,
      surface,
      condition,
      status,
      notes: optionalString(payload.notes, 2000) || null,
    },
    update: {
      condition,
      status,
      notes: optionalString(payload.notes, 2000) || null,
      observedAt: new Date(),
    },
  });
}

async function deleteToothChartEntry(patientId, entryId, user, payload = {}) {
  assertTranscriptionPayload(payload, user);
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(entryId, 'tooth chart entry id');
  const entry = await prisma.toothChartEntry.findFirst({ where: { id, patientId: patient } });
  if (!entry) throw new HttpError(404, 'Tooth chart entry not found');
  await prisma.toothChartEntry.delete({ where: { id } });
  return { message: 'Tooth chart entry removed successfully' };
}

async function createClinicalNote(patientId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const id = await ensurePatient(patientId, user, 'write');
  const status = validateEnum(payload.status || 'draft', VALID_NOTE_STATUSES, 'clinical note status');
  const appointmentId = payload.appointmentId ? parseNumericId(payload.appointmentId, 'appointment id') : null;

  if (appointmentId) {
    await ensureAppointmentForPatient(appointmentId, id, user);
  }

  const data = {
    patientId: id,
    appointmentId,
    authorId: user?.id ? parseNumericId(user.id, 'author id') : null,
    chiefComplaint: optionalString(payload.chiefComplaint),
    clinicalFindings: optionalString(payload.clinicalFindings),
    diagnosis: optionalString(payload.diagnosis),
    treatmentPerformed: optionalString(payload.treatmentPerformed),
    recommendations: optionalString(payload.recommendations),
    status,
    signedAt: status === 'final' ? new Date() : null,
    ...noteSourceData(payload, user, status),
    ...(status === 'final' ? { validatedById: user.id, validatedAt: new Date() } : {}),
    ...(payload.treatments ? { treatments: { create: noteTreatmentData(payload) } } : {}),
  };

  try {
    return await prisma.clinicalNote.create({ data });
  } catch (error) {
    if (error?.code === 'P2002' && appointmentId) {
      throw new HttpError(409, 'This appointment already has a clinical note');
    }
    throw error;
  }
}

async function updateClinicalNote(patientId, noteId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(noteId, 'clinical note id');
  const existing = await prisma.clinicalNote.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      appointmentId: true,
      authorId: true,
      status: true,
      chiefComplaint: true,
      clinicalFindings: true,
      diagnosis: true,
      treatmentPerformed: true,
      recommendations: true,
      sourceType: true,
      transcriptionStatus: true,
      transcribedById: true,
      transcribedAt: true,
      treatments: true,
    },
  });
  if (!existing || existing.patientId !== patient) throw new HttpError(404, 'Clinical note not found');
  if (existing.status === 'final') throw new HttpError(409, 'Final clinical notes cannot be edited');
  if (user.role === 'receptionist' && existing.sourceType !== 'paper_transcription') {
    throw new HttpError(403, 'The secretary may only edit paper transcriptions');
  }

  const status = validateEnum(payload.status || existing.status, VALID_NOTE_STATUSES, 'clinical note status');
  const appointmentId = payload.appointmentId === undefined || payload.appointmentId === null || payload.appointmentId === ''
    ? existing.appointmentId
    : parseNumericId(payload.appointmentId, 'appointment id');

  if (appointmentId) {
    await ensureAppointmentForPatient(appointmentId, patient, user);
  }

  if (existing.transcriptionStatus === 'transcribed' && status === 'final') {
    throw new HttpError(403, 'Paper transcriptions must be validated by the doctor');
  }

  const sourceData = existing.sourceType === 'paper_transcription'
    ? {
        sourceType: 'paper_transcription',
        transcriptionStatus: 'transcribed',
        transcribedById: existing.transcribedById,
        transcribedAt: existing.transcribedAt,
      }
    : noteSourceData(payload, user, status);

  return prisma.clinicalNote.update({
    where: { id },
    data: {
      appointmentId,
      authorId: user?.id ? parseNumericId(user.id, 'author id') : existing.authorId,
      chiefComplaint: optionalString(payload.chiefComplaint ?? existing.chiefComplaint),
      clinicalFindings: optionalString(payload.clinicalFindings ?? existing.clinicalFindings),
      diagnosis: optionalString(payload.diagnosis ?? existing.diagnosis),
      treatmentPerformed: optionalString(payload.treatmentPerformed ?? existing.treatmentPerformed),
      recommendations: optionalString(payload.recommendations ?? existing.recommendations),
      status: user.role === 'receptionist' ? 'draft' : status,
      signedAt: status === 'final' ? new Date() : null,
      validatedById: status === 'final' ? user.id : null,
      validatedAt: status === 'final' ? new Date() : null,
      ...sourceData,
      ...(payload.treatments ? { treatments: { deleteMany: {}, create: noteTreatmentData(payload) } } : {}),
    },
  });
}

async function finalizeClinicalNote(patientId, noteId, user, req) {
  const patient = await ensurePatient(patientId, user, 'validate');
  const id = parseNumericId(noteId, 'clinical note id');
  const note = await prisma.clinicalNote.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      status: true,
      transcriptionStatus: true,
    },
  });

  if (!note || note.patientId !== patient) throw new HttpError(404, 'Clinical note not found');
  if (note.status === 'final') throw new HttpError(409, 'Clinical note is already final');

  if (note.transcriptionStatus === 'transcribed' && user.role !== 'dentist') {
    throw new HttpError(403, 'Only the dentist may validate a paper transcription');
  }

  const isPaperTranscription = note.transcriptionStatus === 'transcribed';
  const updated = await prisma.clinicalNote.update({
    where: { id },
    data: {
      status: 'final',
      signedAt: new Date(),
      transcriptionStatus: isPaperTranscription ? 'validated' : 'not_applicable',
      validatedById: user.id,
      validatedAt: new Date(),
    },
    include: {
      author: { select: { id: true, displayName: true } },
      transcribedBy: { select: { id: true, displayName: true } },
      validatedBy: { select: { id: true, displayName: true } },
      addenda: { orderBy: { version: 'asc' } },
      treatments: { orderBy: { createdAt: 'asc' } },
    },
  });

  await recordAuditEvent({
    req,
    actor: user,
    action: isPaperTranscription ? 'validate' : 'finalize',
    resource: 'clinical_note',
    resourceId: id,
    patientId: patient,
    result: 'success',
    metadata: { transcriptionStatus: updated.transcriptionStatus },
    required: true,
  });

  return updated;
}

async function validateClinicalNote(patientId, noteId, user, req) {
  const patient = await ensurePatient(patientId, user, 'validate');
  const id = parseNumericId(noteId, 'clinical note id');
  const note = await prisma.clinicalNote.findUnique({ where: { id }, select: { id: true, patientId: true, status: true, transcriptionStatus: true } });
  if (!note || note.patientId !== patient) throw new HttpError(404, 'Clinical note not found');
  if (note.status === 'final') throw new HttpError(409, 'Clinical note is already final');
  if (note.transcriptionStatus !== 'transcribed') throw new HttpError(400, 'Only transcribed notes can be validated');
  const updated = await prisma.clinicalNote.update({
    where: { id },
    data: { status: 'final', signedAt: new Date(), transcriptionStatus: 'validated', validatedById: user.id, validatedAt: new Date() },
    include: { author: { select: { id: true, displayName: true } }, transcribedBy: { select: { id: true, displayName: true } }, validatedBy: { select: { id: true, displayName: true } } },
  });
  await recordAuditEvent({ req, actor: user, action: 'validate', resource: 'clinical_note', resourceId: id, patientId: patient, result: 'success', metadata: { transcriptionStatus: 'validated' }, required: true });
  return updated;
}

async function createClinicalNoteAddendum(patientId, noteId, payload = {}, user) {
  if (user?.role === 'receptionist') throw new HttpError(403, 'The secretary cannot add to a final clinical note');
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(noteId, 'clinical note id');
  const note = await prisma.clinicalNote.findFirst({ where: { id, patientId: patient }, select: { id: true, status: true } });
  if (!note) throw new HttpError(404, 'Clinical note not found');
  if (note.status !== 'final') throw new HttpError(400, 'Addenda are only available for final clinical notes');
  const body = optionalString(payload.body, 5000);
  if (!body) throw new HttpError(400, 'Addendum text is required');
  const latest = await prisma.clinicalNoteAddendum.findFirst({ where: { noteId: id }, orderBy: { version: 'desc' }, select: { version: true } });
  return prisma.clinicalNoteAddendum.create({
    data: { noteId: id, authorId: user.id, version: (latest?.version || 0) + 1, body },
  });
}

async function createTreatmentPlan(patientId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const id = await ensurePatient(patientId, user, 'write');
  const title = stringValue(payload.title);
  if (!title || title.length > 160) throw new HttpError(400, 'Treatment plan title is required');
  const status = validateEnum(payload.status || 'draft', VALID_PLAN_STATUSES, 'treatment plan status');

  return prisma.treatmentPlan.create({
    data: {
      patientId: id,
      createdById: user?.id ? parseNumericId(user.id, 'creator id') : null,
      title,
      status,
      notes: optionalString(payload.notes),
    },
    include: { items: true },
  });
}

async function updateTreatmentPlan(patientId, planId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(planId, 'treatment plan id');
  const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
  if (!existing || existing.patientId !== patient) throw new HttpError(404, 'Treatment plan not found');
  const title = stringValue(payload.title || existing.title);
  if (!title || title.length > 160) throw new HttpError(400, 'Treatment plan title is required');
  const status = validateEnum(payload.status || existing.status, VALID_PLAN_STATUSES, 'treatment plan status');

  return prisma.treatmentPlan.update({
    where: { id },
    data: { title, status, notes: optionalString(payload.notes ?? existing.notes) },
    include: { items: true },
  });
}

async function createTreatmentPlanItem(patientId, planId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const patient = await ensurePatient(patientId, user, 'write');
  const normalizedPlanId = parseNumericId(planId, 'treatment plan id');
  const plan = await prisma.treatmentPlan.findUnique({ where: { id: normalizedPlanId } });
  if (!plan || plan.patientId !== patient) throw new HttpError(404, 'Treatment plan not found');

  const procedureName = stringValue(payload.procedureName);
  if (!procedureName || procedureName.length > 160) throw new HttpError(400, 'Procedure name is required');
  const toothNumber = payload.toothNumber ? stringValue(payload.toothNumber) : null;
  if (toothNumber && !VALID_TOOTH_NUMBERS.has(toothNumber)) throw new HttpError(400, 'Invalid FDI tooth number');
  const surface = payload.surface ? validateEnum(payload.surface, VALID_SURFACES, 'tooth surface') : null;
  const status = validateEnum(payload.status || 'planned', VALID_PLAN_ITEM_STATUSES, 'treatment item status');
  const priority = Number(payload.priority || 1);
  if (!Number.isInteger(priority) || priority < 1 || priority > 9) throw new HttpError(400, 'Priority must be between 1 and 9');

  const appointmentId = payload.appointmentId
    ? parseNumericId(payload.appointmentId, 'appointment id')
    : null;
  if (appointmentId) await ensureAppointmentForPatient(appointmentId, patient, user);

  return prisma.treatmentPlanItem.create({
    data: {
      planId: normalizedPlanId,
      appointmentId,
      toothNumber,
      surface,
      procedureName,
      status,
      priority,
      notes: optionalString(payload.notes, 2000),
    },
  });
}

async function updateTreatmentPlanItem(patientId, itemId, payload = {}, user) {
  assertTranscriptionPayload(payload, user);
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(itemId, 'treatment plan item id');
  const existing = await prisma.treatmentPlanItem.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!existing || existing.plan.patientId !== patient) throw new HttpError(404, 'Treatment plan item not found');

  const procedureName = stringValue(payload.procedureName || existing.procedureName);
  if (!procedureName || procedureName.length > 160) throw new HttpError(400, 'Procedure name is required');
  const status = validateEnum(payload.status || existing.status, VALID_PLAN_ITEM_STATUSES, 'treatment item status');
  const priority = Number(payload.priority || existing.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 9) throw new HttpError(400, 'Priority must be between 1 and 9');
  const toothNumber = payload.toothNumber === undefined
    ? existing.toothNumber
    : payload.toothNumber
      ? stringValue(payload.toothNumber)
      : null;
  if (toothNumber && !VALID_TOOTH_NUMBERS.has(toothNumber)) throw new HttpError(400, 'Invalid FDI tooth number');
  const surface = payload.surface === undefined
    ? existing.surface
    : payload.surface
      ? validateEnum(payload.surface, VALID_SURFACES, 'tooth surface')
      : null;
  const appointmentId = payload.appointmentId === undefined
    ? existing.appointmentId
    : payload.appointmentId
      ? parseNumericId(payload.appointmentId, 'appointment id')
      : null;
  if (appointmentId) await ensureAppointmentForPatient(appointmentId, patient, user);

  return prisma.treatmentPlanItem.update({
    where: { id },
    data: {
      procedureName,
      toothNumber,
      surface,
      status,
      priority,
      notes: optionalString(payload.notes ?? existing.notes, 2000),
      appointmentId,
    },
  });
}

async function deleteTreatmentPlanItem(patientId, itemId, user) {
  if (user?.role === 'receptionist') throw new HttpError(403, 'The secretary cannot delete clinical plan items');
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(itemId, 'treatment plan item id');
  const existing = await prisma.treatmentPlanItem.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!existing || existing.plan.patientId !== patient) {
    throw new HttpError(404, 'Treatment plan item not found');
  }
  try {
    await prisma.treatmentPlanItem.delete({ where: { id } });
    return { message: 'Treatment plan item removed successfully' };
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Treatment plan item not found');
    throw error;
  }
}

module.exports = {
  getClinicalRecord,
  updateClinicalProfile,
  upsertToothChartEntry,
  deleteToothChartEntry,
  createClinicalNote,
  updateClinicalNote,
  normalizeClinicalTreatments,
  finalizeClinicalNote,
  validateClinicalNote,
  createClinicalNoteAddendum,
  createTreatmentPlan,
  updateTreatmentPlan,
  createTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
};
