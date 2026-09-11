const CLINIC_OPEN_MINUTES = 8 * 60;
const CLINIC_CLOSE_MINUTES = 20 * 60;

function isValidThirtyMinuteTimeSlot(time) {
  if (typeof time !== 'string') {
    return false;
  }

  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return false;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return false;
  }

  if (hours < 0 || hours > 23) {
    return false;
  }

  return [0, 30].includes(minutes);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidClinicAppointmentTime(time, duration = 30) {
  if (!isValidThirtyMinuteTimeSlot(time)) {
    return false;
  }

  const startMinutes = timeToMinutes(time);
  const normalizedDuration = Number(duration || 30);

  return (
    startMinutes >= CLINIC_OPEN_MINUTES &&
    startMinutes < CLINIC_CLOSE_MINUTES &&
    startMinutes + normalizedDuration <= CLINIC_CLOSE_MINUTES
  );
}

function isValidAppointmentDuration(duration) {
  const normalizedDuration = Number(duration);

  if (Number.isNaN(normalizedDuration) || normalizedDuration <= 0) {
    return false;
  }

  return normalizedDuration % 30 === 0;
}

function normalizeAppointmentPayload(payload = {}) {
  return {
    patientId: Number(payload.patientId),
    doctorId: Number(payload.doctorId),
    date: String(payload.date || '').trim(),
    time: String(payload.time || '').trim(),
    duration: Number(payload.duration) || 30,
    treatmentType: payload.treatmentType?.trim() || 'Consultation',
    performedTreatment: payload.performedTreatment?.trim() || null,
    status: payload.status?.trim() || 'scheduled',
    notes: payload.notes?.trim() || null,
    completionNotes: payload.completionNotes?.trim() || null,
  };
}

module.exports = {
  CLINIC_OPEN_MINUTES,
  CLINIC_CLOSE_MINUTES,
  isValidThirtyMinuteTimeSlot,
  isValidClinicAppointmentTime,
  isValidAppointmentDuration,
  normalizeAppointmentPayload,
};
