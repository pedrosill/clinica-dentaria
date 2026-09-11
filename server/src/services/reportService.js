const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { assertPermission } = require('../utils/authorization');
const { parseDateOnly } = require('../utils/parse');

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;
const APPOINTMENT_STATUSES = ['scheduled', 'arrived', 'completed', 'cancelled', 'no_show'];

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(dateOnly, amount) {
  const date = new Date(`${dateOnly}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return formatDateOnly(date);
}

function calendarDayDifference(from, to) {
  const fromDate = parseDateOnly(from, 'from date');
  const toDate = parseDateOnly(to, 'to date');
  const fromUtc = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const toUtc = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

function parsePositiveInteger(value, fieldName, { maximum } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || (maximum && parsed > maximum)) {
    const limitMessage = maximum ? ` between 1 and ${maximum}` : '';
    throw new HttpError(400, `${fieldName} must be a positive integer${limitMessage}`);
  }
  return parsed;
}

function resolveDateRange(query = {}) {
  const hasFrom = query.from !== undefined;
  const hasTo = query.to !== undefined;
  const today = formatDateOnly(new Date());

  if (hasFrom && !String(query.from).trim()) throw new HttpError(400, 'Invalid from date');
  if (hasTo && !String(query.to).trim()) throw new HttpError(400, 'Invalid to date');

  const parsedFrom = hasFrom ? parseDateOnly(query.from, 'from date') : null;
  const parsedTo = hasTo ? parseDateOnly(query.to, 'to date') : null;
  const from = parsedFrom ? formatDateOnly(parsedFrom) : (parsedTo ? addCalendarDays(formatDateOnly(parsedTo), -DEFAULT_RANGE_DAYS) : today);
  const to = parsedTo ? formatDateOnly(parsedTo) : addCalendarDays(from, DEFAULT_RANGE_DAYS);
  const rangeDays = calendarDayDifference(from, to);

  if (rangeDays < 0) throw new HttpError(400, 'from date must be on or before to date');
  if (rangeDays >= MAX_RANGE_DAYS) {
    throw new HttpError(400, `The report date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }

  return { from, to };
}

function startOfDate(dateOnly) {
  return new Date(`${dateOnly}T00:00:00`);
}

function buildDateWhere(from, to) {
  return {
    gte: startOfDate(from),
    lt: startOfDate(addCalendarDays(to, 1)),
  };
}

function parseStatus(value) {
  if (value === undefined) return null;
  const status = String(value).trim();
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw new HttpError(400, 'Invalid appointment status');
  }
  return status;
}

async function resolveDoctorFilter(user, value) {
  const requestedDoctorId = value === undefined ? null : parsePositiveInteger(value, 'doctor id');
  const ownDoctorId = user.role === 'dentist' && user.doctorId !== null && user.doctorId !== undefined && Number.isInteger(Number(user.doctorId))
    ? Number(user.doctorId)
    : null;

  if (user.role === 'dentist' && ownDoctorId === null) {
    if (requestedDoctorId !== null) {
      throw new HttpError(403, 'Dentists may only report on their own appointments');
    }
    return -1;
  }

  if (user.role === 'dentist' && requestedDoctorId !== null && requestedDoctorId !== ownDoctorId) {
    throw new HttpError(403, 'Dentists may only report on their own appointments');
  }

  const doctorId = requestedDoctorId ?? ownDoctorId;
  if (doctorId === null) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true },
  });
  if (!doctor) throw new HttpError(404, 'Doctor not found');
  return doctor.id;
}

function serializeAppointment(appointment) {
  return {
    id: appointment.id,
    date: formatDateOnly(new Date(appointment.date)),
    time: appointment.time,
    duration: Number(appointment.duration || 30),
    treatmentType: appointment.treatmentType,
    status: appointment.status,
    doctor: appointment.doctor
      ? { id: appointment.doctor.id, name: appointment.doctor.name }
      : null,
    patient: appointment.patient
      ? { id: appointment.patient.id, name: appointment.patient.fullName }
      : null,
  };
}

async function getAppointmentReport(query, user) {
  assertPermission(user, 'report', 'read');
  const { from, to } = resolveDateRange(query);
  const doctorId = await resolveDoctorFilter(user, query.doctorId);
  const status = parseStatus(query.status);
  const limit = query.limit === undefined
    ? DEFAULT_LIMIT
    : parsePositiveInteger(query.limit, 'limit', { maximum: MAX_LIMIT });

  const where = {
    archivedAt: null,
    date: buildDateWhere(from, to),
    patient: { archivedAt: null },
    ...(doctorId === null ? {} : { doctorId }),
    ...(status ? { status } : {}),
  };

  const [total, groupedStatuses, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      select: {
        id: true,
        date: true,
        time: true,
        duration: true,
        treatmentType: true,
        status: true,
        doctor: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(APPOINTMENT_STATUSES.map((knownStatus) => [knownStatus, 0]));
  for (const groupedStatus of groupedStatuses) {
    if (Object.hasOwn(byStatus, groupedStatus.status)) {
      byStatus[groupedStatus.status] = groupedStatus._count._all;
    }
  }

  return {
    from,
    to,
    limit,
    hasMore: appointments.length > limit,
    summary: { total, byStatus },
    rows: appointments.slice(0, limit).map(serializeAppointment),
  };
}

module.exports = {
  APPOINTMENT_STATUSES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_RANGE_DAYS,
  getAppointmentReport,
  resolveDateRange,
};
