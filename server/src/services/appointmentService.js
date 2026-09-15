const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId, parseDateOnly } = require('../utils/parse');
const {
  isValidThirtyMinuteTimeSlot,
  isValidClinicAppointmentTime,
  isValidAppointmentDuration,
  normalizeAppointmentPayload,
} = require('../utils/appointmentUtils');
const {
  SLOT_INTERVAL_MINUTES,
  addMinutes,
  formatTimeOnly,
  getScheduleDayBounds,
  buildAvailabilitySlots,
} = require('../utils/appointmentScheduling');
const { getDoctorScheduleForDate } = require('./clinicSettingsService');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');
const { normalizeClinicalTreatments } = require('./clinicalService');

const appointmentListInclude = {
  patient: true,
  doctor: true,
};

function appointmentDetailIncludeFor(user) {
  return {
    doctor: true,
    clinicalNote: {
      include: {
        author: { select: { id: true, displayName: true } },
        transcribedBy: { select: { id: true, displayName: true } },
        validatedBy: { select: { id: true, displayName: true } },
        addenda: { orderBy: { version: 'asc' } },
        treatments: { orderBy: { createdAt: 'asc' } },
      },
    },
    documents: {
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        uploadedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    },
    patient: {
      include: {
        appointments: {
          where: { archivedAt: null },
          orderBy: [{ date: 'desc' }, { time: 'desc' }],
          include: {
            doctor: true,
          },
        },
      },
    },
  };
}

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

async function getRescheduleOptions({ appointmentId, date, duration, user }) {
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

  if (appointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  if (appointment.patient?.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  assertAppointmentAccess(user, appointment, 'read');

  if (TERMINAL_APPOINTMENT_STATUSES.includes(appointment.status)) {
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
      slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
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
    slotOptions: availability.slotOptions,
    isClosed: availability.isClosed,
    closureLabel: availability.closureLabel,
    recommendation: nextAvailable,
  };
}

const RESCHEDULE_SCAN_LIMIT_DAYS = 60;
const ACTIVE_SCHEDULING_STATUSES = ['scheduled', 'arrived'];
const TERMINAL_APPOINTMENT_STATUSES = ['completed', 'cancelled', 'no_show'];

function assertAppointmentAccess(user, appointment, action) {
  assertPermission(user, 'appointment', action);

  if (action !== 'read' && user.role === 'dentist' && Number(user.doctorId) !== Number(appointment.doctorId)) {
    throw new HttpError(403, 'Dentists may only access appointments assigned to them');
  }
}

function assertReceptionistAppointmentPayload(user, payload) {
  if (
    user.role === 'receptionist' &&
    (payload.performedTreatment !== undefined ||
      payload.completionNotes !== undefined ||
      payload.status === 'completed')
  ) {
    throw new HttpError(403, 'Receptionists cannot write clinical appointment data');
  }
}

async function ensureDoctorAccess(user, doctorId, { readOnly = false } = {}) {
  assertPermission(user, 'appointment', 'read');
  if (!readOnly && user.role === 'dentist' && Number(user.doctorId) !== Number(doctorId)) {
    throw new HttpError(403, 'Dentists may only access their own agenda');
  }
}

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

function startOfDate(date) {
  return new Date(`${date}T00:00:00`);
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
      patient: { archivedAt: null },
      status: {
        in: ACTIVE_SCHEDULING_STATUSES,
      },
      archivedAt: null,
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
      patient: { archivedAt: null },
      ...(normalizedAppointmentId
        ? {
            NOT: {
              id: normalizedAppointmentId,
            },
          }
        : {}),
      status: {
        in: ACTIVE_SCHEDULING_STATUSES,
      },
      archivedAt: null,
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

  const scheduleRules = await getDoctorScheduleForDate({
    doctorId: normalizedDoctorId,
    date: normalizedDate,
  });

  const appointments = scheduleRules.isClosed
    ? []
    : await getDoctorAppointmentsForDate({
        doctorId: normalizedDoctorId,
        date: normalizedDate,
        excludeAppointmentId,
      });

  const bookedAppointments = appointments.map((appointment) =>
    toScheduleItem(appointment, normalizedDate)
  );

  const { clinicOpen, clinicClose } = getScheduleDayBounds(normalizedDate, scheduleRules);

  return {
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    clinicOpenTime: formatTimeOnly(clinicOpen),
    clinicCloseTime: formatTimeOnly(clinicClose),
    startTime: scheduleRules.startTime,
    endTime: scheduleRules.endTime,
    isClosed: scheduleRules.isClosed,
    closureLabel: scheduleRules.closureLabel,
    breaks: scheduleRules.breakStart && scheduleRules.breakEnd
      ? [{
          start: buildDateTime(normalizedDate, scheduleRules.breakStart),
          end: buildDateTime(normalizedDate, scheduleRules.breakEnd),
        }]
      : [],
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

  const { clinicOpen, clinicClose } = getScheduleDayBounds(normalizedDate, schedule);
  const slotOptions = buildAvailabilitySlots({
    clinicOpen,
    clinicClose,
    duration: normalizedDuration,
    bookedAppointments: schedule.bookedAppointments,
    breaks: schedule.breaks,
    isClosed: schedule.isClosed,
  });
  const availableStartTimes = slotOptions
    .filter((slot) => slot.status === 'free')
    .map((slot) => slot.time);

  return {
    doctorId: normalizedDoctorId,
    date: normalizedDate,
    duration: normalizedDuration,
    clinicOpenTime: schedule.clinicOpenTime,
    clinicCloseTime: schedule.clinicCloseTime,
    isClosed: schedule.isClosed,
    closureLabel: schedule.closureLabel,
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
  user,
}) {
  // A dentist may inspect another doctor's free/busy calendar, but this
  // read-only endpoint must never grant permission to schedule there.
  await ensureDoctorAccess(user, doctorId, { readOnly: true });
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
    isClosed: availability.isClosed,
    closureLabel: availability.closureLabel,
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

function validateAppointmentPayload(payload, { legacyTime, schedulingRules } = {}) {
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

  const supportedStatuses = new Set(['scheduled', 'arrived', 'completed', 'cancelled', 'no_show']);
  if (!supportedStatuses.has(payload.status)) {
    throw new HttpError(400, 'Invalid appointment status');
  }

  parseDateOnly(payload.date, 'appointment date');

  const preservesUnchangedLegacyTime =
    payload.time === legacyTime && !isValidThirtyMinuteTimeSlot(payload.time);

  const scheduleValidationOptions = schedulingRules
    ? {
        startTime: schedulingRules.startTime,
        endTime: schedulingRules.endTime,
        isClosed: schedulingRules.isClosed,
        breaks: schedulingRules.breakStart && schedulingRules.breakEnd
          ? [{ startTime: schedulingRules.breakStart, endTime: schedulingRules.breakEnd }]
          : [],
      }
    : {};

  if (!isValidClinicAppointmentTime(payload.time, payload.duration, scheduleValidationOptions) && !preservesUnchangedLegacyTime) {
    throw new HttpError(
      400,
      schedulingRules?.isClosed
        ? schedulingRules.closureLabel
          ? `The clinic is closed on this date: ${schedulingRules.closureLabel}`
          : 'The clinic is closed on this date'
        : 'Appointment time must be within the clinic schedule and use a 30-minute slot'
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
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      archivedAt: null,
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

async function getAppointments(user) {
  assertPermission(user, 'appointment', 'read');
  return prisma.appointment.findMany({
    where: {
      archivedAt: null,
      patient: { archivedAt: null },
    },
    include: appointmentListInclude,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
}

async function getAppointmentById(appointmentId, user) {
  const id = parseNumericId(appointmentId, 'appointment id');

  const appointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
    include: appointmentDetailIncludeFor(user),
  });

  if (!appointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  if (appointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  if (appointment.patient?.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  assertAppointmentAccess(user, appointment, 'read');

  return appointment;
}

async function createAppointment(payload, user, req) {
  assertPermission(user, 'appointment', 'schedule');
  assertReceptionistAppointmentPayload(user, payload);
  const normalized = normalizeAppointmentPayload(payload);
  const waitlistEntryId = payload.waitlistEntryId === undefined || payload.waitlistEntryId === null || payload.waitlistEntryId === ''
    ? null
    : parseNumericId(payload.waitlistEntryId, 'waitlist id');
  await ensureDoctorAccess(user, normalized.doctorId);
  const schedulingRules = await getDoctorScheduleForDate({
    doctorId: normalized.doctorId,
    date: normalized.date,
  });

  await validateConfiguredAppointmentType(normalized.treatmentType);
  validateAppointmentPayload(normalized, { schedulingRules });
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

  if (waitlistEntryId) {
    const pendingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        id: waitlistEntryId,
        patientId: normalized.patientId,
        status: { in: ['waiting', 'contacted'] },
        patient: { archivedAt: null },
        OR: [{ doctorId: null }, { doctorId: normalized.doctorId }],
      },
      select: { id: true },
    });
    if (!pendingEntry) {
      throw new HttpError(409, 'The waitlist request is no longer active or does not match this appointment');
    }
  }

  const appointment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.appointment.create({
      data: {
        patientId: normalized.patientId,
        doctorId: normalized.doctorId,
        date: new Date(`${normalized.date}T00:00:00`),
        time: normalized.time,
        duration: normalized.duration,
        treatmentType: normalized.treatmentType,
        performedTreatment: normalized.performedTreatment,
        status: normalized.status,
        arrivedAt: normalized.status === 'arrived' ? new Date() : null,
        notes: normalized.notes,
        completionNotes: normalized.completionNotes,
      },
      include: appointmentListInclude,
    });

    if (waitlistEntryId) {
      const linked = await transaction.waitlistEntry.updateMany({
        where: {
          id: waitlistEntryId,
          patientId: normalized.patientId,
          status: { in: ['waiting', 'contacted'] },
          appointmentId: null,
          OR: [{ doctorId: null }, { doctorId: normalized.doctorId }],
        },
        data: { status: 'booked', appointmentId: created.id },
      });
      if (linked.count !== 1) {
        throw new HttpError(409, 'The waitlist request was already resolved or changed');
      }
    }

    return created;
  });

  if (waitlistEntryId) {
    await recordAuditEvent({
      req,
      actor: user,
      action: 'transition',
      resource: 'waitlist',
      resourceId: waitlistEntryId,
      patientId: normalized.patientId,
      metadata: { fromStatus: 'waiting_or_contacted', toStatus: 'booked', appointmentId: appointment.id },
    });
  }

  return appointment;
}

async function updateAppointment(appointmentId, payload, user) {
  assertPermission(user, 'appointment', 'schedule');
  assertReceptionistAppointmentPayload(user, payload);
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

  if (existingAppointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }

  assertAppointmentAccess(user, existingAppointment, 'schedule');
  await ensureDoctorAccess(user, normalized.doctorId);

  await validateConfiguredAppointmentType(normalized.treatmentType, {
    historicalValues: [existingAppointment.treatmentType],
  });

  if (TERMINAL_APPOINTMENT_STATUSES.includes(existingAppointment.status)) {
    throw new HttpError(
      409,
      'Completed, cancelled, and no-show appointments cannot be edited or rescheduled'
    );
  }

  const schedulingRules = await getDoctorScheduleForDate({
    doctorId: normalized.doctorId,
    date: normalized.date,
  });

  validateAppointmentPayload(normalized, {
    legacyTime: existingAppointment.time,
    schedulingRules,
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

  const nextStatus = payload.status !== undefined
    ? normalized.status
    : existingAppointment.status || 'scheduled';

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
      status: nextStatus,
      arrivedAt: nextStatus === 'arrived'
        ? (existingAppointment.arrivedAt || new Date())
        : existingAppointment.arrivedAt,
      notes: normalized.notes,
      completionNotes:
        payload.completionNotes !== undefined
          ? normalized.completionNotes
          : existingAppointment.completionNotes,
    },
    include: appointmentDetailIncludeFor(user),
  });
}

async function concludeAppointment(appointmentId, payload, user, req) {
  assertPermission(user, 'appointment', 'clinicalWrite');
  const id = parseNumericId(appointmentId, 'appointment id');
  const performedTreatment = String(payload.performedTreatment || '').trim();
  const completionNotes = payload.completionNotes?.trim() || null;
  const treatments = Array.isArray(payload.treatments) ? payload.treatments : [];
  const normalizedTreatments = normalizeClinicalTreatments({ performedTreatment, treatments });
  const noteTreatments = normalizedTreatments.map(({ toothCondition, toothStatus, ...treatment }) => treatment);

  if (!performedTreatment) {
    throw new HttpError(400, 'Performed treatment is required');
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
    include: {
      clinicalNote: true,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  if (existingAppointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  assertAppointmentAccess(user, existingAppointment, 'clinicalWrite');

  if (!['scheduled', 'arrived'].includes(existingAppointment.status)) {
    throw new HttpError(409, 'Only scheduled or arrived appointments can be concluded');
  }

  if (performedTreatment.length > 2000) {
    throw new HttpError(400, 'Performed treatment must be 2000 characters or fewer');
  }

  if (completionNotes && completionNotes.length > 5000) {
    throw new HttpError(400, 'Completion notes must be 5000 characters or fewer');
  }

  return prisma.$transaction(async (transaction) => {
    if (existingAppointment.clinicalNote?.status === 'final') {
      throw new HttpError(409, 'The linked clinical note is already final');
    }

    if (existingAppointment.clinicalNote) {
      await transaction.clinicalNote.update({
        where: { id: existingAppointment.clinicalNote.id },
        data: {
          treatmentPerformed: existingAppointment.clinicalNote.treatmentPerformed || performedTreatment,
          treatments: { deleteMany: {}, create: noteTreatments },
        },
      });
    } else {
      await transaction.clinicalNote.create({
        data: {
          patientId: existingAppointment.patientId,
          appointmentId: id,
          authorId: user.id,
          treatmentPerformed: performedTreatment,
          status: 'draft',
          sourceType: 'clinical',
          transcriptionStatus: 'not_applicable',
          treatments: { create: noteTreatments },
        },
      });
    }

    for (const treatment of normalizedTreatments) {
      if (!treatment.toothNumber || !treatment.toothCondition) continue;

      await transaction.toothChartEntry.upsert({
        where: {
          patientId_toothNumber_surface: {
            patientId: existingAppointment.patientId,
            toothNumber: treatment.toothNumber,
            surface: treatment.surface || 'whole',
          },
        },
        create: {
          patientId: existingAppointment.patientId,
          toothNumber: treatment.toothNumber,
          surface: treatment.surface || 'whole',
          condition: treatment.toothCondition,
          status: treatment.toothStatus || 'completed',
          notes: treatment.notes || null,
        },
        update: {
          condition: treatment.toothCondition,
          status: treatment.toothStatus || 'completed',
          notes: treatment.notes || null,
          observedAt: new Date(),
        },
      });
    }

    return transaction.appointment.update({
      where: { id },
      data: {
        status: 'completed',
        performedTreatment,
        completionNotes,
      },
      include: appointmentDetailIncludeFor(user),
    });
  });
}

async function deleteAppointment(appointmentId, user) {
  assertPermission(user, 'appointment', 'archive');
  const id = parseNumericId(appointmentId, 'appointment id');

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id,
    },
  });

  if (!existingAppointment) {
    throw new HttpError(404, 'Appointment not found');
  }

  if (existingAppointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }

  assertAppointmentAccess(user, existingAppointment, 'archive');

  await prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status: 'cancelled',
      archivedAt: new Date(),
    },
  });

  return {
    message: 'Appointment archived successfully',
  };
}

async function updateAppointmentStatus(appointmentId, payload, user) {
  assertPermission(user, 'appointment', 'status');
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

  if (existingAppointment.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  assertAppointmentAccess(user, existingAppointment, 'status');

  const allowedTransitions = {
    scheduled: ['arrived', 'cancelled', 'no_show'],
    arrived: ['cancelled', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  if (!allowedTransitions[existingAppointment.status]?.includes(status)) {
    throw new HttpError(409, 'This appointment status transition is not allowed');
  }

  return prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status,
      arrivedAt: status === 'arrived'
        ? (existingAppointment.arrivedAt || new Date())
        : existingAppointment.arrivedAt,
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

async function getActiveAppointmentTypeNames() {
  const types = await prisma.appointmentType.findMany({
    where: { settingsId: 1, isActive: true },
    select: { name: true },
  });
  return new Set(types.map((type) => type.name));
}

async function validateConfiguredAppointmentType(value, { historicalValues = [] } = {}) {
  const name = String(value || '').trim();
  const activeNames = await getActiveAppointmentTypeNames();
  const historicalNames = new Set(historicalValues.filter(Boolean));

  if (!name || (!activeNames.has(name) && !historicalNames.has(name))) {
    throw new HttpError(400, 'Appointment type must be one of the active clinic appointment types');
  }
}
