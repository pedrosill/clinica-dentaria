const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { normalizePatientPayload, validatePatientContacts, validatePatientDateOfBirth } = require('../utils/patientUtils');
const { assertPermission } = require('../utils/authorization');

async function ensurePatientAccess(patientId, user, { write = false } = {}) {
  assertPermission(user, 'patient', write ? 'write' : 'read');
  const id = parseNumericId(patientId, 'patient id');
  const patient = await prisma.patient.findFirst({
    where: { id, archivedAt: null },
    select: { id: true },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  return id;
}

function validatePortugueseNif(nif, nationality) {
  if (!['portuguese', 'portuguesa'].includes(String(nationality).trim().toLowerCase())) {
    return;
  }

  if (!/^\d{9}$/.test(String(nif).trim())) {
    throw new HttpError(400, 'Portuguese NIF must contain exactly 9 digits');
  }
}

async function ensureUniquePatientNif(nif, excludedPatientId = null) {
  const existingPatient = await prisma.patient.findFirst({
    where: {
      nif,
      ...(excludedPatientId
        ? {
            NOT: {
              id: Number(excludedPatientId),
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existingPatient) {
    throw new HttpError(409, 'NIF already exists');
  }
}

async function getPatients(user) {
  assertPermission(user, 'patient', 'read');
  return prisma.patient.findMany({
    where: { archivedAt: null },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function getPatientById(patientId, user) {
  const id = await ensurePatientAccess(patientId, user);
  const appointmentWhere = {
    archivedAt: null,
  };

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        where: appointmentWhere,
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
      },
    },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  return patient;
}

async function createPatient(payload, user) {
  assertPermission(user, 'patient', 'write');
  const normalized = normalizePatientPayload(payload);

  if (
    !normalized.fullName ||
    !normalized.phone ||
    !normalized.email ||
    !normalized.nif ||
    !normalized.nationality
  ) {
    throw new HttpError(
      400,
      'Full name, phone, email, nif and nationality are required'
    );
  }

  try {
    validatePatientContacts(normalized);
    validatePatientDateOfBirth(normalized);
  } catch (error) {
    throw new HttpError(400, error.message);
  }

  validatePortugueseNif(normalized.nif, normalized.nationality);
  await ensureUniquePatientNif(normalized.nif);

  return prisma.patient.create({
    data: {
      fullName: normalized.fullName,
      phone: normalized.phone,
      email: normalized.email,
      nif: normalized.nif,
      nationality: normalized.nationality,
      dateOfBirth: normalized.dateOfBirth,
    },
  });
}

async function updatePatient(patientId, payload, user) {
  const id = await ensurePatientAccess(patientId, user, { write: true });
  const normalized = normalizePatientPayload(payload);

  if (
    !normalized.fullName ||
    !normalized.phone ||
    !normalized.email ||
    !normalized.nif ||
    !normalized.nationality
  ) {
    throw new HttpError(
      400,
      'Full name, phone, email, nif and nationality are required'
    );
  }

  try {
    validatePatientContacts(normalized);
    validatePatientDateOfBirth(normalized);
  } catch (error) {
    throw new HttpError(400, error.message);
  }

  const existingPatient = await prisma.patient.findUnique({
    where: { id, archivedAt: null },
  });

  if (!existingPatient) {
    throw new HttpError(404, 'Patient not found');
  }

  validatePortugueseNif(normalized.nif, normalized.nationality);
  await ensureUniquePatientNif(normalized.nif, id);

  return prisma.patient.update({
    where: { id },
    data: {
      fullName: normalized.fullName,
      phone: normalized.phone,
      email: normalized.email,
      nif: normalized.nif,
      nationality: normalized.nationality,
      dateOfBirth: normalized.dateOfBirth,
    },
  });
}

async function deletePatient(patientId, user) {
  assertPermission(user, 'patient', 'archive');
  const id = parseNumericId(patientId, 'patient id');

  const existingPatient = await prisma.patient.findFirst({
    where: { id },
    include: {
      appointments: true,
    },
  });

  if (!existingPatient) {
    throw new HttpError(404, 'Patient not found');
  }

  if (existingPatient.archivedAt) {
    throw new HttpError(404, 'Patient not found');
  }

  const archivedAt = new Date();
  await prisma.$transaction([
    prisma.patient.update({
      where: { id },
      data: { archivedAt },
    }),
    prisma.appointment.updateMany({
      where: {
        patientId: id,
        archivedAt: null,
        status: { in: ['scheduled', 'arrived'] },
      },
      data: { status: 'cancelled', archivedAt },
    }),
  ]);

  return {
    message: 'Patient archived successfully',
  };
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
