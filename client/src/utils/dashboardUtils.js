/* ================================
   Imports
================================ */
import {
  getAppointmentDateTime,
  getAppLocale,
  getPatientDisplayName,
  isSameDay,
  isActiveAppointmentStatus,
} from './agendaUtils.js';

/* ================================
   Helpers: formatting
================================ */
export function formatPatientCreatedDate(dateValue, locale = getAppLocale()) {
  return new Intl.DateTimeFormat(locale, {
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
  return [...appointments]
    .filter((appointment) => {
      const status = appointment.status || 'scheduled';
      const appointmentDateTime = getAppointmentDateTime(appointment);

      return isActiveAppointmentStatus(status) && appointmentDateTime >= now;
    })
    .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second))
    .slice(0, 4);
}

/* ================================
   Helpers: today's operational view
   Keep the dashboard focused on the
   clinic's immediate workload without
   introducing another API request.
================================ */
export function buildDashboardTodayAppointments(
  appointments,
  referenceDate = new Date()
) {
  return [...appointments]
    .filter((appointment) => isSameDay(appointment.date, referenceDate))
    .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second));
}

export function buildDashboardTodaySummary(
  appointments,
  referenceDate = new Date()
) {
  const todayAppointments = buildDashboardTodayAppointments(appointments, referenceDate);
  const activeAppointments = todayAppointments.filter((appointment) =>
    isActiveAppointmentStatus(appointment.status || 'scheduled')
  );
  const arrivedAppointments = todayAppointments.filter(
    (appointment) => appointment.status === 'arrived'
  );
  const arrivedAppointment = arrivedAppointments[0] || null;
  const nextScheduledAppointment = activeAppointments.find(
    (appointment) => getAppointmentDateTime(appointment) >= referenceDate
  );

  return {
    appointments: todayAppointments,
    activeCount: activeAppointments.length,
    arrivedCount: arrivedAppointments.length,
    nextAppointment: arrivedAppointment || nextScheduledAppointment,
  };
}
