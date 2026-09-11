const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId, parseDateOnly } = require('../utils/parse');
const {
  isValidThirtyMinuteTimeSlot,
  isValidAppointmentDuration,
  normalizeAppointmentPayload,
} = require('../utils/appointmentUtils');

const appointmentListInclude = {
  patient: true,
  doctor: true,
};

const appointmentDetailInclude = {
  doctor: true,
  patient: {
    include: {
      appointments: {
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        include: {
          doctor: true,
        },
      },
    },
  },
};

const SLOT_INTERVAL_MINUTES = 10;
const DEFAULT_DAY_START = '08:00';
const DEFAULT_DAY_END = '18:00';
const RECOMMENDATION_HORIZON_DAYS = 30;
const ACTIVE_RESCHEDULING_STATUSES = ['scheduled', 'arrived'];

function toDateOnlyString(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function addDays(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return toDateOnlyString(date);
}

function buildInterval(date, startTime, duration) {
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(start.getTime() + Number(duration || 30) * 60 * 1000);

  return { start, end };
}

function intervalsOverlap(first, second) {
  return first.start < second.end && first.end > second.start;
}

async function getDoctorAppointmentsForDate({
  doctorId,
  date,
  excludeAppointmentId = null,
}) {
  return prisma.appointment.findMany({
    where: {
      doctorId: Number(doctorId),
      date: new Date(`${date}T00:00:00`),
      status: {
        in: ACTIVE_RESCHEDULING_STATUSES,
      },
      ...(excludeAppointmentId
        ? {
            NOT: {
              id: Number(excludeAppointmentId),
            },
          }
        : {}),
    },
    include: {
      patient: true,
    },
    orderBy: {
      time: 'asc',
    },
  });
}

function mapBookedIntervals(appointments, date) {
  return appointments.map((appointment) => {
    const duration = Number(appointment.duration || 30);
    const interval = buildInterval(date, appointment.time, duration);

    return {
      appointmentId: appointment.id,
      start: appointment.time,
      end: minutesToTime(timeToMinutes(appointment.time) + duration),
      duration,
      status: appointment.status,
      patient: appointment.patient
        ? {
            id: appointment.patient.id,
            name: `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim(),
          }
        : null,
      _start: interval.start,
      _end: interval.end,
    };
  });
}

function buildSelectableSlots({
  date,
  duration,
  bookedIntervals,
  dayStart = DEFAULT_DAY_START,
  dayEnd = DEFAULT_DAY_END,
}) {
  const requestedDuration = Number(duration || 30);
  const slots = [];
  const startMinutes = timeToMinutes(dayStart);
  const endMinutes = timeToMinutes(dayEnd);

  for (
    let cursor = startMinutes;
    cursor + requestedDuration <= endMinutes;
    cursor += SLOT_INTERVAL_MINUTES
  ) {
    const start = minutesToTime(cursor);
    const end = minutesToTime(cursor + requestedDuration);

    const candidate = buildInterval(date, start, requestedDuration);

    const overlaps = bookedIntervals.some((booked) =>
      intervalsOverlap(candidate, {
        start: booked._start,
        end: booked._end,
      })
    );

    if (!overlaps) {
      slots.push({
        start,
        end,
        duration: requestedDuration,
      });
    }
  }

  return slots;
}

async function findRecommendedSlot({
  doctorId,
  appointmentId,
  inspectedDate,
  duration,
  selectableSlots,
}) {
  if (selectableSlots.length > 0) {
    return {
      type: 'inspected_day_best',
      date: inspectedDate,
      start: selectableSlots[0].start,
      end: selectableSlots[0].end,
      duration: Number(duration || 30),
      reason: 'Earliest available slot on inspected date',
    };
  }

  for (let offset = 1; offset <= RECOMMENDATION_HORIZON_DAYS; offset += 1) {
    const nextDate = addDays(inspectedDate, offset);

    const appointments = await getDoctorAppointmentsForDate({
      doctorId,
      date: nextDate,
      excludeAppointmentId: appointmentId,
    });

    const bookedIntervals = mapBookedIntervals(appointments, nextDate);
    const slots = buildSelectableSlots({
      date: nextDate,
      duration,
      bookedIntervals,
    });

    if (slots.length > 0) {
      return {
        type: 'next_available',
        date: nextDate,
        start: slots[0].start,
        end: slots[0].end,
        duration: Number(duration || 30),
        reason: 'Earliest available slot for the same doctor',
      };
    }
  }

  return null;
}

async function getRescheduleOptions({ appointmentId, date, duration }) {
  const id = parseNumericId(appointmentId, 'appointment id');

  const appointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
    throw new HttpError(
      409,
      'Reschedule inspection is not allowed for this appointment status'
    );
  }

  const inspectedDate = date
    ? formatDateOnly(parseDateOnly(date, 'inspection date'))
    : toDateOnlyString(appointment.date);
  const requestedDuration = duration === undefined
    ? Number(appointment.duration || 30)
    : Number(duration);

  if (!isValidAppointmentDuration(requestedDuration)) {
    throw new HttpError(
      400,
      'Appointment duration must be a positive multiple of 30 minutes'
    );
  }

  const availability = await getAvailableStartTimes({
    doctorId: appointment.doctorId,
    date: inspectedDate,
    duration: requestedDuration,
    excludeAppointmentId: appointment.id,
  });

  const nextAvailable = availability.availableStartTimes.length > 0
    ? {
        date: inspectedDate,
        start: availability.availableStartTimes[0],
        end: minutesToTime(
          timeToMinutes(availability.availableStartTimes[0]) + requestedDuration
        ),
        duration: requestedDuration,
        reason: 'Earliest available slot on inspected date',
      }
    : await findNextAvailableDate({
        doctorId: appointment.doctorId,
        startDate: inspectedDate,
        duration: requestedDuration,
        excludeAppointmentId: appointment.id,
      });

  return {
    appointment: {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: toDateOnlyString(appointment.date),
      time: appointment.time,
      duration: Number(appointment.duration || 30),
      status: appointment.status,
      treatmentType: appointment.treatmentType,
    },
    inspection: {
      date: inspectedDate,
      doctorId: appointment.doctorId,
      slotIntervalMinutes: RESCHEDULE_SLOT_STEP_MINUTES,
      requestedDuration,
      workingDayStart: availability.clinicOpenTime,
      workingDayEnd: availability.clinicCloseTime,
    },
    bookedIntervals: availability.bookedAppointments.map((bookedAppointment) => ({
      appointmentId: bookedAppointment.id,
      start: bookedAppointment.startTime,
      end: bookedAppointment.endTime,
      duration: bookedAppointment.duration,
      status: bookedAppointment.status,
      patient: bookedAppointment.patient,
      treatmentType: bookedAppointment.treatmentType,
    })),
    selectableSlots: availability.availableStartTimes.map((start) => ({
      start,
      end: minutesToTime(timeToMinutes(start) + requestedDuration),
      duration: requestedDuration,
    })),
    recommendation: nextAvailable,
  };
}

const CLINIC_OPEN_HOUR = 8;
const CLINIC_CLOSE_HOUR = 20;
const RESCHEDULE_SLOT_STEP_MINUTES = 30;
const RESCHEDULE_SCAN_LIMIT_DAYS = 60;
const BLOCKING_STATUSES = ['cancelled', 'no_show'];

function buildDateTime(date, time) {
  return new Date(`${date}T${String(time)}:00`);
}

function formatDateOnly(dateValue) {
  const value = new Date(dateValue);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeOnly(dateValue) {
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function addMinutes(dateValue, minutes) {
  return new Date(dateValue.getTime() + minutes * 60 * 1000);
}

function startOfDate(date) {
  return new Date(`${date}T00:00:00`);
}

function getClinicDayBounds(date) {
  const dayStart = new Date(`${date}T00:00:00`);
  const clinicOpen = new Date(dayStart);
  clinicOpen.setHours(CLINIC_OPEN_HOUR, 0, 0, 0);

  const clinicClose = new Date(dayStart);
  clinicClose.setHours(CLINIC_CLOSE_HOUR, 0, 0, 0);

  return {
    clinicOpen,
    clinicClose,
  };
}

function isBlockedStatus(status) {
  return BLOCKING_STATUSES.includes(status);
}

function toScheduleItem(appointment, date) {
  const start = buildDateTime(date, appointment.time);
  const duration = Number(appointment.duration || 30);
  const end = addMinutes(start, duration);

  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    status: appointment.status,
    time: appointment.time,
    duration,
    start,
    end,
    startTime: formatTimeOnly(start),
    endTime: formatTimeOnly(end),
    treatmentType: appointment.treatmentType,
    notes: appointment.notes,
    patient: appointment.patient || null,
    doctor: appointment.doctor || null,
  };
}

async function getDoctorAppointmentsForDate({
  doctorId,
  date,
  excludeAppointmentId = null,
}) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const normalizedDate = formatDateOnly(parseDateOnly(date, 'appointment date'));
  const normalizedExcludeAppointmentId =
    excludeAppointmentId !== null && excludeAppointmentId !== undefined
      ? parseNumericId(excludeAppointmentId, 'appointment id')
      : null;

  return prisma.appointment.findMany({
    where: {
      doctorId: normalizedDoctorId,
      date: startOfDate(normalizedDate),
      status: {
        notIn: BLOCKING_STATUSES,
      },
      ...(normalizedExcludeAppointmentId
        ? {
            NOT: {
              id: normalizedExcludeAppointmentId,
            },
          }
        : {}),
    },
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: {
      time: 'asc',
    },
  });
}

async function findAppointmentConflict({
  appointmentId = null,
  doctorId,
  date,
  time,
  duration,
}) {
  const normalizedDoctorId = Number(doctorId);
  const normalizedAppointmentId = appointmentId ? Number(appointmentId) : null;

  const requestedStart = buildDateTime(date, time);
  const requestedDuration = Number(duration || 30);
  const requestedEnd = addMinutes(requestedStart, requestedDuration);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: normalizedDoctorId,
      date: new Date(`${date}T00:00:00`),
      ...(normalizedAppointmentId
        ? {
            NOT: {
              id: normalizedAppointmentId,
            },
          }
        : {}),
      status: {
        notIn: BLOCKING_STATUSES,
      },
    },
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: {
      time: 'asc',
    },
  });

  const conflictingAppointment = existingAppointments.find((appointment) => {
    const existingStart = buildDateTime(date, appointment.time);
    const existingDuration = Number(appointment.duration || 30);
    const existingEnd = addMinutes(existingStart, existingDuration);

    return existingStart < requestedEnd && existingEnd > requestedStart;
  });

  return conflictingAppointment || null;
}

async function getDoctorDaySchedule({
  doctorId,
  date,
  excludeAppointmentId = null,
}) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const normalizedDate = formatDateOnly(parseDateOnly(date, 'appointment date'));

  await ensureDoctorExists(normalizedDoctorId);

  const appointments = await getDoctorAppointmentsForDate({
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    excludeAppointmentId,
  });

  const bookedAppointments = appointments.map((appointment) =>
    toScheduleItem(appointment, normalizedDate)
  );

  const { clinicOpen, clinicClose } = getClinicDayBounds(normalizedDate);

  return {
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    clinicOpenTime: formatTimeOnly(clinicOpen),
    clinicCloseTime: formatTimeOnly(clinicClose),
    bookedAppointments,
  };
}

async function getAvailableStartTimes({
  doctorId,
  date,
  duration,
  excludeAppointmentId = null,
}) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const normalizedDate = formatDateOnly(parseDateOnly(date, 'appointment date'));
  const normalizedDuration = Number(duration);

  if (!isValidAppointmentDuration(normalizedDuration)) {
    throw new HttpError(
      400,
      'Appointment duration must be a positive multiple of 30 minutes'
    );
  }

  await ensureDoctorExists(normalizedDoctorId);

  const schedule = await getDoctorDaySchedule({
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    excludeAppointmentId,
  });

  const { clinicOpen, clinicClose } = getClinicDayBounds(normalizedDate);
  const availableStartTimes = [];
  const slotOptions = [];

  for (
    let slotStart = new Date(clinicOpen);
    slotStart < clinicClose;
    slotStart = addMinutes(slotStart, RESCHEDULE_SLOT_STEP_MINUTES)
  ) {
    const slotEnd = addMinutes(slotStart, normalizedDuration);

    const overlapsExistingAppointment = schedule.bookedAppointments.some(
      (appointment) => appointment.start < slotEnd && appointment.end > slotStart
    );

    const status = slotEnd > clinicClose
      ? 'unavailable'
      : overlapsExistingAppointment
        ? 'booked'
        : 'free';

    slotOptions.push({
      time: formatTimeOnly(slotStart),
      status,
    });

    if (status === 'free') {
      availableStartTimes.push(formatTimeOnly(slotStart));
    }
  }

  return {
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    duration: normalizedDuration,
    clinicOpenTime: schedule.clinicOpenTime,
    clinicCloseTime: schedule.clinicCloseTime,
    bookedAppointments: schedule.bookedAppointments.map((appointment) => ({
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      status: appointment.status,
      patientId: appointment.patientId,
      patient: appointment.patient,
    treatmentType: appointment.treatmentType,
      })),
    availableStartTimes,
    slotOptions,
  };
}

async function getAppointmentAvailability({
  doctorId,
  date,
  duration,
  excludeAppointmentId = null,
}) {
  const availability = await getAvailableStartTimes({
    doctorId,
    date,
    duration,
    excludeAppointmentId,
  });

  return {
    doctorId: availability.doctorId,
    date: availability.date,
    duration: availability.duration,
    clinicOpenTime: availability.clinicOpenTime,
    clinicCloseTime: availability.clinicCloseTime,
    slots: availability.slotOptions,
    bookedAppointments: availability.bookedAppointments,
  };
}

async function findNextAvailableDate({
  doctorId,
  startDate,
  duration,
  excludeAppointmentId = null,
}) {
  const normalizedDoctorId = parseNumericId(doctorId, 'doctor id');
  const normalizedStartDate = formatDateOnly(parseDateOnly(startDate, 'appointment date'));
  const normalizedDuration = Number(duration);

  if (!isValidAppointmentDuration(normalizedDuration)) {
    throw new HttpError(
      400,
      'Appointment duration must be a positive multiple of 30 minutes'
    );
  }

  await ensureDoctorExists(normalizedDoctorId);

  const scanDate = new Date(`${normalizedStartDate}T00:00:00`);

  for (let offset = 0; offset < RESCHEDULE_SCAN_LIMIT_DAYS; offset += 1) {
    const currentDate = new Date(scanDate);
    currentDate.setDate(scanDate.getDate() + offset);

    const currentDateString = formatDateOnly(currentDate);

    const availability = await getAvailableStartTimes({
      doctorId: normalizedDoctorId,
      date: currentDateString,
      duration: normalizedDuration,
      excludeAppointmentId,
    });

    if (availability.availableStartTimes.length > 0) {
      return {
        doctorId: normalizedDoctorId,
        date: currentDateString,
        earliestStartTime: availability.availableStartTimes[0],
        availableStartTimes: availability.availableStartTimes,
      };
    }
  }

  return null;
}

function validateAppointmentPayload(payload, { legacyTime } = {}) {
  if (!payload.patientId || !payload.doctorId || !payload.date || !payload.time) {
    throw new HttpError(400, 'Patient, doctor, date and time are required');
  }

  const patientId = Number(payload.patientId);
  const doctorId = Number(payload.doctorId);

  if (Number.isNaN(patientId)) {
    throw new HttpError(400, 'Invalid patient id');
  }

  if (Number.isNaN(doctorId)) {
    throw new HttpError(400, 'Invalid doctor id');
  }

  parseDateOnly(payload.date, 'appointment date');

  if (!isValidThirtyMinuteTimeSlot(payload.time) && payload.time !== legacyTime) {
    throw new HttpError(
      400,
      'Appointment time must use 30-minute slots such as 09:00 or 09:30'
    );
  }

  if (!isValidAppointmentDuration(payload.duration)) {
    throw new HttpError(
      400,
      'Appointment duration must be a positive multiple of 30 minutes'
    );
  }
}

async function ensurePatientExists(patientId) {
  const patient = await prisma.patient.findUnique({
    where: {
      id: patientId,
    },
  });

  if (!patient) {
    throw new HttpError(404, 'Patient not found');
  }

  return patient;
}

async function ensureDoctorExists(doctorId) {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id: doctorId,
    },
  });

  if (!doctor) {
    throw new HttpError(404, 'Doctor not found');
  }

  return doctor;
}

async function getAppointments() {
  return prisma.appointment.findMany({
    include: appointmentListInclude,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
}

async function getAppointmentById(appointmentId) {
  const id = parseNumericId(appointmentId, 'appointment id');

  const appointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
    include: appointmentDetailInclude,
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  return appointment;
}

async function createAppointment(payload) {
  const normalized = normalizeAppointmentPayload(payload);

  validateAppointmentPayload(normalized);
  await ensurePatientExists(normalized.patientId);
  await ensureDoctorExists(normalized.doctorId);

  const conflictingAppointment = await findAppointmentConflict({
    doctorId: normalized.doctorId,
    date: normalized.date,
    time: normalized.time,
    duration: normalized.duration,
  });

  if (conflictingAppointment) {
    throw new HttpError(
      409,
      `This time slot is already booked for Dr. ${
        conflictingAppointment.doctor?.name || 'assigned doctor'
      }`
    );
  }

  return prisma.appointment.create({
    data: {
      patientId: normalized.patientId,
      doctorId: normalized.doctorId,
      date: new Date(`${normalized.date}T00:00:00`),
      time: normalized.time,
      duration: normalized.duration,
      treatmentType: normalized.treatmentType,
      performedTreatment: normalized.performedTreatment,
      status: normalized.status,
      notes: normalized.notes,
      completionNotes: normalized.completionNotes,
    },
    include: appointmentListInclude,
  });
}

async function updateAppointment(appointmentId, payload) {
  const id = parseNumericId(appointmentId, 'appointment id');
  const normalized = normalizeAppointmentPayload(payload);

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  validateAppointmentPayload(normalized, {
    legacyTime: existingAppointment.time,
  });

  await ensurePatientExists(normalized.patientId);
  await ensureDoctorExists(normalized.doctorId);

  const conflictingAppointment = await findAppointmentConflict({
    appointmentId: id,
    doctorId: normalized.doctorId,
    date: normalized.date,
    time: normalized.time,
    duration: normalized.duration,
  });

  if (conflictingAppointment) {
    throw new HttpError(
      409,
      `This time slot is already booked for Dr. ${
        conflictingAppointment.doctor?.name || 'assigned doctor'
      }`
    );
  }

  return prisma.appointment.update({
    where: {
      id,
    },
    data: {
      patientId: normalized.patientId,
      doctorId: normalized.doctorId,
      date: new Date(`${normalized.date}T00:00:00`),
      time: normalized.time,
      duration: normalized.duration,
      treatmentType: normalized.treatmentType,
      performedTreatment:
        payload.performedTreatment !== undefined
          ? normalized.performedTreatment
          : existingAppointment.performedTreatment,
      status: normalized.status || existingAppointment.status || 'scheduled',
      notes: normalized.notes,
      completionNotes:
        payload.completionNotes !== undefined
          ? normalized.completionNotes
          : existingAppointment.completionNotes,
    },
    include: appointmentDetailInclude,
  });
}

async function concludeAppointment(appointmentId, payload) {
  const id = parseNumericId(appointmentId, 'appointment id');
  const performedTreatment = String(payload.performedTreatment || '').trim();
  const completionNotes = payload.completionNotes?.trim() || null;

  if (!performedTreatment) {
    throw new HttpError(400, 'Performed treatment is required');
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  return prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status: 'completed',
      performedTreatment,
      completionNotes,
    },
    include: appointmentDetailInclude,
  });
}

async function deleteAppointment(appointmentId) {
  const id = parseNumericId(appointmentId, 'appointment id');

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  await prisma.appointment.delete({
    where: {
      id,
    },
  });

  return {
    message: 'Appointment deleted successfully',
  };
}

async function updateAppointmentStatus(appointmentId, payload) {
  const id = parseNumericId(appointmentId, 'appointment id');
  const { status } = payload;
  const supportedStatuses = ['scheduled', 'arrived', 'completed', 'cancelled', 'no_show'];

  if (!status || !supportedStatuses.includes(status)) {
    throw new HttpError(400, 'Invalid appointment status');
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  return prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: appointmentListInclude,
  });
}

async function getDebugPatients() {
  return prisma.patient.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
}

module.exports = {
  getAppointments,
  getAppointmentById,
  getAppointmentAvailability,
  getRescheduleOptions, // ADD THIS
  createAppointment,
  updateAppointment,
  concludeAppointment,
  deleteAppointment,
  updateAppointmentStatus,
  getDebugPatients,
  getDoctorDaySchedule,
  getAvailableStartTimes,
  findNextAvailableDate,
};
