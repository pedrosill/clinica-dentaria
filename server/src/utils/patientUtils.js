function buildPlaceholderEmail(patientId) {
  return `patient${patientId}@placeholder.local`;
}

function buildPlaceholderNif(patientId) {
  return String(100000000 + Number(patientId)).slice(-9);
}

function buildPlaceholderFullName(patientId) {
  return `Patient ${patientId}`;
}

function normalizePatientPayload(payload = {}) {
  const rawNationality = String(payload.nationality || '').trim();
  const nationality = rawNationality.toLowerCase() === 'portuguesa'
    ? 'Portuguese'
    : rawNationality;

  return {
    fullName: String(payload.fullName || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    nif: String(payload.nif || '').trim(),
    nationality,
    dateOfBirth: payload.dateOfBirth ? new Date(`${payload.dateOfBirth}T00:00:00`) : null,
  };
}

function validatePatientContacts({ phone, email }) {
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error('Patient phone must contain between 7 and 15 digits');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '')) || String(email).length > 254) {
    throw new Error('Patient email is invalid');
  }
}

module.exports = {
  buildPlaceholderEmail,
  buildPlaceholderNif,
  buildPlaceholderFullName,
  normalizePatientPayload,
  validatePatientContacts,
};
