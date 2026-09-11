const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const temporaryDatabaseFilename = `dentalpro-reports-${Date.now()}-${process.pid}.db`;
const temporaryDatabasePath = path.join(serverRoot, 'prisma', temporaryDatabaseFilename);
const previousDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = `file:./${temporaryDatabaseFilename}`;

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
];
const integrationDatabase = new Database(temporaryDatabasePath);
migrationNames.forEach((migrationName) => {
  integrationDatabase.exec(fs.readFileSync(
    path.join(serverRoot, 'prisma', 'migrations', migrationName, 'migration.sql'),
    'utf8'
  ));
});
integrationDatabase.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');

let server;
let baseUrl;
let doctors;
let patients;
let adminCookie;
let csrfCookie;
let csrfToken;

async function requestWithSession(cookie, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: [csrfCookie, cookie].filter(Boolean).join('; '),
      'X-CSRF-Token': csrfToken,
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function loginAs(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrfCookie,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}

async function createAppointment(overrides = {}) {
  return prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].id,
      date: new Date('2099-01-15T00:00:00'),
      time: '09:00',
      duration: 30,
      treatmentType: 'Consultation',
      status: 'scheduled',
      notes: 'Private operational test note',
      completionNotes: 'Private completion detail',
      ...overrides,
    },
  });
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(async () => {
  await prisma.patientRecall.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.providerSchedule.deleteMany();
  await prisma.clinicSettings.deleteMany();

  doctors = await Promise.all([
    prisma.doctor.create({ data: { name: 'Reports Doctor One' } }),
    prisma.doctor.create({ data: { name: 'Reports Doctor Two' } }),
  ]);
  patients = await Promise.all(
    ['Reports Patient One', 'Reports Patient Two'].map((fullName, index) => prisma.patient.create({
      data: {
        fullName,
        phone: `91000010${index + 1}`,
        email: `reports${index + 1}@example.test`,
        nif: `98000000${index + 1}`,
        nationality: 'Portuguese',
      },
    }))
  );

  await prisma.user.create({
    data: {
      email: 'reports.admin@example.test',
      displayName: 'Reports Admin',
      passwordHash: hashPassword('reports-admin-password-123'),
      role: 'admin',
    },
  });
  await prisma.user.create({
    data: {
      email: 'reports.receptionist@example.test',
      displayName: 'Reports Receptionist',
      passwordHash: hashPassword('reports-receptionist-123'),
      role: 'receptionist',
    },
  });
  const dentist = await prisma.user.create({
    data: {
      email: 'reports.dentist@example.test',
      displayName: 'Reports Dentist',
      passwordHash: hashPassword('reports-dentist-password-123'),
      role: 'dentist',
    },
  });
  await prisma.doctor.update({ where: { id: doctors[0].id }, data: { userId: dentist.id } });

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.status, 200);
  csrfToken = (await csrfResponse.json()).csrfToken;
  csrfCookie = csrfResponse.headers.get('set-cookie').split(';')[0];
  adminCookie = await loginAs('reports.admin@example.test', 'reports-admin-password-123');
});

test.after(async () => {
  await prisma.$disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  fs.rmSync(temporaryDatabasePath, { force: true });
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

test('filters report rows and minimizes operational responses', async () => {
  await createAppointment({ status: 'completed', doctorId: doctors[0].id, treatmentType: 'Cleaning' });
  await createAppointment({
    patientId: patients[1].id,
    doctorId: doctors[1].id,
    time: '10:00',
    status: 'no_show',
    treatmentType: 'Review',
  });

  const result = await requestWithSession(
    adminCookie,
    `/api/reports/appointments?from=2099-01-01&to=2099-01-31&doctorId=${doctors[0].id}&status=completed`
  );

  assert.equal(result.response.status, 200);
  assert.equal(result.body.summary.total, 1);
  assert.equal(result.body.summary.byStatus.completed, 1);
  assert.equal(result.body.rows.length, 1);
  const row = result.body.rows[0];
  assert.deepEqual(Object.keys(row).sort(), ['date', 'doctor', 'duration', 'id', 'patient', 'status', 'time', 'treatmentType'].sort());
  assert.deepEqual(Object.keys(row.doctor).sort(), ['id', 'name']);
  assert.deepEqual(Object.keys(row.patient).sort(), ['id', 'name']);
  assert.equal(row.patient.name, 'Reports Patient One');
  assert.equal(row.doctor.name, 'Reports Doctor One');
  assert.equal(Object.hasOwn(row, 'notes'), false);
  assert.equal(Object.hasOwn(row, 'completionNotes'), false);
  assert.doesNotMatch(JSON.stringify(result.body), /Private (operational|completion)/);
});

test('allows clinic-wide access for reception and scopes dentists to their doctor', async () => {
  await createAppointment({ doctorId: doctors[0].id });
  await createAppointment({ doctorId: doctors[1].id, patientId: patients[1].id, time: '10:00' });

  const receptionistCookie = await loginAs('reports.receptionist@example.test', 'reports-receptionist-123');
  const receptionistResult = await requestWithSession(
    receptionistCookie,
    '/api/reports/appointments?from=2099-01-15&to=2099-01-15'
  );
  assert.equal(receptionistResult.response.status, 200);
  assert.equal(receptionistResult.body.summary.total, 2);

  const dentistCookie = await loginAs('reports.dentist@example.test', 'reports-dentist-password-123');
  const dentistResult = await requestWithSession(
    dentistCookie,
    '/api/reports/appointments?from=2099-01-15&to=2099-01-15'
  );
  assert.equal(dentistResult.response.status, 200);
  assert.equal(dentistResult.body.summary.total, 1);
  assert.equal(dentistResult.body.rows[0].doctor.id, doctors[0].id);

  const forbiddenFilter = await requestWithSession(
    dentistCookie,
    `/api/reports/appointments?from=2099-01-15&to=2099-01-15&doctorId=${doctors[1].id}`
  );
  assert.equal(forbiddenFilter.response.status, 403);
});

test('validates report range, status, and row limit', async () => {
  const invalidStatus = await requestWithSession(
    adminCookie,
    '/api/reports/appointments?from=2099-01-01&to=2099-01-01&status=clinical'
  );
  assert.equal(invalidStatus.response.status, 400);

  const invertedRange = await requestWithSession(
    adminCookie,
    '/api/reports/appointments?from=2099-01-02&to=2099-01-01'
  );
  assert.equal(invertedRange.response.status, 400);

  const oversizedRange = await requestWithSession(
    adminCookie,
    '/api/reports/appointments?from=2099-01-01&to=2100-01-02'
  );
  assert.equal(oversizedRange.response.status, 400);

  const unsafeLimit = await requestWithSession(
    adminCookie,
    '/api/reports/appointments?from=2099-01-01&to=2099-01-01&limit=201'
  );
  assert.equal(unsafeLimit.response.status, 400);
});
