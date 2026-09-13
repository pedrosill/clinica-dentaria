const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');
const { createBackup } = require('./backup');
const { verifyBackup } = require('./verifyBackup');

async function createFixture({ secondary = false } = {}) {
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dentalpro-verify-test-'));
  const sourcePath = path.join(temporaryDirectory, 'source.db');
  const backupDirectory = path.join(temporaryDirectory, 'backups');
  const environment = {
    NODE_ENV: 'development',
    DATABASE_URL: `file:${sourcePath}`,
    BACKUP_DIR: backupDirectory,
    BACKUP_RETENTION_COUNT: '2',
    BACKUP_ENCRYPTION_KEY: 'test-encryption-key',
  };

  if (secondary) {
    environment.BACKUP_SECONDARY_DIR = path.join(temporaryDirectory, 'secondary');
  }

  const database = new Database(sourcePath);
  database.exec('CREATE TABLE patient (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO patient VALUES (1, \'Test patient\');');
  database.close();

  const result = await createBackup(environment);
  return { temporaryDirectory, environment, result };
}

test('verifyBackup decrypts and integrity-checks the primary and secondary copies', async () => {
  const fixture = await createFixture({ secondary: true });

  try {
    const result = await verifyBackup(fixture.environment);
    assert.equal(result.verifiedCopies, 2);
  } finally {
    await fs.promises.rm(fixture.temporaryDirectory, { recursive: true, force: true });
  }
});

test('verifyBackup rejects a corrupted encrypted backup', async () => {
  const fixture = await createFixture();

  try {
    const backupBytes = await fs.promises.readFile(fixture.result.outputPath);
    backupBytes[backupBytes.length - 1] ^= 0xff;
    await fs.promises.writeFile(fixture.result.outputPath, backupBytes);

    await assert.rejects(
      () => verifyBackup(fixture.environment),
      /Backup decryption failed|integrity check failed/
    );
  } finally {
    await fs.promises.rm(fixture.temporaryDirectory, { recursive: true, force: true });
  }
});

test('verifyBackup rejects an incorrect encryption key', async () => {
  const fixture = await createFixture();

  try {
    await assert.rejects(
      () => verifyBackup({ ...fixture.environment, BACKUP_ENCRYPTION_KEY: 'wrong-key' }),
      /Backup decryption failed|check the encryption key/
    );
  } finally {
    await fs.promises.rm(fixture.temporaryDirectory, { recursive: true, force: true });
  }
});
