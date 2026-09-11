const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');

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

async function ensurePatient(patientId) {
  const id = parseNumericId(patientId, 'patient id');
  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return id;
}

async function getClinicalRecord(patientId) {
  const id = await ensurePatient(patientId);
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
        appointment: { select: { id: true, date: true, time: true, treatmentType: true } },
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

async function updateClinicalProfile(patientId, payload = {}) {
  const id = await ensurePatient(patientId);
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

async function upsertToothChartEntry(patientId, payload = {}) {
  const id = await ensurePatient(patientId);
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

async function deleteToothChartEntry(patientId, entryId) {
  const patient = await ensurePatient(patientId);
  const id = parseNumericId(entryId, 'tooth chart entry id');
  const entry = await prisma.toothChartEntry.findFirst({ where: { id, patientId: patient } });
  if (!entry) throw new HttpError(404, 'Tooth chart entry not found');
  await prisma.toothChartEntry.delete({ where: { id } });
  return { message: 'Tooth chart entry removed successfully' };
}

async function createClinicalNote(patientId, payload = {}, authorId = null) {
  const id = await ensurePatient(patientId);
  const status = validateEnum(payload.status || 'draft', VALID_NOTE_STATUSES, 'clinical note status');
  const appointmentId = payload.appointmentId ? parseNumericId(payload.appointmentId, 'appointment id') : null;

  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.patientId !== id) {
      throw new HttpError(400, 'Appointment does not belong to this patient');
    }
  }

  const data = {
    patientId: id,
    appointmentId,
    authorId: authorId ? parseNumericId(authorId, 'author id') : null,
    chiefComplaint: optionalString(payload.chiefComplaint),
    clinicalFindings: optionalString(payload.clinicalFindings),
    diagnosis: optionalString(payload.diagnosis),
    treatmentPerformed: optionalString(payload.treatmentPerformed),
    recommendations: optionalString(payload.recommendations),
    status,
    signedAt: status === 'final' ? new Date() : null,
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

async function updateClinicalNote(noteId, payload = {}, authorId = null) {
  const id = parseNumericId(noteId, 'clinical note id');
  const existing = await prisma.clinicalNote.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Clinical note not found');
  if (existing.status === 'final') throw new HttpError(409, 'Final clinical notes cannot be edited');

  const status = validateEnum(payload.status || existing.status, VALID_NOTE_STATUSES, 'clinical note status');
  const appointmentId = payload.appointmentId ? parseNumericId(payload.appointmentId, 'appointment id') : null;

  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.patientId !== existing.patientId) {
      throw new HttpError(400, 'Appointment does not belong to this patient');
    }
  }

  return prisma.clinicalNote.update({
    where: { id },
    data: {
      appointmentId,
      authorId: authorId ? parseNumericId(authorId, 'author id') : existing.authorId,
      chiefComplaint: optionalString(payload.chiefComplaint),
      clinicalFindings: optionalString(payload.clinicalFindings),
      diagnosis: optionalString(payload.diagnosis),
      treatmentPerformed: optionalString(payload.treatmentPerformed),
      recommendations: optionalString(payload.recommendations),
      status,
      signedAt: status === 'final' ? new Date() : null,
    },
  });
}

async function createTreatmentPlan(patientId, payload = {}, createdById = null) {
  const id = await ensurePatient(patientId);
  const title = stringValue(payload.title);
  if (!title || title.length > 160) throw new HttpError(400, 'Treatment plan title is required');
  const status = validateEnum(payload.status || 'draft', VALID_PLAN_STATUSES, 'treatment plan status');

  return prisma.treatmentPlan.create({
    data: {
      patientId: id,
      createdById: createdById ? parseNumericId(createdById, 'creator id') : null,
      title,
      status,
      notes: optionalString(payload.notes),
    },
    include: { items: true },
  });
}

async function updateTreatmentPlan(planId, payload = {}) {
  const id = parseNumericId(planId, 'treatment plan id');
  const existing = await prisma.treatmentPlan.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Treatment plan not found');
  const title = stringValue(payload.title || existing.title);
  if (!title || title.length > 160) throw new HttpError(400, 'Treatment plan title is required');
  const status = validateEnum(payload.status || existing.status, VALID_PLAN_STATUSES, 'treatment plan status');

  return prisma.treatmentPlan.update({
    where: { id },
    data: { title, status, notes: optionalString(payload.notes ?? existing.notes) },
    include: { items: true },
  });
}

async function createTreatmentPlanItem(planId, payload = {}) {
  const normalizedPlanId = parseNumericId(planId, 'treatment plan id');
  const plan = await prisma.treatmentPlan.findUnique({ where: { id: normalizedPlanId } });
  if (!plan) throw new HttpError(404, 'Treatment plan not found');

  const procedureName = stringValue(payload.procedureName);
  if (!procedureName || procedureName.length > 160) throw new HttpError(400, 'Procedure name is required');
  const toothNumber = payload.toothNumber ? stringValue(payload.toothNumber) : null;
  if (toothNumber && !VALID_TOOTH_NUMBERS.has(toothNumber)) throw new HttpError(400, 'Invalid FDI tooth number');
  const surface = payload.surface ? validateEnum(payload.surface, VALID_SURFACES, 'tooth surface') : null;
  const status = validateEnum(payload.status || 'planned', VALID_PLAN_ITEM_STATUSES, 'treatment item status');
  const priority = Number(payload.priority || 1);
  if (!Number.isInteger(priority) || priority < 1 || priority > 9) throw new HttpError(400, 'Priority must be between 1 and 9');

  return prisma.treatmentPlanItem.create({
    data: {
      planId: normalizedPlanId,
      appointmentId: payload.appointmentId ? parseNumericId(payload.appointmentId, 'appointment id') : null,
      toothNumber,
      surface,
      procedureName,
      status,
      priority,
      notes: optionalString(payload.notes, 2000),
    },
  });
}

async function updateTreatmentPlanItem(itemId, payload = {}) {
  const id = parseNumericId(itemId, 'treatment plan item id');
  const existing = await prisma.treatmentPlanItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Treatment plan item not found');

  const procedureName = stringValue(payload.procedureName || existing.procedureName);
  if (!procedureName || procedureName.length > 160) throw new HttpError(400, 'Procedure name is required');
  const status = validateEnum(payload.status || existing.status, VALID_PLAN_ITEM_STATUSES, 'treatment item status');
  const priority = Number(payload.priority || existing.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 9) throw new HttpError(400, 'Priority must be between 1 and 9');

  return prisma.treatmentPlanItem.update({
    where: { id },
    data: {
      procedureName,
      toothNumber: payload.toothNumber ? stringValue(payload.toothNumber) : existing.toothNumber,
      surface: payload.surface ? validateEnum(payload.surface, VALID_SURFACES, 'tooth surface') : existing.surface,
      status,
      priority,
      notes: optionalString(payload.notes ?? existing.notes, 2000),
      appointmentId: payload.appointmentId ? parseNumericId(payload.appointmentId, 'appointment id') : existing.appointmentId,
    },
  });
}

async function deleteTreatmentPlanItem(itemId) {
  const id = parseNumericId(itemId, 'treatment plan item id');
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
  createTreatmentPlan,
  updateTreatmentPlan,
  createTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
};
