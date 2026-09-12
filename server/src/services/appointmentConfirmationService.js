const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { recordAuditEvent } = require('./auditService');

const ACTIVE_STATUSES = ['scheduled', 'arrived'];
const CONFIRMATION_WINDOW_DAYS = 2;
const CONFIRMATION_TTL_DAYS = 4;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.CLINIC_EMAIL_FROM && process.env.CONFIRMATION_PUBLIC_BASE_URL);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function formatDateOnly(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

function expirationForAppointment(appointment) {
  const expiration = new Date(`${formatDateOnly(appointment.date)}T23:59:59`);
  expiration.setDate(expiration.getDate() + CONFIRMATION_TTL_DAYS);
  return expiration;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function publicUrl(token, choice) {
  const baseUrl = String(process.env.CONFIRMATION_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  return `${baseUrl}/api/public/appointment-confirmations/${encodeURIComponent(token)}?choice=${choice}`;
}

function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  const transportOptions = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase()),
  };
  if (process.env.SMTP_USER) {
    transportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || '',
    };
  }
  return nodemailer.createTransport(transportOptions);
}

function buildEmail(appointment, token) {
  const patientName = appointment.patient.fullName;
  const appointmentDate = formatDateOnly(appointment.date);
  const clinicName = process.env.CLINIC_NAME || 'Clínica dentária';
  const yesUrl = publicUrl(token, 'confirmed');
  const noUrl = publicUrl(token, 'declined');
  const subject = `${clinicName}: confirme a sua consulta de ${appointmentDate}`;
  const text = [
    `Olá ${patientName},`,
    '',
    `Tem uma consulta na ${clinicName} no dia ${appointmentDate} às ${appointment.time}.`,
    '',
    `Confirma a sua presença? Sim: ${yesUrl}`,
    `Não posso comparecer: ${noUrl}`,
    '',
    'Os botões são válidos uma vez e deixam de funcionar após a data limite indicada pela clínica.',
  ].join('\n');
  const html = `<!doctype html><html lang="pt-PT"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><p>Olá ${escapeHtml(patientName)},</p><p>Tem uma consulta na <strong>${escapeHtml(clinicName)}</strong> no dia <strong>${escapeHtml(appointmentDate)}</strong> às <strong>${escapeHtml(appointment.time)}</strong>.</p><p>Confirma a sua presença?</p><p><a href="${escapeHtml(yesUrl)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;margin-right:8px">Sim, confirmo</a><a href="${escapeHtml(noUrl)}" style="display:inline-block;background:#fff;color:#334155;border:1px solid #cbd5e1;padding:11px 17px;border-radius:8px;text-decoration:none">Não posso comparecer</a></p><p style="font-size:12px;color:#64748b">A resposta é válida uma vez. Se precisar de alterar a consulta, contacte a clínica.</p></body></html>`;
  return { subject, text, html };
}

async function findAppointmentForConfirmation(appointmentId) {
  const id = parseNumericId(appointmentId, 'appointment id');
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      confirmationRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!appointment || appointment.archivedAt || appointment.patient?.archivedAt) {
    throw new HttpError(404, 'Appointment not found');
  }
  return appointment;
}

async function sendAppointmentConfirmation(appointmentId, { req, actor } = {}) {
  if (!isConfigured()) {
    throw new HttpError(503, 'Appointment email confirmation is not configured');
  }

  const appointment = await findAppointmentForConfirmation(appointmentId);
  if (!ACTIVE_STATUSES.includes(appointment.status)) {
    throw new HttpError(409, 'Only active appointments can request confirmation');
  }
  if (!appointment.patient?.email) {
    throw new HttpError(409, 'The patient does not have an email address');
  }

  const existing = appointment.confirmationRequests[0];
  if (existing?.status === 'pending' && existing.sentAt && existing.expiresAt > new Date()) {
    return { ...existing, alreadySent: true };
  }
  if (existing?.status === 'pending') {
    await prisma.appointmentConfirmation.delete({ where: { id: existing.id } });
  }

  const token = createToken();
  const confirmation = await prisma.appointmentConfirmation.create({
    data: {
      appointmentId: appointment.id,
      tokenHash: hashToken(token),
      expiresAt: expirationForAppointment(appointment),
    },
  });

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: process.env.CLINIC_EMAIL_FROM,
      to: appointment.patient.email,
      ...buildEmail(appointment, token),
    });
  } catch (error) {
    await prisma.appointmentConfirmation.delete({ where: { id: confirmation.id } }).catch(() => {});
    throw new HttpError(502, `Unable to send appointment confirmation email: ${error.message || 'SMTP error'}`);
  }

  const sent = await prisma.appointmentConfirmation.update({
    where: { id: confirmation.id },
    data: { sentAt: new Date() },
  });
  await recordAuditEvent({
    req,
    actor,
    action: 'send_confirmation',
    resource: 'appointment_confirmation',
    resourceId: sent.id,
    patientId: appointment.patientId,
    metadata: { appointmentId: appointment.id, expiresAt: sent.expiresAt },
    required: true,
  });
  return { ...sent, alreadySent: false };
}

async function sendDueAppointmentConfirmations({ now = new Date() } = {}) {
  if (!isConfigured()) return { enabled: false, sent: 0 };
  await prisma.appointmentConfirmation.updateMany({
    where: { status: 'pending', expiresAt: { lt: now } },
    data: { status: 'expired' },
  });
  const targetDate = addDays(formatDateOnly(now), CONFIRMATION_WINDOW_DAYS);
  const appointments = await prisma.appointment.findMany({
    where: {
      date: new Date(`${targetDate}T00:00:00`),
      status: { in: ACTIVE_STATUSES },
      archivedAt: null,
      patient: { archivedAt: null, email: { not: '' } },
    },
    select: { id: true },
  });
  let sent = 0;
  for (const appointment of appointments) {
    try {
      const result = await sendAppointmentConfirmation(appointment.id);
      if (!result.alreadySent) sent += 1;
    } catch (error) {
      console.error(`Appointment confirmation ${appointment.id} was not sent:`, error.message || error);
    }
  }
  return { enabled: true, sent };
}

async function getConfirmation(token) {
  const confirmation = await prisma.appointmentConfirmation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { appointment: { include: { patient: true } } },
  });
  if (!confirmation) throw new HttpError(404, 'Confirmation link not found');
  if (confirmation.status === 'pending' && confirmation.expiresAt <= new Date()) {
    await prisma.appointmentConfirmation.update({ where: { id: confirmation.id }, data: { status: 'expired' } });
    return { ...confirmation, status: 'expired' };
  }
  return confirmation;
}

async function respondToConfirmation(token, choice, { req } = {}) {
  if (!['confirmed', 'declined'].includes(choice)) throw new HttpError(400, 'Invalid appointment confirmation response');
  const confirmation = await getConfirmation(token);
  if (confirmation.status !== 'pending') {
    return { confirmation, alreadyResponded: true };
  }
  const updated = await prisma.appointmentConfirmation.updateMany({
    where: { id: confirmation.id, status: 'pending', expiresAt: { gt: new Date() } },
    data: { status: choice, respondedAt: new Date() },
  });
  if (updated.count !== 1) return { confirmation: await getConfirmation(token), alreadyResponded: true };
  const saved = await prisma.appointmentConfirmation.findUnique({
    where: { id: confirmation.id },
    include: { appointment: { include: { patient: true } } },
  });
  await recordAuditEvent({
    req,
    action: choice,
    resource: 'appointment_confirmation',
    resourceId: saved.id,
    patientId: saved.appointment.patientId,
    metadata: { appointmentId: saved.appointmentId, status: choice },
    required: true,
  });
  return { confirmation: saved, alreadyResponded: false };
}

function renderConfirmationPage({ token, confirmation, proposedChoice = 'confirmed', result = null }) {
  const appointmentDate = formatDateOnly(confirmation.appointment.date);
  const choice = ['confirmed', 'declined'].includes(proposedChoice) ? proposedChoice : 'confirmed';
  const statusText = result || (confirmation.status === 'pending'
    ? `A sua consulta está marcada para ${appointmentDate} às ${confirmation.appointment.time}.`
    : `A sua resposta já foi registada: ${confirmation.status === 'confirmed' ? 'presença confirmada' : confirmation.status === 'declined' ? 'não poderá comparecer' : 'link expirado'}.`);
  const action = confirmation.status === 'pending'
    ? `<form method="post" action="/api/public/appointment-confirmations/${encodeURIComponent(token)}"><input type="hidden" name="choice" value="${choice}"><button type="submit">${choice === 'confirmed' ? 'Sim, confirmo a presença' : 'Não posso comparecer'}</button></form>`
    : '';
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Confirmação de consulta</title></head><body><main><h1>Confirmação de consulta</h1><p>${escapeHtml(statusText)}</p>${action}<p>Se precisar de ajuda, contacte diretamente a clínica.</p></main></body></html>`;
}

function startAppointmentConfirmationScheduler() {
  if (!isConfigured()) return null;
  const run = () => sendDueAppointmentConfirmations().catch((error) => console.error('Appointment confirmation scheduler failed:', error.message || error));
  run();
  const interval = setInterval(run, 60 * 60 * 1000);
  interval.unref?.();
  return interval;
}

module.exports = {
  getConfirmation,
  isConfigured,
  renderConfirmationPage,
  respondToConfirmation,
  sendAppointmentConfirmation,
  sendDueAppointmentConfirmations,
  startAppointmentConfirmationScheduler,
};
