const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');

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

async function ensurePatient(patientId, user, action = 'read') {
  assertPermission(user, 'clinical', action);
  const id = parseNumericId(patientId, 'patient id');
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      archivedAt: null,
      ...(user.role === 'dentist' && action !== 'read'
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
        appointment: { select: { id: true, date: true, time: true, treatmentType: true } },
        addenda: { orderBy: { version: 'asc' } },
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

async function deleteToothChartEntry(patientId, entryId, user) {
  const patient = await ensurePatient(patientId, user, 'write');
  const id = parseNumericId(entryId, 'tooth chart entry id');
  const entry = await prisma.toothChartEntry.findFirst({ where: { id, patientId: patient } });
  if (!entry) throw new HttpError(404, 'Tooth chart entry not found');
  await prisma.toothChartEntry.delete({ where: { id } });
  return { message: 'Tooth chart entry removed successfully' };
}

async function createClinicalNote(patientId, payload = {}, user) {
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
    },
  });
  if (!existing || existing.patientId !== patient) throw new HttpError(404, 'Clinical note not found');
  if (existing.status === 'final') throw new HttpError(409, 'Final clinical notes cannot be edited');

  const status = validateEnum(payload.status || existing.status, VALID_NOTE_STATUSES, 'clinical note status');
  const appointmentId = payload.appointmentId === undefined || payload.appointmentId === null || payload.appointmentId === ''
    ? existing.appointmentId
    : parseNumericId(payload.appointmentId, 'appointment id');

  if (appointmentId) {
    await ensureAppointmentForPatient(appointmentId, patient, user);
  }

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
      status,
      signedAt: status === 'final' ? new Date() : null,
    },
  });
}

async function createClinicalNoteAddendum(patientId, noteId, payload = {}, user) {
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
  createClinicalNoteAddendum,
  createTreatmentPlan,
  updateTreatmentPlan,
  createTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
};
