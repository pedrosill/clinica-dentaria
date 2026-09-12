const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const databaseFilename = `dentalpro-waitlist-${Date.now()}-${process.pid}.db`;
const databasePath = path.join(serverRoot, 'prisma', databaseFilename);
process.env.DATABASE_URL = `file:./${databaseFilename}`;
const migrationNames = [
  '20260528011229_init_refreshed', '20260911153000_add_authentication', '20260911170000_add_clinic_settings',
  '20260911190000_add_clinical_records', '20260911200000_add_clinic_language', '20260911210000_add_authorization_scope_and_archiving',
  '20260911220000_add_data_governance', '20260911230000_add_patient_recalls', '20260911240000_add_waitlist_entries', '20260912100000_link_waitlist_appointments',
  '20260912110000_add_mfa_and_password_recovery', '20260912120000_add_compliance_transcription_documents', '20260912130000_add_appointment_arrived_at',
];
const database = new Database(databasePath);
for (const migrationName of migrationNames) database.exec(fs.readFileSync(path.join(serverRoot, 'prisma', 'migrations', migrationName, 'migration.sql'), 'utf8'));
database.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');
const { ensureClinicSettings } = require('../services/clinicSettingsService');

let server;
let baseUrl;
let adminCookie;
let receptionistCookie;
let dentistCookie;
let csrfCookie;
let csrfToken;
let doctor;
let otherDoctor;
let patient;
let otherPatient;

function cookieFrom(response) { return response.headers.get('set-cookie')?.split(';')[0]; }

async function requestWithCookie(cookie, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Cookie: [csrfCookie, cookie].filter(Boolean).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: csrfCookie, 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return cookieFrom(response);
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  csrfToken = (await csrfResponse.json()).csrfToken;
  csrfCookie = cookieFrom(csrfResponse);
});

test.beforeEach(async () => {
  await prisma.waitlistEntry.deleteMany();
  await prisma.patientRecall.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  doctor = await prisma.doctor.create({ data: { name: 'Waitlist Doctor' } });
  otherDoctor = await prisma.doctor.create({ data: { name: 'Other Waitlist Doctor' } });
  patient = await prisma.patient.create({ data: { fullName: 'Waitlist Patient', phone: '910000001', email: 'waitlist.patient@example.test', nif: '970000001', nationality: 'Portuguese' } });
  otherPatient = await prisma.patient.create({ data: { fullName: 'Other Waitlist Patient', phone: '910000002', email: 'waitlist.other@example.test', nif: '970000002', nationality: 'Portuguese' } });
  const admin = await prisma.user.create({ data: { email: 'waitlist.admin@example.test', displayName: 'Waitlist Admin', passwordHash: hashPassword('waitlist-admin-password'), role: 'admin' } });
  const receptionist = await prisma.user.create({ data: { email: 'waitlist.reception@example.test', displayName: 'Waitlist Reception', passwordHash: hashPassword('waitlist-reception-password'), role: 'receptionist' } });
  const dentist = await prisma.user.create({ data: { email: 'waitlist.dentist@example.test', displayName: 'Waitlist Dentist', passwordHash: hashPassword('waitlist-dentist-password'), role: 'dentist' } });
  await prisma.doctor.update({ where: { id: doctor.id }, data: { userId: dentist.id } });
  await prisma.appointment.create({ data: { patientId: patient.id, doctorId: doctor.id, date: new Date('2099-01-15T00:00:00'), time: '09:00', treatmentType: 'Consultation' } });
  adminCookie = await login(admin.email, 'waitlist-admin-password');
  receptionistCookie = await login(receptionist.email, 'waitlist-reception-password');
  dentistCookie = await login(dentist.email, 'waitlist-dentist-password');
});

test.after(async () => {
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(databasePath, { force: true });
});

test('creates, lists with the default active filter, transitions, and audits a waitlist entry', async () => {
  const created = await requestWithCookie(receptionistCookie, `/api/patients/${patient.id}/waitlist`, {
    method: 'POST',
    body: JSON.stringify({ requestedDate: '2099-05-20', reason: 'Urgent pain review', priority: 'urgent', notes: 'Call after 17:00', doctorId: doctor.id }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.requestedDate, '2099-05-20');
  assert.equal(created.body.priority, 'urgent');
  assert.equal(created.body.status, 'waiting');
  assert.equal(created.body.patient.phone, undefined);

  const listed = await requestWithCookie(receptionistCookie, '/api/waitlist');
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].patient.fullName, patient.fullName);

  const contacted = await requestWithCookie(receptionistCookie, `/api/waitlist/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'contacted' }) });
  assert.equal(contacted.response.status, 200);
  assert.equal(contacted.body.status, 'contacted');
  const missingLink = await requestWithCookie(receptionistCookie, `/api/waitlist/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'booked' }) });
  assert.equal(missingLink.response.status, 400);
  await ensureClinicSettings();
  const appointment = await requestWithCookie(receptionistCookie, '/api/appointments', { method: 'POST', body: JSON.stringify({ patientId: patient.id, doctorId: doctor.id, date: '2099-05-20', time: '10:00', duration: 30, treatmentType: 'Consultation', waitlistEntryId: created.body.id }) });
  assert.equal(appointment.response.status, 201);
  const booked = await requestWithCookie(receptionistCookie, `/api/waitlist?status=all&patientId=${patient.id}`);
  assert.equal(booked.response.status, 200);
  assert.equal(booked.body[0].appointment.id, appointment.body.id);
  assert.equal(booked.body[0].status, 'booked');
  const invalid = await requestWithCookie(receptionistCookie, `/api/waitlist/${created.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'waiting' }) });
  assert.equal(invalid.response.status, 409);
  const audits = await prisma.auditEvent.findMany({ where: { resource: 'waitlist' }, orderBy: { id: 'asc' } });
  assert.ok(audits.some((event) => event.action === 'create' && event.patientId === patient.id));
  assert.ok(audits.some((event) => event.action === 'transition' && event.patientId === patient.id));
});

test('rejects equivalent active entries and lets dentists request scheduling for any patient while keeping doctor scope', async () => {
  const first = await requestWithCookie(receptionistCookie, `/api/patients/${patient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ requestedDate: '2099-06-01', reason: '  Implant review  ', doctorId: doctor.id }) });
  assert.equal(first.response.status, 201);
  const duplicate = await requestWithCookie(receptionistCookie, `/api/patients/${patient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ requestedDate: '2099-06-01', reason: 'implant   review', doctorId: doctor.id }) });
  assert.equal(duplicate.response.status, 409);
  const other = await requestWithCookie(adminCookie, `/api/patients/${otherPatient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ reason: 'Other patient', doctorId: otherDoctor.id }) });
  assert.equal(other.response.status, 201);
  const patientHistory = await requestWithCookie(receptionistCookie, `/api/waitlist?status=all&patientId=${patient.id}`);
  assert.deepEqual(patientHistory.body.map((entry) => entry.id), [first.body.id]);
  const dentistList = await requestWithCookie(dentistCookie, '/api/waitlist?status=all');
  assert.deepEqual(dentistList.body.map((entry) => entry.id), [first.body.id]);
  const forbiddenCreate = await requestWithCookie(dentistCookie, `/api/patients/${otherPatient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ reason: 'Out of scope' }) });
  assert.equal(forbiddenCreate.response.status, 201);
  assert.equal(forbiddenCreate.body.doctorId, doctor.id);
  const forbiddenDoctor = await requestWithCookie(dentistCookie, `/api/patients/${patient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ reason: 'Wrong doctor', doctorId: otherDoctor.id }) });
  assert.equal(forbiddenDoctor.response.status, 403);
});

test('does not expose waitlist entries for archived patients and validates payloads', async () => {
  const created = await requestWithCookie(adminCookie, `/api/patients/${patient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ reason: 'Archive check' }) });
  assert.equal(created.response.status, 201);
  const archived = await requestWithCookie(adminCookie, `/api/patients/${patient.id}`, { method: 'DELETE' });
  assert.equal(archived.response.status, 200);
  const listed = await requestWithCookie(adminCookie, '/api/waitlist?status=all');
  assert.equal(listed.body.some((entry) => entry.id === created.body.id), false);
  const invalidDate = await requestWithCookie(adminCookie, `/api/patients/${otherPatient.id}/waitlist`, { method: 'POST', body: JSON.stringify({ requestedDate: '2099-02-30', reason: 'Bad date' }) });
  assert.equal(invalidDate.response.status, 400);
});
