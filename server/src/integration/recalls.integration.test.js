const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const databaseFilename = `dentalpro-recalls-${Date.now()}-${process.pid}.db`;
const databasePath = path.join(serverRoot, 'prisma', databaseFilename);
process.env.DATABASE_URL = `file:./${databaseFilename}`;

const migrationNames = [
  '20260528011229_init_refreshed',
  '20260911153000_add_authentication',
  '20260911170000_add_clinic_settings',
  '20260911190000_add_clinical_records',
  '20260911200000_add_clinic_language',
  '20260911210000_add_authorization_scope_and_archiving',
  '20260911220000_add_data_governance',
  '20260911230000_add_patient_recalls',
  '20260911240000_add_waitlist_entries',
  '20260912100000_link_waitlist_appointments',
  '20260912110000_add_mfa_and_password_recovery',
  '20260912120000_add_compliance_transcription_documents',
  '20260912130000_add_appointment_arrived_at',
  '20260912130000_add_appointment_confirmations',
];
const database = new Database(databasePath);
for (const migrationName of migrationNames) {
  database.exec(fs.readFileSync(path.join(serverRoot, 'prisma', 'migrations', migrationName, 'migration.sql'), 'utf8'));
}
database.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');

let server;
let baseUrl;
let adminCookie;
let receptionistCookie;
let dentistCookie;
let csrfCookie;
let csrfToken;
let doctor;
let secondDoctor;
let patient;
let secondPatient;

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0];
}

async function request(pathname, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(csrfCookie || adminCookie || receptionistCookie || dentistCookie
      ? { Cookie: [csrfCookie, options.cookie, adminCookie, receptionistCookie, dentistCookie].filter(Boolean).join('; ') }
      : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  return { response, body: await response.json().catch(() => null) };
}

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
  await prisma.patientRecall.deleteMany();
  await prisma.dataSubjectRequest.deleteMany();
  await prisma.patientDocument.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.retentionHold.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatmentPlanItem.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.toothChartEntry.deleteMany();
  await prisma.patientClinicalProfile.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.providerSchedule.deleteMany();
  await prisma.clinicSettings.deleteMany();

  doctor = await prisma.doctor.create({ data: { name: 'Recall Doctor' } });
  secondDoctor = await prisma.doctor.create({ data: { name: 'Other Recall Doctor' } });
  [patient, secondPatient] = await Promise.all(['Recall Patient One', 'Recall Patient Two'].map((fullName, index) => prisma.patient.create({
    data: {
      fullName,
      phone: `9100000${index}1`,
      email: `recall${index + 1}@example.test`,
      nif: `98000000${index + 1}`,
      nationality: 'Portuguese',
    },
  })));
  const admin = await prisma.user.create({ data: { email: 'recall.admin@example.test', displayName: 'Recall Admin', passwordHash: hashPassword('recall-admin-password'), role: 'admin' } });
  const receptionist = await prisma.user.create({ data: { email: 'recall.reception@example.test', displayName: 'Recall Reception', passwordHash: hashPassword('recall-reception-password'), role: 'receptionist' } });
  const dentist = await prisma.user.create({ data: { email: 'recall.dentist@example.test', displayName: 'Recall Dentist', passwordHash: hashPassword('recall-dentist-password'), role: 'dentist' } });
  await prisma.doctor.update({ where: { id: doctor.id }, data: { userId: dentist.id } });
  await prisma.appointment.create({ data: { patientId: patient.id, doctorId: doctor.id, date: new Date('2099-01-15T00:00:00'), time: '09:00', treatmentType: 'Consultation' } });
  adminCookie = await login(admin.email, 'recall-admin-password');
  receptionistCookie = await login(receptionist.email, 'recall-reception-password');
  dentistCookie = await login(dentist.email, 'recall-dentist-password');
});

test.after(async () => {
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(databasePath, { force: true });
});

test('creates, lists and audits a persistent recall', async () => {
  const created = await request(`/api/patients/${patient.id}/recalls`, {
    method: 'POST',
    headers: { Cookie: [csrfCookie, adminCookie].join('; ') },
    body: JSON.stringify({ dueDate: '2099-05-20', reason: 'Six month check-up' }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.dueDate, '2099-05-20');
  assert.equal(created.body.status, 'due');

  const listed = await requestWithCookie(adminCookie, '/api/recalls');
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].patient.fullName, patient.fullName);

  const audits = await prisma.auditEvent.findMany({ where: { resource: 'recall' }, orderBy: { id: 'asc' } });
  assert.ok(audits.some((event) => event.action === 'create' && event.patientId === patient.id));
});

test('rejects equivalent active recalls and enforces valid transitions', async () => {
  const first = await requestWithCookie(receptionistCookie, `/api/patients/${patient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-06-01', reason: '  Hygiene review  ' }) });
  assert.equal(first.response.status, 201);
  const duplicate = await requestWithCookie(receptionistCookie, `/api/patients/${patient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-06-01', reason: 'hygiene   review' }) });
  assert.equal(duplicate.response.status, 409);

  const scheduled = await requestWithCookie(receptionistCookie, `/api/recalls/${first.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled' }) });
  assert.equal(scheduled.response.status, 200);
  assert.equal(scheduled.body.status, 'scheduled');
  const completed = await requestWithCookie(receptionistCookie, `/api/recalls/${first.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
  assert.equal(completed.response.status, 200);
  assert.ok(completed.body.completedAt);
  const invalid = await requestWithCookie(receptionistCookie, `/api/recalls/${first.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'due' }) });
  assert.equal(invalid.response.status, 409);
});

test('limits dentist access to their patients and doctor scope', async () => {
  const ownRecall = await requestWithCookie(adminCookie, `/api/patients/${patient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-07-01', reason: 'Own patient review', doctorId: doctor.id }) });
  const otherRecall = await requestWithCookie(adminCookie, `/api/patients/${secondPatient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-07-01', reason: 'Other patient review', doctorId: secondDoctor.id }) });
  assert.equal(ownRecall.response.status, 201);
  assert.equal(otherRecall.response.status, 201);

  const dentistList = await requestWithCookie(dentistCookie, '/api/recalls?status=all');
  assert.equal(dentistList.response.status, 200);
  assert.deepEqual(dentistList.body.map((recall) => recall.id), [ownRecall.body.id]);
  const forbiddenTransition = await requestWithCookie(dentistCookie, `/api/recalls/${otherRecall.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled' }) });
  assert.equal(forbiddenTransition.response.status, 404);
  const forbiddenCreate = await requestWithCookie(dentistCookie, `/api/patients/${secondPatient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-08-01', reason: 'Not in scope' }) });
  assert.equal(forbiddenCreate.response.status, 404);
});

test('does not expose recalls for an archived patient', async () => {
  const created = await requestWithCookie(adminCookie, `/api/patients/${secondPatient.id}/recalls`, { method: 'POST', body: JSON.stringify({ dueDate: '2099-09-01', reason: 'Archive check' }) });
  assert.equal(created.response.status, 201);
  const archived = await requestWithCookie(adminCookie, `/api/patients/${secondPatient.id}`, { method: 'DELETE' });
  assert.equal(archived.response.status, 200);
  const all = await requestWithCookie(adminCookie, '/api/recalls?status=all');
  assert.equal(all.response.status, 200);
  assert.equal(all.body.some((recall) => recall.id === created.body.id), false);
});
