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

process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`;

const database = new Database(databasePath);
database.exec(fs.readFileSync(migrationPath, 'utf8'));
database.exec(fs.readFileSync(authMigrationPath, 'utf8'));
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
