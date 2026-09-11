const REPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'duration', label: 'Duration (min)' },
  { key: 'treatmentType', label: 'Treatment type' },
  { key: 'status', label: 'Status' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'patient', label: 'Patient' },
];

export const REPORT_STATUS_OPTIONS = ['scheduled', 'arrived', 'completed', 'cancelled', 'no_show'];

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateOnly, amount) {
  const date = new Date(`${dateOnly}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return formatLocalDate(date);
}

export function formatReportDate(dateOnly, locale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly || '')) return dateOnly || '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${dateOnly}T12:00:00`)
  );
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function downloadAppointmentReportCsv(rows) {
  const csvRows = [
    REPORT_COLUMNS.map((column) => csvValue(column.label)).join(','),
    ...rows.map((row) => REPORT_COLUMNS.map((column) => {
      const value = column.key === 'doctor'
        ? row.doctor?.name
        : column.key === 'patient'
          ? row.patient?.name
          : column.key === 'patientId'
            ? row.patient?.id
            : row[column.key];
      return csvValue(value);
    }).join(',')),
  ];
  const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dentalpro-appointments-report.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
