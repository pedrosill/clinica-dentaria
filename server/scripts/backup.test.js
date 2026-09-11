const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');
const { createBackup } = require('./backup');
const { restoreBackup } = require('./restore');

test('encrypted SQLite backup can be restored after integrity verification', async () => {
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dentalpro-backup-test-'));
  const sourcePath = path.join(temporaryDirectory, 'source.db');
  const restorePath = path.join(temporaryDirectory, 'restored.db');
  const backupDirectory = path.join(temporaryDirectory, 'backups');
  const environment = {
    NODE_ENV: 'development',
    DATABASE_URL: `file:${sourcePath}`,
    BACKUP_DIR: backupDirectory,
    BACKUP_RETENTION_COUNT: '2',
    BACKUP_ENCRYPTION_KEY: 'test-encryption-key',
  };

  try {
    const database = new Database(sourcePath);
    database.exec(
      'PRAGMA foreign_keys=ON; CREATE TABLE parent (id INTEGER PRIMARY KEY); ' +
      'CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id)); ' +
      'INSERT INTO parent VALUES (1); INSERT INTO child VALUES (1, 1);'
    );
    database.close();

    const result = await createBackup(environment);
    assert.equal(result.encrypted, true);
    assert.match(path.basename(result.outputPath), /\.db\.enc$/);

    await restoreBackup({
      source: result.outputPath,
      target: `file:${restorePath}`,
      replace: false,
      env: environment,
    });

    const restored = new Database(restorePath, { readonly: true });
    assert.equal(restored.prepare('SELECT count(*) AS count FROM child').get().count, 1);
    restored.close();

    const replacement = await restoreBackup({
      source: result.outputPath,
      target: `file:${restorePath}`,
      replace: true,
      env: environment,
    });
    assert.ok(replacement.safetyCopyPath);
    assert.equal(fs.existsSync(replacement.safetyCopyPath), true);
  } finally {
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  }
});
