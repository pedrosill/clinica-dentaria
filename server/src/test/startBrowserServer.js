const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const serverRoot = path.resolve(__dirname, '../..');
const databaseFilename = `dentalpro-browser-${Date.now()}-${process.pid}.db`;
const databasePath = path.join(serverRoot, 'prisma', databaseFilename);
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
const mfaMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260912110000_add_mfa_and_password_recovery',
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
const complianceMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260912120000_add_compliance_transcription_documents',
  'migration.sql'
);
const arrivedAtMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260912130000_add_appointment_arrived_at',
  'migration.sql'
);
const completionDetailsMigrationPath = path.join(
  serverRoot,
  'prisma',
  'migrations',
  '20260915090000_add_clinical_completion_details',
  'migration.sql'
);

process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`;

const database = new Database(databasePath);
database.exec(fs.readFileSync(migrationPath, 'utf8'));
database.exec(fs.readFileSync(authMigrationPath, 'utf8'));
database.exec(fs.readFileSync(mfaMigrationPath, 'utf8'));
database.exec(fs.readFileSync(clinicSettingsMigrationPath, 'utf8'));
database.exec(fs.readFileSync(clinicalRecordsMigrationPath, 'utf8'));
database.exec(fs.readFileSync(clinicLanguageMigrationPath, 'utf8'));
database.exec(fs.readFileSync(authorizationScopeMigrationPath, 'utf8'));
database.exec(fs.readFileSync(dataGovernanceMigrationPath, 'utf8'));
database.exec(fs.readFileSync(patientRecallsMigrationPath, 'utf8'));
database.exec(fs.readFileSync(waitlistMigrationPath, 'utf8'));
database.exec(fs.readFileSync(waitlistAppointmentsMigrationPath, 'utf8'));
database.exec(fs.readFileSync(complianceMigrationPath, 'utf8'));
database.exec(fs.readFileSync(arrivedAtMigrationPath, 'utf8'));
database.exec(fs.readFileSync(completionDetailsMigrationPath, 'utf8'));
database.close();

const app = require('../app');
const prisma = require('../../db');
const { hashPassword } = require('../utils/auth');
const port = Number(process.env.PORT) || 5100;

let server;
let isShuttingDown = false;

async function seedBrowserFixtures() {
  const fixtureSuffix = `${Date.now()}${process.pid}`;

  const doctor = await prisma.doctor.create({
    data: {
      name: 'Browser Test Doctor',
      email: `browser.doctor.${fixtureSuffix}@example.test`,
    },
  });

  await prisma.patient.create({
    data: {
      fullName: 'Browser Test Patient',
      phone: '910000099',
      email: `browser.patient.${fixtureSuffix}@example.test`,
      nif: String(900000000 + (Date.now() % 9999999)),
      nationality: 'Portuguese',
    },
  });

  await prisma.user.create({
    data: {
      email: 'browser.admin@example.test',
      displayName: 'Browser Test Admin',
      passwordHash: hashPassword('browser-password-123'),
      role: 'admin',
    },
  });

  return doctor;
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }

  await prisma.$disconnect();
  fs.rmSync(databasePath, { force: true });
  process.exit(0);
}

async function start() {
  await seedBrowserFixtures();

  server = app.listen(port, '127.0.0.1', () => {
    console.log(`Browser test API running on http://127.0.0.1:${port}`);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

start().catch(async (error) => {
  console.error('Failed to start browser test API:', error);
  await prisma.$disconnect();
  fs.rmSync(databasePath, { force: true });
  process.exit(1);
});
