const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { assertPermission } = require('../utils/authorization');
const { recordAuditEvent } = require('./auditService');
const { ensurePatientAccess } = require('./governanceService');
const { createPrivacyNoticePdf, privacyNoticeText, privacyNoticeVersion } = require('./privacyNoticePdfService');

const DELIVERY_TTL_DAYS = 30;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.CLINIC_EMAIL_FROM && publicBaseUrl() && process.env.PRIVACY_NOTICE_TEXT?.trim());
}

function publicBaseUrl() {
  return String(process.env.PRIVACY_NOTICE_PUBLIC_BASE_URL || process.env.CONFIRMATION_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createTransport() {
  const options = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: ['1', 'true', 'yes'].includes(String(process.env.SMTP_SECURE || '').toLowerCase()),
  };
  if (process.env.SMTP_USER) options.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' };
  return nodemailer.createTransport(options);
}

function deliverySelect() {
  return {
    id: true,
    patientId: true,
    version: true,
    email: true,
    status: true,
    sentAt: true,
    acknowledgedAt: true,
    objectedAt: true,
    expiresAt: true,
    createdAt: true,
    createdBy: { select: { id: true, displayName: true } },
  };
}

function expirationDate() {
  const value = new Date();
  value.setDate(value.getDate() + DELIVERY_TTL_DAYS);
  return value;
}

function publicUrl(token) {
  return `${publicBaseUrl()}/api/public/privacy-notices/${encodeURIComponent(token)}`;
}

async function findPatient(patientId, user, options = {}) {
  const id = await ensurePatientAccess(patientId, user, options);
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new HttpError(404, 'Patient not found');
  return patient;
}

async function listDeliveries(patientId, user) {
  const id = await ensurePatientAccess(patientId, user);
  return {
    version: privacyNoticeVersion(),
    deliveries: await prisma.privacyNoticeDelivery.findMany({
      where: { patientId: id },
      select: deliverySelect(),
      orderBy: { createdAt: 'desc' },
    }),
  };
}

function emailContent(patient, noticeUrl) {
  const clinicName = process.env.CLINIC_NAME || 'Clínica dentária';
  const subject = `${clinicName}: aviso de privacidade`;
  const text = [
    `Olá ${patient.fullName},`,
    '',
    `A ${clinicName} enviou-lhe o aviso de privacidade em anexo.`,
    '',
    `Depois de o consultar, pode confirmar que tomou conhecimento aqui: ${noticeUrl}`,
    '',
    'Se tiver dúvidas ou quiser comunicar uma oposição, contacte diretamente a clínica.',
  ].join('\n');
  const html = `<!doctype html><html lang="pt-PT"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><p>Olá ${escapeHtml(patient.fullName)},</p><p>A <strong>${escapeHtml(clinicName)}</strong> enviou-lhe o aviso de privacidade em anexo.</p><p>Depois de o consultar, pode confirmar que tomou conhecimento:</p><p><a href="${escapeHtml(noticeUrl)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Consultar e confirmar</a></p><p style="font-size:12px;color:#64748b">Se tiver dúvidas ou quiser comunicar uma oposição, contacte diretamente a clínica.</p></body></html>`;
  return { subject, text, html, noticeUrl };
}

async function buildEmail(patient, token) {
  const content = emailContent(patient, publicUrl(token));
  return { ...content, attachment: await createPrivacyNoticePdf(patient) };
}

async function previewPrivacyNotice(patientId, user) {
  const patient = await findPatient(patientId, user);
  if (!patient.email) throw new HttpError(409, 'The patient does not have an email address');
  const attachment = await createPrivacyNoticePdf(patient);
  const content = emailContent(patient, '[link individual gerado ao confirmar o envio]');
  return {
    to: patient.email,
    subject: content.subject,
    text: content.text,
    attachment: {
      fileName: `aviso-privacidade-${patient.id}.pdf`,
      contentType: 'application/pdf',
      sizeBytes: attachment.length,
    },
  };
}

async function sendPrivacyNotice(patientId, { req, actor } = {}) {
  if (!isConfigured()) throw new HttpError(503, 'Privacy notice email is not configured');
  assertPermission(actor, 'governance', 'write');
  const patient = await findPatient(patientId, actor, { write: true });
  if (!patient.email) throw new HttpError(409, 'The patient does not have an email address');

  const token = createToken();
  const delivery = await prisma.privacyNoticeDelivery.create({
    data: {
      patientId: patient.id,
      version: privacyNoticeVersion(),
      email: patient.email,
      tokenHash: hashToken(token),
      expiresAt: expirationDate(),
      createdById: actor.id,
    },
    select: { id: true },
  });

  try {
    const email = await buildEmail(patient, token);
    await createTransport().sendMail({
      from: process.env.CLINIC_EMAIL_FROM,
      to: patient.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: [{ filename: `aviso-privacidade-${patient.id}.pdf`, content: email.attachment, contentType: 'application/pdf' }],
    });
  } catch (error) {
    await prisma.privacyNoticeDelivery.delete({ where: { id: delivery.id } }).catch(() => {});
    throw new HttpError(502, `Unable to send privacy notice email: ${error.message || 'SMTP error'}`);
  }

  const sent = await prisma.privacyNoticeDelivery.update({
    where: { id: delivery.id },
    data: { sentAt: new Date() },
    select: deliverySelect(),
  });
  await recordAuditEvent({
    req,
    actor,
    action: 'send_privacy_notice',
    resource: 'privacy_notice_delivery',
    resourceId: sent.id,
    patientId: patient.id,
    metadata: { version: sent.version, email: sent.email, expiresAt: sent.expiresAt },
    required: true,
  });
  return sent;
}

async function downloadPdf(patientId, user, req) {
  const patient = await findPatient(patientId, user);
  const buffer = await createPrivacyNoticePdf(patient);
  await recordAuditEvent({
    req,
    actor: user,
    action: 'download_template',
    resource: 'privacy_notice',
    resourceId: patient.id,
    patientId: patient.id,
    metadata: { version: privacyNoticeVersion(), format: 'pdf' },
    required: true,
  });
  return { buffer, fileName: `aviso-privacidade-${patient.id}.pdf` };
}

async function getPublicDelivery(token) {
  const delivery = await prisma.privacyNoticeDelivery.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { patient: true },
  });
  if (!delivery) throw new HttpError(404, 'Privacy notice link not found');
  return delivery;
}

async function respond(token, choice, { req } = {}) {
  if (!['acknowledged', 'objected'].includes(choice)) throw new HttpError(400, 'Invalid privacy notice response');
  const delivery = await getPublicDelivery(token);
  if (delivery.status !== 'sent') return { delivery, alreadyResponded: true };
  if (delivery.expiresAt <= new Date()) return { delivery, alreadyResponded: false, expired: true };
  const now = new Date();
  const updated = await prisma.privacyNoticeDelivery.updateMany({
    where: { id: delivery.id, status: 'sent', expiresAt: { gt: now } },
    data: { status: choice, ...(choice === 'acknowledged' ? { acknowledgedAt: now } : { objectedAt: now }) },
  });
  if (updated.count !== 1) return { delivery: await getPublicDelivery(token), alreadyResponded: true };
  const saved = await prisma.privacyNoticeDelivery.findUnique({ where: { id: delivery.id }, include: { patient: true } });
  await recordAuditEvent({
    req,
    action: choice,
    resource: 'privacy_notice_delivery',
    resourceId: saved.id,
    patientId: saved.patientId,
    metadata: { version: saved.version, status: saved.status },
    required: true,
  });
  return { delivery: saved, alreadyResponded: false };
}

function renderPage({ token, delivery, result = null }) {
  const expired = delivery.status === 'sent' && delivery.expiresAt <= new Date();
  const statusText = result || (expired
    ? 'Esta ligação expirou. Contacte diretamente a clínica para receber um novo aviso.'
    : delivery.status === 'sent'
    ? 'Consulte o aviso de privacidade enviado pela clínica e escolha uma resposta.'
    : delivery.status === 'acknowledged'
      ? 'A confirmação de leitura já foi registada.'
      : 'A oposição já foi registada. Contacte diretamente a clínica se precisar de esclarecimentos.');
  const actions = delivery.status === 'sent' && delivery.expiresAt > new Date()
    ? '<form method="post" class="actions"><button class="primary" type="submit" name="choice" value="acknowledged">Confirmo que tomei conhecimento</button><button class="secondary" type="submit" name="choice" value="objected">Quero comunicar uma oposição</button></form>'
    : '';
  const clinicName = escapeHtml(process.env.CLINIC_NAME || 'Clínica dentária');
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aviso de privacidade · ${clinicName}</title><style>
  :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f1f5f9;color:#172033}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(145deg,#ecfeff 0%,#f8fafc 45%,#e2e8f0 100%);padding:24px 16px}
  .shell{max-width:720px;margin:0 auto}.brand{font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#0f766e;margin:8px 4px 16px}
  main{background:#fff;border:1px solid #dbe4ea;border-radius:24px;box-shadow:0 20px 60px rgba(15,23,42,.12);overflow:hidden}
  .hero{padding:32px 32px 24px;background:linear-gradient(135deg,#f0fdfa,#fff)}h1{font-size:clamp(26px,5vw,38px);line-height:1.1;margin:0;color:#0f172a}h2{font-size:15px;margin:0 0 10px;color:#0f172a}
  .version{display:inline-flex;margin-top:14px;padding:6px 10px;border-radius:999px;background:#ccfbf1;color:#115e59;font-size:12px;font-weight:700}
  .content{padding:28px 32px 32px}.intro{font-size:16px;line-height:1.6;margin:0 0 22px;color:#334155}.status{padding:16px;border:1px solid #bae6fd;border-radius:16px;background:#f0f9ff;color:#0c4a6e;line-height:1.55}
  .notice{margin-top:20px;padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;line-height:1.65;white-space:pre-wrap}.notice p{margin:0}
  .actions{display:grid;gap:10px;margin-top:24px}.actions button{width:100%;padding:14px 16px;border:1px solid;border-radius:12px;font:inherit;font-weight:700;cursor:pointer}.primary{border-color:#0f766e;background:#0f766e;color:#fff}.primary:hover{background:#115e59}.secondary{border-color:#cbd5e1;background:#fff;color:#334155}.secondary:hover{background:#f8fafc}
  footer{padding:0 32px 28px;color:#64748b;font-size:13px;line-height:1.5}@media(max-width:520px){body{padding:12px 8px}.hero,.content{padding:24px 20px}.content{padding-top:20px}footer{padding:0 20px 24px}}
  </style></head><body><div class="shell"><div class="brand">${clinicName}</div><main><header class="hero"><h1>Aviso de privacidade</h1><span class="version">Versão ${escapeHtml(delivery.version)}</span></header><div class="content"><p class="intro">Olá ${escapeHtml(delivery.patient.fullName)}. Este aviso explica como a clínica trata os seus dados pessoais e de saúde.</p><div class="status"><h2>Estado da resposta</h2>${escapeHtml(statusText)}</div><section class="notice"><h2>Informação</h2><p>${escapeHtml(privacyNoticeText())}</p></section>${actions}</div><footer>Se tiver dúvidas ou quiser comunicar uma oposição, contacte diretamente a clínica.<br>Este link é individual e válido por tempo limitado.</footer></main></div></body></html>`;
}

module.exports = {
  downloadPdf,
  getPublicDelivery,
  isConfigured,
  listDeliveries,
  previewPrivacyNotice,
  privacyNoticeVersion,
  renderPage,
  respond,
  sendPrivacyNotice,
};
