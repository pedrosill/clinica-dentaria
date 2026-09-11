const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const temporaryDatabaseFilename = `dentalpro-integration-${Date.now()}-${process.pid}.db`;
const temporaryDatabasePath = path.join(serverRoot, 'prisma', temporaryDatabaseFilename);
const temporaryDatabaseUrl = `file:./${temporaryDatabaseFilename}`;
const previousDatabaseUrl = process.env.DATABASE_URL;

process.env.DATABASE_URL = temporaryDatabaseUrl;

const migrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260528011229_init_refreshed',
  'migration.sql'
);
const authMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911153000_add_authentication',
  'migration.sql'
);
const integrationDatabase = new Database(temporaryDatabasePath);
integrationDatabase.exec(fs.readFileSync(migrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(authMigrationPath, 'utf8'));
integrationDatabase.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');

let server;
let baseUrl;
let doctor;
let patients;
let sessionCookie;

async function request(pathname, options) {
  const headers = {
    ...(options?.headers || {}),
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
  };
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  return { response, body };
}

function appointmentPayload(overrides = {}) {
  return {
    patientId: patients[0].id,
    doctorId: doctor.id,
    date: '2099-01-15',
    time: '09:00',
    duration: 30,
    treatmentType: 'Consultation',
    notes: 'Integration test appointment',
    ...overrides,
  };
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.beforeEach(async () => {
  await prisma.appointment.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();

  doctor = await prisma.doctor.create({
    data: { name: 'Integration Doctor' },
  });

  patients = await Promise.all(
    ['Integration Patient One', 'Integration Patient Two'].map((fullName, index) =>
      prisma.patient.create({
        data: {
          fullName,
          phone: `91000000${index + 1}`,
          email: `integration${index + 1}@example.test`,
          nif: `99000000${index + 1}`,
          nationality: 'Portuguese',
        },
      })
    )
  );

  await prisma.user.create({
    data: {
      email: 'integration.admin@example.test',
      displayName: 'Integration Admin',
      passwordHash: hashPassword('integration-password-123'),
      role: 'admin',
    },
  });

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'integration.admin@example.test',
      password: 'integration-password-123',
    }),
  });
  assert.equal(loginResponse.status, 200);
  const setCookie = loginResponse.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  sessionCookie = setCookie.split(';')[0];
});

test.after(async () => {
  await prisma.$disconnect();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  if (previousDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = previousDatabaseUrl;
  }

  fs.rmSync(temporaryDatabasePath, { force: true });
});

test('availability returns the 30-minute clinic grid and marks booked slots', async () => {
  const createResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '09:00' })),
  });

  assert.equal(createResult.response.status, 201);

  const availabilityResult = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-15&duration=30`
  );

  assert.equal(availabilityResult.response.status, 200);
  assert.equal(availabilityResult.body.slots.length, 24);
  assert.equal(availabilityResult.body.slots[0].time, '08:00');
  assert.equal(availabilityResult.body.slots.at(-1).time, '19:30');
  assert.equal(
    availabilityResult.body.slots.find((slot) => slot.time === '09:00').status,
    'booked'
  );
  assert.equal(
    availabilityResult.body.slots.find((slot) => slot.time === '09:30').status,
    'free'
  );
});

test('rejects protected resource access without a session', async () => {
  const response = await fetch(`${baseUrl}/api/patients`);
  assert.equal(response.status, 401);
});

test('reports liveness and database readiness', async () => {
  const livenessResponse = await fetch(`${baseUrl}/health`);
  const readinessResponse = await fetch(`${baseUrl}/health/ready`);

  assert.equal(livenessResponse.status, 200);
  assert.deepEqual(await livenessResponse.json(), { status: 'ok' });
  assert.equal(readinessResponse.status, 200);
  assert.deepEqual(await readinessResponse.json(), { status: 'ready' });
});

test('enforces administrator-only doctor changes', async () => {
  await prisma.user.create({
    data: {
      email: 'integration.receptionist@example.test',
      displayName: 'Integration Receptionist',
      passwordHash: hashPassword('integration-receptionist-123'),
      role: 'receptionist',
    },
  });

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'integration.receptionist@example.test',
      password: 'integration-receptionist-123',
    }),
  });
  const receptionistCookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const response = await fetch(`${baseUrl}/api/doctors`, {
    method: 'POST',
    headers: {
      Cookie: receptionistCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Not Allowed Doctor' }),
  });

  assert.equal(response.status, 403);
});

test('the API rejects out-of-hours and impossible date-only appointments', async () => {
  const invalidTimeResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '07:30' })),
  });

  const invalidDateResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ date: '2099-02-29' })),
  });

  assert.equal(invalidTimeResult.response.status, 400);
  assert.equal(invalidDateResult.response.status, 400);
});

test('rescheduling persists the new date/time and frees the old slot', async () => {
  const createResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload()),
  });
  const appointment = createResult.body;

  const rescheduleResult = await request(`/api/appointments/${appointment.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({
      date: '2099-01-16',
      time: '10:00',
    })),
  });

  assert.equal(rescheduleResult.response.status, 200);
  assert.equal(rescheduleResult.body.time, '10:00');
  assert.match(rescheduleResult.body.date, /^2099-01-16/);

  const oldDateAvailability = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-15&duration=30`
  );
  const newDateAvailability = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-16&duration=30`
  );

  assert.equal(
    oldDateAvailability.body.slots.find((slot) => slot.time === '09:00').status,
    'free'
  );
  assert.equal(
    newDateAvailability.body.slots.find((slot) => slot.time === '10:00').status,
    'booked'
  );
});

test('preserves arrived status and blocks terminal appointment edits', async () => {
  const arrivedResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({
      patientId: patients[1].id,
      status: 'arrived',
    })),
  });

  const arrivedUpdateResult = await request(
    `/api/appointments/${arrivedResult.body.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload({
        patientId: patients[1].id,
        date: '2099-01-15',
        time: '09:30',
      })),
    }
  );

  assert.equal(arrivedUpdateResult.response.status, 200);
  assert.equal(arrivedUpdateResult.body.status, 'arrived');

  const cancelledStatusResult = await request(
    `/api/appointments/${arrivedResult.body.id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  );

  assert.equal(cancelledStatusResult.response.status, 200);

  const cancelledUpdateResult = await request(
    `/api/appointments/${arrivedResult.body.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload({ time: '10:00' })),
    }
  );

  assert.equal(cancelledUpdateResult.response.status, 409);
});
