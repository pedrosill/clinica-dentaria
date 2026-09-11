const prisma = require('../lib/prisma');
const {
  buildPlaceholderEmail,
  buildPlaceholderNif,
  buildPlaceholderFullName,
} = require('../utils/patientUtils');

async function backfillPatientIdentityFields() {
  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      nif: true,
      nationality: true,
    },
  });

  for (const patient of patients) {
    const normalizedFullName = String(patient.fullName ?? '').trim();
    const normalizedEmail = String(patient.email ?? '').trim();
    const normalizedNif = String(patient.nif ?? '').trim();
    const normalizedNationality = String(patient.nationality ?? '').trim();

    await prisma.patient.update({
      where: {
        id: patient.id,
      },
      data: {
        fullName: normalizedFullName || buildPlaceholderFullName(patient.id),
        email: normalizedEmail || buildPlaceholderEmail(patient.id),
        nif: normalizedNif || buildPlaceholderNif(patient.id),
        nationality: normalizedNationality || 'Portuguese',
      },
    });
  }
}

module.exports = {
  backfillPatientIdentityFields,
};
