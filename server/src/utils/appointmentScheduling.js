const CLINIC_OPEN_HOUR = 8;
const CLINIC_CLOSE_HOUR = 20;
const SLOT_INTERVAL_MINUTES = 30;

function addMinutes(dateValue, minutes) {
  return new Date(dateValue.getTime() + minutes * 60 * 1000);
}

function formatTimeOnly(dateValue) {
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isPastSlot(slotStart, now) {
  return slotStart <= now;
}

function getClinicDayBounds(date) {
  const dayStart = new Date(`${date}T00:00:00`);
  const clinicOpen = new Date(dayStart);
  clinicOpen.setHours(CLINIC_OPEN_HOUR, 0, 0, 0);

  const clinicClose = new Date(dayStart);
  clinicClose.setHours(CLINIC_CLOSE_HOUR, 0, 0, 0);

  return { clinicOpen, clinicClose };
}

function buildAvailabilitySlots({
  clinicOpen,
  clinicClose,
  duration,
  bookedAppointments = [],
  now = new Date(),
}) {
  const normalizedDuration = Number(duration || 30);
  const slotOptions = [];

  for (
    let slotStart = new Date(clinicOpen);
    slotStart < clinicClose;
    slotStart = addMinutes(slotStart, SLOT_INTERVAL_MINUTES)
  ) {
    const slotEnd = addMinutes(slotStart, normalizedDuration);
    const overlapsExistingAppointment = bookedAppointments.some(
      (appointment) => appointment.start < slotEnd && appointment.end > slotStart
    );

    const status = isPastSlot(slotStart, now)
      ? 'unavailable'
      : slotEnd > clinicClose
      ? 'unavailable'
      : overlapsExistingAppointment
        ? 'booked'
        : 'free';

    slotOptions.push({
      time: formatTimeOnly(slotStart),
      status,
    });
  }

  return slotOptions;
}

module.exports = {
  CLINIC_OPEN_HOUR,
  CLINIC_CLOSE_HOUR,
  SLOT_INTERVAL_MINUTES,
  addMinutes,
  formatTimeOnly,
  isPastSlot,
  getClinicDayBounds,
  buildAvailabilitySlots,
};
