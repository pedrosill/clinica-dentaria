/* ================================
   Constants: time options
================================ */
export const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = String((index % 2) * 30).padStart(2, '0');
  return `${hours}:${minutes}`;
});

/* ================================
   Helpers: date formatting
================================ */
export function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat(typeof document !== 'undefined' && document.documentElement.lang === 'pt-PT' ? 'pt-PT' : 'en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

export function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat(typeof document !== 'undefined' && document.documentElement.lang === 'pt-PT' ? 'pt-PT' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

/* ================================
   Helpers: appointment status
================================ */
export function getStatusLabel(status) {
  const isPortuguese = typeof document !== 'undefined' && document.documentElement.lang === 'pt-PT';
  if (isPortuguese) {
    if (status === 'arrived') return 'Chegado';
    if (status === 'completed') return 'Concluído';
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'no_show') return 'Falta';
    return 'Marcado';
  }
  if (status === 'arrived') return 'Arrived';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'no_show') return 'No-show';
  return 'Scheduled';
}

export function getStatusClasses(status) {
  if (status === 'arrived') {
    return 'bg-sky-50 text-sky-700 ring-sky-100';
  }

  if (status === 'completed') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }

  if (status === 'cancelled' || status === 'no_show') {
    return 'bg-rose-50 text-rose-700 ring-rose-100';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200';
}
