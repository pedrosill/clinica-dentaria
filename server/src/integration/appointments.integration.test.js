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
const integrationDatabase = new Database(temporaryDatabasePath);
integrationDatabase.exec(fs.readFileSync(migrationPath, 'utf8'));
integrationDatabase.close();

const app = require('../app');
const prisma = require('../../db');

let server;
let baseUrl;
let doctor;
let patients;

async function request(pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
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
