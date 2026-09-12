const prisma = require('../lib/prisma');
const { assertPermission } = require('../utils/authorization');

const ACTIVE_APPOINTMENT_STATUSES = ['scheduled', 'arrived'];
const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 };
const ARRIVAL_GRACE_MINUTES = 15;

function localDateOnly(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function dateAtTime(date, time) {
  return new Date(`${localDateOnly(date)}T${String(time).slice(0, 5)}:00`);
}

function displayDate(value) {
  return localDateOnly(value);
}

function patientName(patient) {
  return patient?.fullName || 'Unknown patient';
}

function action(label, path) {
  return { label, path };
}

function appointmentItem(appointment, type, priority, title, reason, itemAction) {
  return {
    id: `appointment:${appointment.id}:${type}`,
    type,
    priority,
    title,
    reason,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    dueAt: `${displayDate(appointment.date)}T${appointment.time}`,
    action: itemAction,
    patient: { id: appointment.patient.id, name: patientName(appointment.patient) },
  };
}

function serializeAppointment(appointment) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    date: displayDate(appointment.date),
    time: appointment.time,
    duration: appointment.duration,
    treatmentType: appointment.treatmentType,
    status: appointment.status,
    patient: { id: appointment.patient.id, name: patientName(appointment.patient) },
    doctor: appointment.doctor ? { id: appointment.doctor.id, name: appointment.doctor.name } : null,
  };
}

function sortItems(items) {
  return items.sort((first, second) => {
    const priorityDifference = PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
    if (priorityDifference !== 0) return priorityDifference;
    return String(first.dueAt || '').localeCompare(String(second.dueAt || '')) || first.id.localeCompare(second.id);
  });
}

function appointmentWhere(user) {
  return {
    archivedAt: null,
    patient: { archivedAt: null },
    status: { in: ACTIVE_APPOINTMENT_STATUSES },
    ...(user.role === 'dentist' ? { doctorId: Number(user.doctorId) || -1 } : {}),
  };
}

async function getWorkQueue(user) {
  assertPermission(user, 'appointment', 'read');
  const now = new Date();
  const today = localDateOnly(now);
  const role = user.role;

  const [appointments, recalls, waitlist, notes] = await Promise.all([
    prisma.appointment.findMany({
      where: appointmentWhere(user),
      include: { patient: true, doctor: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),
    prisma.patientRecall.findMany({
      where: {
        status: { in: ['due', 'scheduled'] },
        dueDate: { lte: new Date(`${today}T23:59:59`) },
        patient: { archivedAt: null },
        ...(role === 'dentist' ? { OR: [{ doctorId: Number(user.doctorId) || -1 }, { patient: { appointments: { some: { doctorId: Number(user.doctorId) || -1, archivedAt: null } } } }] } : {}),
      },
      include: { patient: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    }),
    prisma.waitlistEntry.findMany({
      where: {
        status: { in: ['waiting', 'contacted'] },
        priority: 'urgent',
        patient: { archivedAt: null },
        ...(role === 'dentist' ? { OR: [{ doctorId: Number(user.doctorId) || -1 }, { patient: { appointments: { some: { doctorId: Number(user.doctorId) || -1, archivedAt: null } } } }] } : {}),
      },
      include: { patient: true, doctor: true },
      orderBy: [{ requestedDate: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    }),
    prisma.clinicalNote.findMany({
      where: {
        status: 'draft',
        transcriptionStatus: 'transcribed',
        ...(role === 'dentist' ? { patient: { archivedAt: null, appointments: { some: { doctorId: Number(user.doctorId) || -1, archivedAt: null } } } } : { patient: { archivedAt: null } }),
      },
      include: { patient: true, appointment: true },
      orderBy: { transcribedAt: 'asc' },
      take: 50,
    }),
  ]);

  const items = [];
  const todayAppointments = appointments.filter((appointment) => displayDate(appointment.date) === today);

  appointments.forEach((appointment) => {
    const startsAt = dateAtTime(appointment.date, appointment.time);
    const name = patientName(appointment.patient);
    if (appointment.status === 'arrived') {
      const waitedMinutes = appointment.arrivedAt
        ? Math.max(0, Math.floor((now.getTime() - new Date(appointment.arrivedAt).getTime()) / 60000))
        : null;
      if (waitedMinutes === null || waitedMinutes >= ARRIVAL_GRACE_MINUTES) {
        items.push(appointmentItem(
          appointment,
          'arrived_waiting',
          'urgent',
          `Start ${name}'s attendance`,
          waitedMinutes === null ? 'Patient is marked as arrived.' : `Patient has been waiting for ${waitedMinutes} minutes.`,
          action('Open appointment', `/appointments/${appointment.id}`),
        ));
      }
    } else if (startsAt < now) {
      items.push(appointmentItem(
        appointment,
        'overdue_appointment',
        'high',
        `Review ${name}'s overdue appointment`,
        `The scheduled start was ${appointment.time}. Update the attendance status or open the appointment.`,
        action('Review appointment', `/appointments/${appointment.id}`),
      ));
    }

    if ((!String(appointment.patient.phone || '').trim() || !String(appointment.patient.email || '').trim()) && startsAt >= now) {
      items.push(appointmentItem(
        appointment,
        'incomplete_patient_contact',
        'normal',
        `Complete ${name}'s contact details`,
        'This upcoming appointment is missing a phone number or email address.',
        action('Open patient', `/patients/${appointment.patientId}`),
      ));
    }
  });

  recalls.forEach((recall) => {
    const overdue = displayDate(recall.dueDate) < today;
    items.push({
      id: `recall:${recall.id}`,
      type: overdue ? 'overdue_recall' : 'recall_due',
      priority: overdue ? 'high' : 'normal',
      title: `${overdue ? 'Follow up overdue' : 'Follow-up due'} · ${patientName(recall.patient)}`,
      reason: recall.reason,
      patientId: recall.patientId,
      dueAt: displayDate(recall.dueDate),
      action: action('Open follow-ups', '/recalls'),
      patient: { id: recall.patient.id, name: patientName(recall.patient) },
    });
  });

  waitlist.forEach((entry) => {
    items.push({
      id: `waitlist:${entry.id}`,
      type: 'urgent_waitlist',
      priority: 'high',
      title: `Review urgent request · ${patientName(entry.patient)}`,
      reason: entry.reason,
      patientId: entry.patientId,
      dueAt: entry.requestedDate ? displayDate(entry.requestedDate) : displayDate(entry.createdAt),
      action: action('Open waitlist', '/waitlist'),
      patient: { id: entry.patient.id, name: patientName(entry.patient) },
    });
  });

  notes.forEach((note) => {
    items.push({
      id: `clinical-note:${note.id}`,
      type: 'transcription_validation',
      priority: 'urgent',
      title: `Validate transcription · ${patientName(note.patient)}`,
      reason: 'A paper transcription was entered and is waiting for the dentist’s validation.',
      patientId: note.patientId,
      appointmentId: note.appointmentId,
      dueAt: note.transcribedAt ? new Date(note.transcribedAt).toISOString() : null,
      action: action('Open patient record', `/patients/${note.patientId}`),
      patient: { id: note.patient.id, name: patientName(note.patient) },
    });
  });

  const counts = {
    attention: items.length,
    urgent: items.filter((item) => item.priority === 'urgent').length,
    today: todayAppointments.length,
    arrived: todayAppointments.filter((appointment) => appointment.status === 'arrived').length,
    upcoming: appointments.filter((appointment) => dateAtTime(appointment.date, appointment.time) >= now).length,
    recalls: recalls.length,
    waitlist: waitlist.length,
    validations: notes.length,
  };
  const nextAppointment = appointments.find((appointment) => dateAtTime(appointment.date, appointment.time) >= now) || null;

  return {
    generatedAt: now.toISOString(),
    role,
    items: sortItems(items).slice(0, 100),
    counts,
    today: todayAppointments.slice(0, 20).map(serializeAppointment),
    next: nextAppointment ? serializeAppointment(nextAppointment) : null,
  };
}

module.exports = {
  getWorkQueue,
  localDateOnly,
  dateAtTime,
  sortItems,
  ARRIVAL_GRACE_MINUTES,
};
