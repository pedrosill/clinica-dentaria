const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { normalizePatientPayload } = require('../utils/patientUtils');

function validatePortugueseNif(nif, nationality) {
  if (String(nationality).trim().toLowerCase() !== 'portuguese') {
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

async function getPatients() {
  return prisma.patient.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function getPatientById(patientId) {
  const id = parseNumericId(patientId, 'patient id');

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
      },
    },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  return patient;
}

async function createPatient(payload) {
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

async function updatePatient(patientId, payload) {
  const id = parseNumericId(patientId, 'patient id');
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

  const existingPatient = await prisma.patient.findUnique({
    where: { id },
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

async function deletePatient(patientId) {
  const id = parseNumericId(patientId, 'patient id');

  const existingPatient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: true,
    },
  });

  if (!existingPatient) {
    throw new HttpError(404, 'Patient not found');
  }

  if (existingPatient.appointments.length > 0) {
    throw new HttpError(400, 'Cannot delete a patient with appointments');
  }

  await prisma.patient.delete({
    where: { id },
  });

  return {
    message: 'Patient deleted successfully',
  };
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};