export function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function startOfWeek(date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

export function endOfWeek(date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  return value;
}

export function addDays(date, amount) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

export function isSameDay(firstDate, secondDate) {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isSameMonth(firstDate, secondDate) {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

export function formatDateInput(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatWeekRange(date) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const startLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(weekEnd);

  return `${startLabel} - ${endLabel}`;
}

export function formatCalendarMonth(date) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function getAppointmentDateTime(appointment) {
  const appointmentDate = new Date(appointment.date);
  const year = appointmentDate.getFullYear();
  const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
  const day = String(appointmentDate.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T${appointment.time}:00`);
}

export function getMonthDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const normalizedStart = startDay === 0 ? 6 : startDay - 1;
  const calendarStart = new Date(firstDayOfMonth);
  calendarStart.setDate(firstDayOfMonth.getDate() - normalizedStart);

  return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
}

export function getCalendarGridStart(date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = monthStart.getDay();
  const diff = startDay === 0 ? -6 : 1 - startDay;
  monthStart.setDate(monthStart.getDate() + diff);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

export function buildCalendarDays(date) {
  const gridStart = getCalendarGridStart(date);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getPatientDisplayName(patient) {
  if (!patient) {
    return 'Unknown patient';
  }

  const fullName = String(patient.fullName || '').trim();
  if (fullName) {
    return fullName;
  }

  const legacyName = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return legacyName || 'Unknown patient';
}

export function getStatusClasses(status) {
  if (status === 'arrived') {
    return 'bg-sky-100 text-sky-800 ring-sky-200';
  }

  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  }

  if (status === 'no_show' || status === 'cancelled') {
    return 'bg-rose-100 text-rose-800 ring-rose-200';
  }

  return 'bg-slate-200 text-slate-800 ring-slate-300';
}

export function getStatusLabel(status) {
  if (status === 'arrived') return 'Arrived';
  if (status === 'completed') return 'Completed';
  if (status === 'no_show') return 'No-show';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

export function getPatientDetailPath(patientIdValue) {
  const normalizedId = Number(patientIdValue);
  return Number.isNaN(normalizedId) ? '/patients' : `/patients/${normalizedId}`;
}