const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');

async function getDoctors() {
  return prisma.doctor.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

async function getDoctorById(doctorId) {
  const id = parseNumericId(doctorId, 'doctor id');

  const doctor = await prisma.doctor.findUnique({
    where: { id },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  return doctor;
}

async function createDoctor(payload) {
  const name = String(payload.name || '').trim();
  const email = payload.email?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const nif = payload.nif?.trim() || null;

  if (!name) {
    throw new HttpError(400, 'Doctor name is required');
  }

  const existingDoctorCount = await prisma.doctor.count();

  if (existingDoctorCount >= 1) {
    throw new HttpError(400, 'Only 1 doctor is supported for now');
  }

  return prisma.doctor.create({
    data: {
      name,
      email,
      phone,
      nif,
    },
  });
}

async function updateDoctor(doctorId, payload) {
  const id = parseNumericId(doctorId, 'doctor id');
  const name = String(payload.name || '').trim();
  const email = payload.email?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const nif = payload.nif?.trim() || null;

  if (!name) {
    throw new HttpError(400, 'Doctor name is required');
  }

  const existingDoctor = await prisma.doctor.findUnique({
    where: { id },
  });

  if (!existingDoctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  return prisma.doctor.update({
    where: { id },
    data: {
      name,
      email,
      phone,
      nif,
    },
  });
}

async function deleteDoctor(doctorId) {
  const id = parseNumericId(doctorId, 'doctor id');

  const existingDoctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      appointments: true,
    },
  });

  if (!existingDoctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  if (existingDoctor.appointments.length > 0) {
    throw new HttpError(400, 'Cannot delete a doctor with appointments');
  }

  await prisma.doctor.delete({
    where: { id },
  });

  return {
    message: 'Doctor deleted successfully',
  };
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};