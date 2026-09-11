export function getActiveAppointmentTypes(appointmentTypes = []) {
  return appointmentTypes.filter(
    (type) => type?.isActive !== false && String(type?.name || '').trim()
  );
}

export function getAppointmentTypeOptions(appointmentTypes = [], historicalName = '') {
  const activeTypes = getActiveAppointmentTypes(appointmentTypes);
  const names = activeTypes.map((type) => type.name);
  const historical = String(historicalName || '').trim();

  if (historical && !names.includes(historical)) {
    names.push(historical);
  }

  return names.map((name) => ({ value: name, label: name }));
}

export function getAppointmentDurationOptions(appointmentTypes = [], historicalDuration) {
  const durations = new Set(
    getActiveAppointmentTypes(appointmentTypes)
      .map((type) => Number(type.duration))
      .filter((duration) => Number.isFinite(duration) && duration > 0)
  );
  const legacyDuration = Number(historicalDuration);

  if (Number.isFinite(legacyDuration) && legacyDuration > 0) {
    durations.add(legacyDuration);
  }

  return [...durations]
    .sort((first, second) => first - second)
    .map((duration) => ({ value: String(duration), label: `${duration} min` }));
}

export const EMPTY_APPOINTMENT_TYPE_OPTION = {
  value: '',
  label: 'No active appointment types configured',
  disabled: true,
};
