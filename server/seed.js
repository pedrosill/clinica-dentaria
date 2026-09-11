/* ================================
   Imports / Prisma
================================ */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ================================
   Seed helpers
================================ */
function buildPlaceholderEmail(patientId) {
  return `patient${patientId}@placeholder.local`;
}

function buildPlaceholderNif(patientId) {
  return String(100000000 + Number(patientId)).slice(-9);
}

/* ================================
   Seed data
================================ */
const patientsSeed = [
  {
  fullName: 'Maria Silva',
  phone: '912345678',
  email: 'maria.silva@example.com',
  nif: '100000001',
  nationality: 'Portuguese',
},
  {
    fullName: 'Joao Costa',
    phone: '913456789',
    email: 'joao.costa@example.com',
    nif: '100000002',
    nationality: 'Portuguese',
},
  {
    fullName: 'Ana Santos',
    phone: '914567890',
    email: 'ana.santos@example.com',
    nif: '100000003',
    nationality: 'Portuguese',
  },
  {
    fullName: 'Pedro Ferreira',
    phone: '915678901',
    email: 'pedro.ferreira@example.com',
    nif: '100000004',
    nationality: 'Portuguese',
  },
  {
    fullName: 'Carla Oliveira',
    phone: '916789022',
    email: 'carla.oliveira@example.com',
    nif: '100000005',
    nationality: 'Portuguese',
  },
];

const appointmentSeed = [
  { patientIndex: 0, date: '2026-10-02T00:00:00.000Z', time: '09:00', treatmentType: 'Consultation', notes: 'Initial consultation.' },
  { patientIndex: 1, date: '2026-10-03T00:00:00.000Z', time: '10:30', treatmentType: 'Cleaning', notes: 'Routine cleaning.' },
  { patientIndex: 2, date: '2026-10-05T00:00:00.000Z', time: '11:00', treatmentType: 'Surgery', notes: 'Wisdom tooth extraction.' },
  { patientIndex: 3, date: '2026-10-06T00:00:00.000Z', time: '14:00', treatmentType: 'Root Canal', notes: 'Follow-up root canal session.' },
  { patientIndex: 4, date: '2026-10-07T00:00:00.000Z', time: '15:30', treatmentType: 'Braces', notes: 'Adjustment appointment.' },
  { patientIndex: 0, date: '2026-10-10T00:00:00.000Z', time: '09:30', treatmentType: 'Cleaning', notes: 'Hygiene check.' },
  { patientIndex: 1, date: '2026-10-10T00:00:00.000Z', time: '11:00', treatmentType: 'Consultation', notes: 'Treatment review.' },
  { patientIndex: 2, date: '2026-10-10T00:00:00.000Z', time: '13:00', treatmentType: 'Surgery', notes: 'Post-op review.' },
  { patientIndex: 3, date: '2026-10-12T00:00:00.000Z', time: '10:00', treatmentType: 'Root Canal', notes: 'Pain assessment.' },
  { patientIndex: 4, date: '2026-10-14T00:00:00.000Z', time: '16:00', treatmentType: 'Braces', notes: 'Wire adjustment.' },
  { patientIndex: 0, date: '2026-10-15T00:00:00.000Z', time: '08:30', treatmentType: 'Consultation', notes: 'General check.' },
  { patientIndex: 1, date: '2026-10-18T00:00:00.000Z', time: '12:00', treatmentType: 'Cleaning', notes: 'Quarterly cleaning.' },
  { patientIndex: 2, date: '2026-10-20T00:00:00.000Z', time: '09:30', treatmentType: 'Surgery', notes: 'Procedure planning.' },
  { patientIndex: 3, date: '2026-10-22T00:00:00.000Z', time: '14:30', treatmentType: 'Root Canal', notes: 'Canal inspection.' },
  { patientIndex: 4, date: '2026-10-24T00:00:00.000Z', time: '17:00', treatmentType: 'Braces', notes: 'Bracket check.' },
  { patientIndex: 0, date: '2026-10-27T00:00:00.000Z', time: '10:30', treatmentType: 'Consultation', notes: 'Results review.' },
  { patientIndex: 1, date: '2026-10-29T00:00:00.000Z', time: '11:30', treatmentType: 'Cleaning', notes: 'Final cleaning this month.' },
];

/* ================================
   Backfill
================================ */
async function backfillPatientIdentityFields() {
  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      email: true,
      nif: true,
    },
  });

  for (const patient of patients) {
    const normalizedEmail = String(patient.email ?? '').trim();
    const normalizedNif = String(patient.nif ?? '').trim();

    if (normalizedEmail && normalizedNif) {
      continue;
    }

    await prisma.patient.update({
      where: {
        id: patient.id,
      },
      data: {
        email: normalizedEmail || buildPlaceholderEmail(patient.id),
        nif: normalizedNif || buildPlaceholderNif(patient.id),
      },
    });
  }
}

/* ================================
   Seed execution
================================ */
async function seedDatabase() {
  const existingPatients = await prisma.patient.count();
  const existingAppointments = await prisma.appointment.count();

  if (existingPatients > 0 || existingAppointments > 0) {
    console.log('Seed skipped: existing data found.');
    await backfillPatientIdentityFields();
    return;
  }

  const createdPatients = [];

  for (const patient of patientsSeed) {
    const createdPatient = await prisma.patient.create({
      data: patient,
    });

    createdPatients.push(createdPatient);
  }

  for (const appointment of appointmentSeed) {
    await prisma.appointment.create({
      data: {
        patientId: createdPatients[appointment.patientIndex].id,
        date: new Date(appointment.date),
        time: appointment.time,
        treatmentType: appointment.treatmentType,
        notes: appointment.notes,
      },
    });
  }

  await backfillPatientIdentityFields();
  console.log('Seed completed successfully.');
}

/* ================================
   CommonJS exports
================================ */
module.exports = {
  seedDatabase,
};

/* ================================
   Direct script execution
================================ */
if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
