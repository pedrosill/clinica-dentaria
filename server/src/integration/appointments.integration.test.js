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
const clinicSettingsMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911170000_add_clinic_settings',
  'migration.sql'
);
const clinicalRecordsMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911190000_add_clinical_records',
  'migration.sql'
);
const clinicLanguageMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911200000_add_clinic_language',
  'migration.sql'
);
const authorizationScopeMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911210000_add_authorization_scope_and_archiving',
  'migration.sql'
);
const dataGovernanceMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911220000_add_data_governance',
  'migration.sql'
);
const patientRecallsMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911230000_add_patient_recalls',
  'migration.sql'
);
const waitlistMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260911240000_add_waitlist_entries',
  'migration.sql'
);
const waitlistAppointmentsMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260912100000_link_waitlist_appointments',
  'migration.sql'
);
const mfaMigrationPath = path.join(serverRoot, 'prisma', 'migrations', '20260912110000_add_mfa_and_password_recovery', 'migration.sql');
const complianceMigrationPath = path.join(serverRoot, 'prisma', 'migrations', '20260912120000_add_compliance_transcription_documents', 'migration.sql');
const arrivedAtMigrationPath = path.join(serverRoot, 'prisma', 'migrations', '20260912130000_add_appointment_arrived_at', 'migration.sql');
const integrationDatabase = new Database(temporaryDatabasePath);
integrationDatabase.exec(fs.readFileSync(migrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(authMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(clinicSettingsMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(clinicalRecordsMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(clinicLanguageMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(authorizationScopeMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(dataGovernanceMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(patientRecallsMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(waitlistMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(waitlistAppointmentsMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(mfaMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(complianceMigrationPath, 'utf8'));
integrationDatabase.exec(fs.readFileSync(arrivedAtMigrationPath, 'utf8'));
integrationDatabase.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');

let server;
let baseUrl;
let doctor;
let patients;
let sessionCookie;
let csrfCookie;
let csrfToken;

async function request(pathname, options) {
  const headers = {
    ...(options?.headers || {}),
    ...([csrfCookie, sessionCookie].filter(Boolean).length > 0
      ? { Cookie: [csrfCookie, sessionCookie].filter(Boolean).join('; ') }
      : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  return { response, body };
}

async function loginAs(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}

async function requestWithSession(cookie, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: [csrfCookie, cookie].filter(Boolean).join('; '),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
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
  await prisma.patientRecall.deleteMany();
  await prisma.clinicalNoteAddendum.deleteMany();
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

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.status, 200);
  csrfToken = (await csrfResponse.json()).csrfToken;
  csrfCookie = csrfResponse.headers.get('set-cookie').split(';')[0];

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: csrfCookie,
    },
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
  assert.equal(livenessResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(livenessResponse.headers.get('x-frame-options'), 'DENY');
  assert.deepEqual(await livenessResponse.json(), { status: 'ok' });
  assert.equal(readinessResponse.status, 200);
  assert.deepEqual(await readinessResponse.json(), { status: 'ready' });
});

test('rejects state-changing requests without CSRF and from an untrusted origin', async () => {
  const missingTokenResponse = await fetch(`${baseUrl}/api/settings`, {
    method: 'PUT',
    headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(missingTokenResponse.status, 403);

  const untrustedOriginResponse = await fetch(`${baseUrl}/api/settings`, {
    method: 'PUT',
    headers: {
      Cookie: [csrfCookie, sessionCookie].join('; '),
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Origin: 'https://untrusted.example',
    },
    body: JSON.stringify({}),
  });
  assert.equal(untrustedOriginResponse.status, 403);
});

test('weekly hours, breaks, and provider availability control booking slots', async () => {
  const initialSettings = await request('/api/settings');
  const schedules = initialSettings.body.schedules.map((schedule) => ({
    weekday: schedule.weekday,
    isOpen: schedule.weekday === 4 ? true : schedule.isOpen,
    startTime: schedule.weekday === 4 ? '09:00' : schedule.startTime,
    endTime: schedule.weekday === 4 ? '18:00' : schedule.endTime,
    breakStart: schedule.weekday === 4 ? '12:00' : schedule.breakStart,
    breakEnd: schedule.weekday === 4 ? '13:00' : schedule.breakEnd,
  }));

  const updateResult = await request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: initialSettings.body.clinicName,
      timezone: initialSettings.body.timezone,
      slotIntervalMinutes: 30,
      schedules,
    }),
  });

  assert.equal(updateResult.response.status, 200);
  assert.equal(updateResult.body.schedules.find((schedule) => schedule.weekday === 4).startTime, '09:00');
  const persistedThursday = await prisma.clinicSchedule.findUnique({
    where: { settingsId_weekday: { settingsId: 1, weekday: 4 } },
  });
  assert.equal(persistedThursday.startTime, '09:00');
  assert.equal(
    await prisma.providerSchedule.count({ where: { doctorId: doctor.id } }),
    0
  );

  const availabilityResult = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-15&duration=30`
  );

  assert.equal(availabilityResult.response.status, 200);
  assert.equal(availabilityResult.body.clinicOpenTime, '09:00');
  assert.equal(availabilityResult.body.clinicCloseTime, '18:00');
  assert.equal(availabilityResult.body.slots[0].time, '09:00');
  assert.equal(
    availabilityResult.body.slots.find((slot) => slot.time === '12:00').status,
    'unavailable'
  );
  assert.equal(
    availabilityResult.body.slots.find((slot) => slot.time === '17:30').status,
    'free'
  );
  assert.equal(
    availabilityResult.body.slots.find((slot) => slot.time === '18:00'),
    undefined
  );

  const outsideHoursResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '08:30' })),
  });
  assert.equal(outsideHoursResult.response.status, 400);

  const breakResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '12:00' })),
  });
  assert.equal(breakResult.response.status, 400);

  const providerResult = await request(`/api/settings/providers/${doctor.id}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days: updateResult.body.schedules.map((schedule) => ({
        weekday: schedule.weekday,
        isWorking: schedule.weekday !== 5,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
      })),
    }),
  });
  assert.equal(providerResult.response.status, 200);

  const providerClosedAvailability = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-16&duration=30`
  );
  assert.equal(providerClosedAvailability.body.isClosed, true);
  assert.equal(providerClosedAvailability.body.slots.length, 0);
});

test('clinical record supports profile, odontogram, notes, and treatment plans', async () => {
  const initialRecord = await request(`/api/patients/${patients[0].id}/clinical`);
  assert.equal(initialRecord.response.status, 200);
  assert.equal(initialRecord.body.toothChart.length, 0);
  assert.equal(initialRecord.body.notes.length, 0);

  const profileResult = await request(`/api/patients/${patients[0].id}/clinical/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allergies: 'Latex',
      medications: 'None',
      medicalConditions: 'No relevant conditions',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '9100000099',
      dentalNotes: 'Dental anxiety noted',
    }),
  });
  assert.equal(profileResult.response.status, 200);
  assert.equal(profileResult.body.allergies, 'Latex');

  const toothResult = await request(`/api/patients/${patients[0].id}/clinical/teeth`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toothNumber: '16',
      surface: 'occlusal',
      condition: 'caries',
      status: 'active',
      notes: 'Review on next visit',
    }),
  });
  assert.equal(toothResult.response.status, 200);
  assert.equal(toothResult.body.toothNumber, '16');

  const appointmentResult = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '10:00' })),
  });
  assert.equal(appointmentResult.response.status, 201);

  const noteResult = await request(`/api/patients/${patients[0].id}/clinical/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointmentId: appointmentResult.body.id,
      chiefComplaint: 'Sensitivity',
      clinicalFindings: 'Caries on tooth 16',
      diagnosis: 'Occlusal caries',
      treatmentPerformed: 'Assessment completed',
      recommendations: 'Discuss restoration options',
    }),
  });
  assert.equal(noteResult.response.status, 201);
  assert.equal(noteResult.body.status, 'draft');

  const finalNoteResult = await request(`/api/patients/${patients[0].id}/clinical/notes/${noteResult.body.id}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(finalNoteResult.response.status, 200);
  assert.equal(finalNoteResult.body.status, 'final');
  assert.ok(finalNoteResult.body.validatedById);
  assert.ok(finalNoteResult.body.validatedAt);

  const addendumResult = await request(`/api/patients/${patients[0].id}/clinical/notes/${noteResult.body.id}/addenda`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'Clarification added without changing the signed note.' }),
  });
  assert.equal(addendumResult.response.status, 201);
  assert.equal(addendumResult.body.version, 1);

  const lockedNoteResult = await request(`/api/patients/${patients[0].id}/clinical/notes/${noteResult.body.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...finalNoteResult.body, status: 'draft' }),
  });
  assert.equal(lockedNoteResult.response.status, 409);
  await assert.rejects(
    prisma.clinicalNote.update({
      where: { id: noteResult.body.id },
      data: { diagnosis: 'Direct database edit must be rejected' },
    })
  );

  const planResult = await request(`/api/patients/${patients[0].id}/clinical/treatment-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Initial restorative plan', notes: 'Review with patient' }),
  });
  assert.equal(planResult.response.status, 201);

  const itemResult = await request(`/api/patients/${patients[0].id}/clinical/treatment-plans/${planResult.body.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ procedureName: 'Composite restoration', toothNumber: '16', surface: 'occlusal', priority: 1 }),
  });
  assert.equal(itemResult.response.status, 201);

  const finalRecord = await request(`/api/patients/${patients[0].id}/clinical`);
  assert.equal(finalRecord.body.toothChart.length, 1);
  assert.equal(finalRecord.body.notes.length, 1);
  assert.equal(finalRecord.body.notes[0].addenda.length, 1);
  assert.equal(finalRecord.body.treatmentPlans[0].items.length, 1);
});

test('clinic settings control closures and appointment templates', async () => {
  const initialSettings = await request('/api/settings');

  assert.equal(initialSettings.response.status, 200);
  assert.equal(initialSettings.body.language, 'en');
  assert.equal(initialSettings.body.slotIntervalMinutes, 30);
  assert.equal(initialSettings.body.schedules.find((day) => day.weekday === 1).startTime, '08:00');

  // The settings UI presents Monday first and Sunday last. The API must use
  // each entry's explicit weekday instead of treating array position as the day.
  const uiOrderedSchedules = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    ...initialSettings.body.schedules.find((day) => day.weekday === weekday),
    isOpen: weekday !== 0,
  }));
  const weeklyScheduleUpdate = await request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: initialSettings.body.clinicName,
      timezone: initialSettings.body.timezone,
      language: initialSettings.body.language,
      slotIntervalMinutes: 30,
      schedules: uiOrderedSchedules,
    }),
  });

  assert.equal(weeklyScheduleUpdate.response.status, 200);
  assert.equal(weeklyScheduleUpdate.body.schedules.find((day) => day.weekday === 0).isOpen, false);
  assert.equal(weeklyScheduleUpdate.body.schedules.find((day) => day.weekday === 6).isOpen, true);

  const closureResult = await request('/api/settings/closures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2099-01-15', label: 'Staff training' }),
  });

  assert.equal(closureResult.response.status, 201);
  assert.equal(closureResult.body.date, '2099-01-15');

  const closedAvailability = await request(
    `/api/appointments/availability?doctorId=${doctor.id}&date=2099-01-15&duration=30`
  );

  assert.equal(closedAvailability.response.status, 200);
  assert.equal(closedAvailability.body.isClosed, true);
  assert.equal(closedAvailability.body.slots.length, 0);

  const typeResult = await request('/api/settings/appointment-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Emergency visit', duration: 60 }),
  });

  assert.equal(typeResult.response.status, 201);
  assert.equal(typeResult.body.duration, 60);

  const settingsAfterUpdate = await request('/api/settings');
  assert.ok(
    settingsAfterUpdate.body.appointmentTypes.some((type) => type.name === 'Emergency visit')
  );

  const languageUpdate = await request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: initialSettings.body.clinicName,
      timezone: initialSettings.body.timezone,
      language: 'pt-PT',
      slotIntervalMinutes: 30,
      schedules: initialSettings.body.schedules,
    }),
  });
  assert.equal(languageUpdate.response.status, 200);
  assert.equal(languageUpdate.body.language, 'pt-PT');

  const legacySettingsUpdate = await request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: initialSettings.body.clinicName,
      timezone: initialSettings.body.timezone,
      slotIntervalMinutes: 30,
      schedules: initialSettings.body.schedules,
    }),
  });
  assert.equal(legacySettingsUpdate.response.status, 200);
  assert.equal(legacySettingsUpdate.body.language, 'pt-PT');

  const invalidLanguageUpdate = await request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinicName: initialSettings.body.clinicName,
      timezone: initialSettings.body.timezone,
      language: 'fr',
      slotIntervalMinutes: 30,
      schedules: initialSettings.body.schedules,
    }),
  });
  assert.equal(invalidLanguageUpdate.response.status, 400);
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
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: csrfCookie,
    },
    body: JSON.stringify({
      email: 'integration.receptionist@example.test',
      password: 'integration-receptionist-123',
    }),
  });
  const receptionistCookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const response = await fetch(`${baseUrl}/api/doctors`, {
    method: 'POST',
    headers: {
      Cookie: [csrfCookie, receptionistCookie].join('; '),
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
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
  assert.ok(arrivedUpdateResult.body.arrivedAt);

  const cancelledStatusResult = await request(
    `/api/appointments/${arrivedResult.body.id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }
  );

  assert.equal(cancelledStatusResult.response.status, 200);

  const cancelledConclusionResult = await request(
    `/api/appointments/${arrivedResult.body.id}/conclude`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performedTreatment: 'Must be rejected' }),
    }
  );

  assert.equal(cancelledConclusionResult.response.status, 409);

  const reopenedStatusResult = await request(
    `/api/appointments/${arrivedResult.body.id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'scheduled' }),
    }
  );

  assert.equal(reopenedStatusResult.response.status, 409);

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

test('enforces role and dentist-to-doctor clinical scope', async () => {
  const dentist = await prisma.user.create({
    data: {
      email: 'integration.dentist@example.test',
      displayName: 'Integration Dentist',
      passwordHash: hashPassword('integration-dentist-123'),
      role: 'dentist',
    },
  });
  await prisma.doctor.update({ where: { id: doctor.id }, data: { userId: dentist.id } });

  const ownAppointment = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload()),
  });
  assert.equal(ownAppointment.response.status, 201);

  const receptionist = await prisma.user.create({
    data: {
      email: 'integration.receptionist.clinical@example.test',
      displayName: 'Integration Receptionist Clinical',
      passwordHash: hashPassword('integration-receptionist-123'),
      role: 'receptionist',
    },
  });
  assert.ok(receptionist.id);
  const receptionistCookie = await loginAs(
    'integration.receptionist.clinical@example.test',
    'integration-receptionist-123'
  );
  const receptionistClinicalWrite = await requestWithSession(
    receptionistCookie,
    `/api/patients/${patients[0].id}/clinical/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergies: 'Should be denied' }),
    }
  );
  assert.equal(receptionistClinicalWrite.response.status, 403);

  const dentistCookie = await loginAs(
    'integration.dentist@example.test',
    'integration-dentist-123'
  );
  const dentistAgendaEdit = await requestWithSession(
    dentistCookie,
    `/api/appointments/${ownAppointment.body.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload({ time: '10:00' })),
    }
  );
  assert.equal(dentistAgendaEdit.response.status, 200);
  assert.equal(dentistAgendaEdit.body.time, '10:00');

  const dentistConclusion = await requestWithSession(
    dentistCookie,
    `/api/appointments/${ownAppointment.body.id}/conclude`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performedTreatment: 'Completed by assigned dentist',
        completionNotes: 'Clinical conclusion persisted',
      }),
    }
  );
  assert.equal(dentistConclusion.response.status, 200);
  assert.equal(dentistConclusion.body.status, 'completed');
  assert.equal(dentistConclusion.body.clinicalNote.status, 'draft');
  assert.equal(dentistConclusion.body.clinicalNote.treatmentPerformed, 'Completed by assigned dentist');

  const repeatedDentistConclusion = await requestWithSession(
    dentistCookie,
    `/api/appointments/${ownAppointment.body.id}/conclude`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performedTreatment: 'Must not create a second note' }),
    }
  );
  assert.equal(repeatedDentistConclusion.response.status, 409);

  const dentistTerminalEdit = await requestWithSession(
    dentistCookie,
    `/api/appointments/${ownAppointment.body.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload({ time: '10:30' })),
    }
  );
  assert.equal(dentistTerminalEdit.response.status, 409);

  const ownClinicalRead = await requestWithSession(
    dentistCookie,
    `/api/patients/${patients[0].id}/clinical`
  );
  assert.equal(ownClinicalRead.response.status, 200);

  const ownClinicalWrite = await requestWithSession(
    dentistCookie,
    `/api/patients/${patients[0].id}/clinical/profile`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergies: 'Dentist update allowed' }),
    }
  );
  assert.equal(ownClinicalWrite.response.status, 200);

  const unrelatedClinicalRead = await requestWithSession(
    dentistCookie,
    `/api/patients/${patients[1].id}/clinical`
  );
  assert.equal(unrelatedClinicalRead.response.status, 404);

  const secondDoctor = await prisma.doctor.create({ data: { name: 'Other Doctor' } });
  const otherDoctorAppointment = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({
      patientId: patients[1].id,
      doctorId: secondDoctor.id,
      time: '10:00',
    })),
  });
  assert.equal(otherDoctorAppointment.response.status, 201);

  const unrelatedAppointmentRead = await requestWithSession(
    dentistCookie,
    `/api/appointments/${otherDoctorAppointment.body.id}`
  );
  assert.equal(unrelatedAppointmentRead.response.status, 200);

  const dentistAppointments = await requestWithSession(dentistCookie, '/api/appointments');
  assert.equal(dentistAppointments.response.status, 200);
  assert.equal(dentistAppointments.body.some((item) => item.id === otherDoctorAppointment.body.id), true);

  const dentistPatients = await requestWithSession(dentistCookie, '/api/patients');
  assert.equal(dentistPatients.response.status, 200);
  assert.equal(dentistPatients.body.some((item) => item.id === patients[1].id), true);

  const dentistDoctors = await requestWithSession(dentistCookie, '/api/doctors');
  assert.equal(dentistDoctors.response.status, 200);
  assert.equal(dentistDoctors.body.some((item) => item.id === secondDoctor.id), true);

  const unrelatedAppointmentEdit = await requestWithSession(
    dentistCookie,
    `/api/appointments/${otherDoctorAppointment.body.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentPayload({
        patientId: patients[1].id,
        doctorId: secondDoctor.id,
        time: '10:30',
      })),
    }
  );
  assert.equal(unrelatedAppointmentEdit.response.status, 403);
});

test('rejects cross-patient links for notes, plans, items, and nested updates', async () => {
  const firstAppointment = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ time: '09:00' })),
  });
  const secondAppointment = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ patientId: patients[1].id, time: '10:00' })),
  });
  assert.equal(firstAppointment.response.status, 201);
  assert.equal(secondAppointment.response.status, 201);

  const invalidNote = await request(`/api/patients/${patients[0].id}/clinical/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointmentId: secondAppointment.body.id, chiefComplaint: 'Invalid link' }),
  });
  assert.equal(invalidNote.response.status, 400);

  const validNote = await request(`/api/patients/${patients[0].id}/clinical/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointmentId: firstAppointment.body.id, chiefComplaint: 'Valid link' }),
  });
  assert.equal(validNote.response.status, 201);

  const invalidNotePath = await request(`/api/patients/${patients[1].id}/clinical/notes/${validNote.body.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chiefComplaint: 'Wrong patient path' }),
  });
  assert.equal(invalidNotePath.response.status, 404);

  const plan = await request(`/api/patients/${patients[0].id}/clinical/treatment-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Integrity plan' }),
  });
  assert.equal(plan.response.status, 201);

  const invalidItem = await request(`/api/patients/${patients[0].id}/clinical/treatment-plans/${plan.body.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appointmentId: secondAppointment.body.id,
      procedureName: 'Must be rejected',
    }),
  });
  assert.equal(invalidItem.response.status, 400);

  const item = await request(`/api/patients/${patients[0].id}/clinical/treatment-plans/${plan.body.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ procedureName: 'Valid procedure', toothNumber: '16' }),
  });
  assert.equal(item.response.status, 201);

  const invalidItemPath = await request(`/api/patients/${patients[1].id}/clinical/treatment-plan-items/${item.body.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ procedureName: 'Wrong patient path' }),
  });
  assert.equal(invalidItemPath.response.status, 404);
});

test('archives patients and appointments without physical deletion', async () => {
  const appointment = await request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentPayload({ patientId: patients[1].id })),
  });
  assert.equal(appointment.response.status, 201);

  const archivedAppointment = await request(`/api/appointments/${appointment.body.id}`, {
    method: 'DELETE',
  });
  assert.equal(archivedAppointment.response.status, 200);
  const storedAppointment = await prisma.appointment.findUnique({ where: { id: appointment.body.id } });
  assert.equal(storedAppointment.status, 'cancelled');
  assert.ok(storedAppointment.archivedAt);

  const archivedPatient = await request(`/api/patients/${patients[1].id}`, { method: 'DELETE' });
  assert.equal(archivedPatient.response.status, 200);
  const storedPatient = await prisma.patient.findUnique({ where: { id: patients[1].id } });
  assert.ok(storedPatient.archivedAt);
  assert.ok(await prisma.appointment.findUnique({ where: { id: appointment.body.id } }));
});

test('governance endpoints enforce admin and patient relationship boundaries', async () => {
  const unauthenticatedAudit = await fetch(`${baseUrl}/api/audit-events`);
  assert.equal(unauthenticatedAudit.status, 401);

  await prisma.user.create({
    data: {
      email: 'governance.receptionist@example.test',
      displayName: 'Governance Receptionist',
      passwordHash: hashPassword('governance-receptionist-123'),
      role: 'receptionist',
    },
  });
  const receptionistCookie = await loginAs(
    'governance.receptionist@example.test',
    'governance-receptionist-123'
  );
  const receptionistAudit = await requestWithSession(receptionistCookie, '/api/audit-events');
  assert.equal(receptionistAudit.response.status, 403);

  const consent = await request(`/api/patients/${patients[0].id}/consents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'Clinical care', version: '2026-01' }),
  });
  assert.equal(consent.response.status, 201);

  const invalidDocument = await request(`/api/patients/${patients[0].id}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'record.pdf', mimeType: 'application/pdf', sizeBytes: 26 * 1024 * 1024 }),
  });
  assert.equal(invalidDocument.response.status, 400);

  const document = await request(`/api/patients/${patients[0].id}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'record.pdf', mimeType: 'application/pdf', sizeBytes: 2048 }),
  });
  assert.equal(document.response.status, 201);
  assert.equal(document.body.storageKey, undefined);

  const exportResult = await request(`/api/patients/${patients[0].id}/export`, {
    headers: { 'X-Request-Id': 'governance-export-1' },
  });
  assert.equal(exportResult.response.status, 200);
  assert.equal(exportResult.body.patient.id, patients[0].id);
  assert.equal(exportResult.body.patient.passwordHash, undefined);
  assert.equal(exportResult.body.patient.sessions, undefined);

  const requestResult = await request('/api/data-subject-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId: patients[0].id, requestType: 'access' }),
  });
  assert.equal(requestResult.response.status, 201);
  const requestUpdate = await request(`/api/data-subject-requests/${requestResult.body.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  assert.equal(requestUpdate.response.status, 200);

  const retentionPolicies = await request('/api/retention/policies');
  assert.equal(retentionPolicies.response.status, 200);
  assert.ok(retentionPolicies.body.every((policy) => policy.isActive === false && policy.durationDays === null));
  const unconfirmedRetention = await request('/api/retention/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(unconfirmedRetention.response.status, 400);

  const events = await request(`/api/audit-events?patientId=${patients[0].id}&limit=100`);
  assert.equal(events.response.status, 200);
  assert.ok(events.body.events.some((event) => event.action === 'export' && event.patientId === patients[0].id));
  assert.ok(events.body.events.some((event) => event.action === 'export' && event.requestId === 'governance-export-1'));
  assert.ok(events.body.events.every((event) => !event.metadataJson));
  const exportEvents = events.body.events.filter((event) => event.action === 'export');
  let exportEvent;
  let eventDetail;
  for (const event of exportEvents) {
    const detail = await request(`/api/audit-events/${event.id}`);
    if (detail.body?.metadataJson?.includes('sections')) {
      exportEvent = event;
      eventDetail = detail;
      break;
    }
  }
  assert.ok(exportEvent);
  assert.equal(eventDetail.response.status, 200);
  assert.match(eventDetail.body.metadataJson, /sections/);
  await assert.rejects(
    prisma.auditEvent.update({ where: { id: exportEvent.id }, data: { result: 'tampered' } })
  );
  await assert.rejects(
    prisma.auditEvent.delete({ where: { id: exportEvent.id } })
  );

  const dentist = await prisma.user.create({
    data: {
      email: 'governance.dentist@example.test',
      displayName: 'Governance Dentist',
      passwordHash: hashPassword('governance-dentist-123'),
      role: 'dentist',
    },
  });
  await prisma.doctor.update({ where: { id: doctor.id }, data: { userId: dentist.id } });
  const dentistCookie = await loginAs('governance.dentist@example.test', 'governance-dentist-123');
  const unrelatedConsent = await requestWithSession(
    dentistCookie,
    `/api/patients/${patients[1].id}/consents`
  );
  assert.equal(unrelatedConsent.response.status, 404);
  const unrelatedExport = await requestWithSession(
    dentistCookie,
    `/api/patients/${patients[1].id}/export`
  );
  assert.equal(unrelatedExport.response.status, 403);
});

test('returns a role-scoped operational work queue', async () => {
  const queueResult = await request('/api/work-queue');

  assert.equal(queueResult.response.status, 200);
  assert.equal(queueResult.body.role, 'admin');
  assert.ok(Array.isArray(queueResult.body.items));
  assert.ok(queueResult.body.counts);
  assert.ok(queueResult.body.items.every((item) => item.id && item.type && item.priority && item.action?.path));
});
