const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseDateOnly, parseNumericId } = require('../utils/parse');
const { isValidAppointmentDuration } = require('../utils/appointmentUtils');

const SETTINGS_ID = 1;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const SLOT_MINUTES = 30;

const DEFAULT_SCHEDULES = [
  { weekday: 0, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 1, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 2, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 3, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 4, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 5, isOpen: true, startTime: '08:00', endTime: '20:00' },
  { weekday: 6, isOpen: true, startTime: '08:00', endTime: '20:00' },
];

const DEFAULT_APPOINTMENT_TYPES = [
  { name: 'Consultation', duration: 30 },
  { name: 'Cleaning', duration: 60 },
  { name: 'Surgery', duration: 90 },
  { name: 'Root Canal', duration: 60 },
  { name: 'Braces', duration: 30 },
];

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function validateTime(value, label, { nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) {
    return null;
  }

  const normalized = String(value || '').trim();

  if (!TIME_PATTERN.test(normalized) || timeToMinutes(normalized) % SLOT_MINUTES !== 0) {
    throw new HttpError(400, `${label} must use a 30-minute time such as 08:00 or 08:30`);
  }

  return normalized;
}

function normalizeBreak(schedule, startTime, endTime) {
  const breakStart = validateTime(schedule.breakStart, 'Break start time', { nullable: true });
  const breakEnd = validateTime(schedule.breakEnd, 'Break end time', { nullable: true });

  if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
    throw new HttpError(400, 'Break start and end times must be provided together');
  }

  if (breakStart && (timeToMinutes(breakStart) < timeToMinutes(startTime) || timeToMinutes(breakEnd) > timeToMinutes(endTime) || timeToMinutes(breakStart) >= timeToMinutes(breakEnd))) {
    throw new HttpError(400, 'Break must sit inside the working hours');
  }

  return { breakStart, breakEnd };
}

function normalizeSchedule(schedule, weekday) {
  const startTime = validateTime(schedule.startTime || '08:00', 'Start time');
  const endTime = validateTime(schedule.endTime || '20:00', 'End time');

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new HttpError(400, 'Start time must be before end time');
  }

  const normalizedBreak = normalizeBreak(schedule, startTime, endTime);

  return {
    weekday,
    isOpen: Boolean(schedule.isOpen),
    startTime,
    endTime,
    ...normalizedBreak,
  };
}

function dateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(value) {
  return new Date(`${value}T00:00:00`);
}

async function ensureClinicSettings() {
  const existing = await prisma.clinicSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (existing) return existing;

  try {
    return await prisma.clinicSettings.create({
      data: {
        id: SETTINGS_ID,
        schedules: { create: DEFAULT_SCHEDULES },
        appointmentTypes: { create: DEFAULT_APPOINTMENT_TYPES },
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return prisma.clinicSettings.findUnique({ where: { id: SETTINGS_ID } });
    }
    throw error;
  }
}

async function getClinicSettings() {
  await ensureClinicSettings();

  const settings = await prisma.clinicSettings.findUnique({
    where: { id: SETTINGS_ID },
    include: {
      schedules: { orderBy: { weekday: 'asc' } },
      closures: { orderBy: { date: 'asc' } },
      appointmentTypes: { orderBy: [{ isActive: 'desc' }, { name: 'asc' }] },
    },
  });

  const providerSchedules = await prisma.providerSchedule.findMany({
    include: { doctor: true },
    orderBy: [{ doctorId: 'asc' }, { weekday: 'asc' }],
  });

  return {
    id: settings.id,
    clinicName: settings.clinicName,
    timezone: settings.timezone,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    schedules: settings.schedules,
    closures: settings.closures.map((closure) => ({
      ...closure,
      date: dateKey(closure.date),
    })),
    appointmentTypes: settings.appointmentTypes,
    providerSchedules,
  };
}

async function updateClinicSettings(payload = {}) {
  const clinicName = String(payload.clinicName || '').trim();
  const timezone = String(payload.timezone || '').trim();
  const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];

  if (!clinicName || clinicName.length > 120) {
    throw new HttpError(400, 'Clinic name is required and must be 120 characters or fewer');
  }

  if (!timezone || timezone.length > 80) {
    throw new HttpError(400, 'Timezone is required and must be 80 characters or fewer');
  }

  if (Number(payload.slotIntervalMinutes || SLOT_MINUTES) !== SLOT_MINUTES) {
    throw new HttpError(400, 'Appointment slots must remain 30 minutes');
  }

  if (schedules.length !== 7) {
    throw new HttpError(400, 'A schedule entry is required for every day of the week');
  }

  const normalizedSchedules = schedules.map((schedule, index) => normalizeSchedule(schedule, index));
  await ensureClinicSettings();

  await prisma.$transaction(async (transaction) => {
    await transaction.clinicSettings.update({
      where: { id: SETTINGS_ID },
      data: { clinicName, timezone, slotIntervalMinutes: SLOT_MINUTES },
    });

    for (const schedule of normalizedSchedules) {
      await transaction.clinicSchedule.update({
        where: { settingsId_weekday: { settingsId: SETTINGS_ID, weekday: schedule.weekday } },
        data: {
          isOpen: schedule.isOpen,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
        },
      });
    }
  });

  return getClinicSettings();
}

async function createClosure(payload = {}) {
  const date = String(payload.date || '').trim();
  const label = String(payload.label || '').trim();

  parseDateOnly(date, 'closure date');

  if (!label || label.length > 120) {
    throw new HttpError(400, 'Closure label is required and must be 120 characters or fewer');
  }

  await ensureClinicSettings();

  try {
    const closure = await prisma.clinicClosure.create({
      data: { settingsId: SETTINGS_ID, date: dateFromKey(date), label },
    });
    return { ...closure, date: dateKey(closure.date) };
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new HttpError(409, 'The clinic is already closed on that date');
    }
    throw error;
  }
}

async function deleteClosure(closureId) {
  const id = parseNumericId(closureId, 'closure id');
  const existing = await prisma.clinicClosure.findUnique({ where: { id } });

  if (!existing) throw new HttpError(404, 'Closure not found');

  await prisma.clinicClosure.delete({ where: { id } });
  return { message: 'Closure removed successfully' };
}

async function getDoctorScheduleForDate({ doctorId, date }) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const parsedDate = parseDateOnly(date, 'appointment date');
  const normalizedDate = dateKey(parsedDate);
  const settings = await ensureClinicSettings();
  const weekday = parsedDate.getDay();

  const [clinicSchedule, closure, providerSchedule] = await Promise.all([
    prisma.clinicSchedule.findUnique({
      where: { settingsId_weekday: { settingsId: settings.id, weekday } },
    }),
    prisma.clinicClosure.findUnique({
      where: { settingsId_date: { settingsId: settings.id, date: dateFromKey(normalizedDate) } },
    }),
    prisma.providerSchedule.findUnique({
      where: { doctorId_weekday: { doctorId: normalizedDoctorId, weekday } },
    }),
  ]);

  const source = providerSchedule || clinicSchedule || DEFAULT_SCHEDULES[weekday];
  const isClosed = Boolean(closure) || (providerSchedule
    ? !providerSchedule.isWorking
    : !source.isOpen);

  return {
    date: normalizedDate,
    weekday,
    isClosed,
    closureLabel: closure?.label || null,
    startTime: source.startTime,
    endTime: source.endTime,
    breakStart: source.breakStart || null,
    breakEnd: source.breakEnd || null,
    slotIntervalMinutes: settings.slotIntervalMinutes,
  };
}

async function updateProviderSchedule(doctorId, payload = {}) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const days = Array.isArray(payload.days) ? payload.days : [];

  const doctor = await prisma.doctor.findUnique({ where: { id: normalizedDoctorId } });
  if (!doctor) throw new HttpError(404, 'Doctor not found');
  if (days.length !== 7) throw new HttpError(400, 'A schedule entry is required for every day of the week');

  const normalizedDays = days.map((day, index) => {
    const normalized = normalizeSchedule(
      { ...day, isOpen: day.isWorking },
      index
    );
    return { ...normalized, isWorking: normalized.isOpen };
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.providerSchedule.deleteMany({ where: { doctorId: normalizedDoctorId } });

    if (normalizedDays.length > 0) {
      await transaction.providerSchedule.createMany({
        data: normalizedDays.map((day) => ({
          doctorId: normalizedDoctorId,
          weekday: day.weekday,
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime,
          breakStart: day.breakStart,
          breakEnd: day.breakEnd,
        })),
      });
    }
  });

  return getClinicSettings();
}

async function createAppointmentType(payload = {}) {
  const name = String(payload.name || '').trim();
  const duration = Number(payload.duration);

  if (!name || name.length > 80) throw new HttpError(400, 'Appointment type name is required');
  if (!isValidAppointmentDuration(duration)) throw new HttpError(400, 'Appointment duration must be a positive multiple of 30 minutes');

  await ensureClinicSettings();

  try {
    return await prisma.appointmentType.create({
      data: { settingsId: SETTINGS_ID, name, duration, isActive: payload.isActive !== false },
    });
  } catch (error) {
    if (error?.code === 'P2002') throw new HttpError(409, 'An appointment type with that name already exists');
    throw error;
  }
}

async function updateAppointmentType(typeId, payload = {}) {
  const id = parseNumericId(typeId, 'appointment type id');
  const name = String(payload.name || '').trim();
  const duration = Number(payload.duration);

  if (!name || name.length > 80) throw new HttpError(400, 'Appointment type name is required');
  if (!isValidAppointmentDuration(duration)) throw new HttpError(400, 'Appointment duration must be a positive multiple of 30 minutes');

  try {
    return await prisma.appointmentType.update({
      where: { id },
      data: { name, duration, isActive: payload.isActive !== false },
    });
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Appointment type not found');
    if (error?.code === 'P2002') throw new HttpError(409, 'An appointment type with that name already exists');
    throw error;
  }
}

async function deleteAppointmentType(typeId) {
  const id = parseNumericId(typeId, 'appointment type id');
  try {
    await prisma.appointmentType.update({ where: { id }, data: { isActive: false } });
    return { message: 'Appointment type archived successfully' };
  } catch (error) {
    if (error?.code === 'P2025') throw new HttpError(404, 'Appointment type not found');
    throw error;
  }
}

module.exports = {
  DEFAULT_APPOINTMENT_TYPES,
  DEFAULT_SCHEDULES,
  ensureClinicSettings,
  getClinicSettings,
  updateClinicSettings,
  createClosure,
  deleteClosure,
  getDoctorScheduleForDate,
  updateProviderSchedule,
  createAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
};
