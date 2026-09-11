export function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getDoctorDetailPath(doctorIdValue) {
  const normalizedId = Number(doctorIdValue);
  return Number.isNaN(normalizedId) ? '/doctors' : `/doctors/${normalizedId}`;
}

export function matchesDoctorSearch(doctor, searchTerm) {
  const term = searchTerm.trim().toLowerCase();

  if (!term) return true;

  const name = String(doctor.name || '').toLowerCase();
  const email = String(doctor.email || '').toLowerCase();
  const phone = String(doctor.phone || '').toLowerCase();
  const specialty = String(doctor.specialty || '').toLowerCase();

  return (
    name.includes(term) ||
    email.includes(term) ||
    phone.includes(term) ||
    specialty.includes(term)
  );
}