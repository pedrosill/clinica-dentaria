/* ================================
   Imports
================================ */
import {
  getAppointmentDateTime,
  getPatientDisplayName,
} from './agendaUtils';

/* ================================
   Helpers: formatting
================================ */
export function formatPatientCreatedDate(dateValue) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

/* ================================
   Helpers: patient search
   Centralize dashboard search rules
   so they are easy to evolve later.
================================ */
export function filterDashboardPatients(patients, searchTerm) {
  const normalizedSearchTerm = String(searchTerm || '').trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return patients;
  }

  return patients.filter((patient) => {
    const fullName = getPatientDisplayName(patient).toLowerCase();
    const phone = String(patient.phone || '').toLowerCase();
    const email = String(patient.email || '').toLowerCase();
    const nationality = String(patient.nationality || '').toLowerCase();

    return (
      fullName.includes(normalizedSearchTerm) ||
      phone.includes(normalizedSearchTerm) ||
      email.includes(normalizedSearchTerm) ||
      nationality.includes(normalizedSearchTerm)
    );
  });
}

/* ================================
   Helpers: upcoming appointments
   Dashboard should show the nearest
   appointments first, not raw array order.
================================ */
export function buildDashboardUpcomingAppointments(appointments) {
  const now = new Date();
  const activeStatuses = new Set(['scheduled', 'arrived']);

  return [...appointments]
    .filter((appointment) => {
      const status = appointment.status || 'scheduled';
      const appointmentDateTime = getAppointmentDateTime(appointment);

      return activeStatuses.has(status) && appointmentDateTime >= now;
    })
    .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second))
    .slice(0, 4);
}
