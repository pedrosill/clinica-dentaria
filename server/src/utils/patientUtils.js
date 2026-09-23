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

  const rawDateOfBirth = String(payload.dateOfBirth || '').trim();
  let dateOfBirth = null;

  if (rawDateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDateOfBirth)) {
      dateOfBirth = new Date(NaN);
    } else {
      const [year, month, day] = rawDateOfBirth.split('-').map(Number);
      dateOfBirth = new Date(year, month - 1, day);
      if (dateOfBirth.getFullYear() !== year || dateOfBirth.getMonth() !== month - 1 || dateOfBirth.getDate() !== day) {
        dateOfBirth = new Date(NaN);
      }
    }
  }

  return {
    fullName: String(payload.fullName || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    nif: String(payload.nif || '').trim(),
    nationality,
    dateOfBirth,
  };
}

function validatePatientDateOfBirth({ dateOfBirth }) {
  if (!dateOfBirth) return;

  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new Error('Patient date of birth must be a valid date');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateOfBirth > today) {
    throw new Error('Patient date of birth cannot be in the future');
  }
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
  validatePatientDateOfBirth,
};
