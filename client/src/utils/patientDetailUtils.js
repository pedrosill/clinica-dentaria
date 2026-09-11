export function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getAppointmentDateTime(appointment) {
  const d = new Date(appointment.date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T${appointment.time}:00`);
}

export function getStatusClasses(status) {
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  }

  if (status === 'arrived') {
    return 'bg-sky-100 text-sky-800 ring-sky-200';
  }

  if (status === 'no_show' || status === 'cancelled') {
    return 'bg-rose-100 text-rose-800 ring-rose-200';
  }

  return 'bg-slate-200 text-slate-800 ring-slate-300';
}

export function getStatusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'arrived') return 'Arrived';
  if (status === 'no_show') return 'No-show';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}