const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const { resolveSqlitePath } = require('./sqlitePaths');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BACKUP_MAGIC = Buffer.from('DENTALPRO_SQLITE_BACKUP_V1\n');
const BACKUP_FILE_PATTERN = /^dentalpro-\d{8}T\d{9}Z-[a-f0-9]+\.db(?:\.enc)?$/;
const serverRoot = path.resolve(__dirname, '..');

function resolveServerPath(value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(serverRoot, value);
}

function getRequiredPositiveInteger(value, name, defaultValue) {
  const parsed = value === undefined ? defaultValue : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function getEncryptionKey(env = process.env) {
  const key = env.BACKUP_ENCRYPTION_KEY ||
    (env.BACKUP_ENCRYPTION_KEY_FILE
      ? fs.readFileSync(resolveServerPath(env.BACKUP_ENCRYPTION_KEY_FILE), 'utf8').trim()
      : '');

  if (key) return key;

  if (env.NODE_ENV === 'production' || env.BACKUP_ENCRYPTION_REQUIRED === 'true') {
    throw new Error('BACKUP_ENCRYPTION_KEY or BACKUP_ENCRYPTION_KEY_FILE is required');
  }

  return null;
}

function encryptBackup(buffer, key) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const encryptionKey = crypto.scryptSync(String(key), salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const header = Buffer.from(JSON.stringify({
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
  }) + '\n');

  return Buffer.concat([BACKUP_MAGIC, header, ciphertext]);
}

function verifySqliteFile(filename) {
  const database = new Database(filename, { readonly: true, fileMustExist: true });

  try {
    const integrity = database.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${integrity}`);
    }

    database.pragma('foreign_keys = ON');
    const foreignKeyErrors = database.pragma('foreign_key_check');
    if (foreignKeyErrors.length > 0) {
      throw new Error(`SQLite foreign-key check failed with ${foreignKeyErrors.length} violation(s)`);
    }
  } finally {
    database.close();
  }
}

async function applyRetention(backupDirectory, retentionCount) {
  const entries = (await fs.promises.readdir(backupDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && BACKUP_FILE_PATTERN.test(entry.name))
    .sort((left, right) => right.name.localeCompare(left.name));

  const removed = [];
  for (const entry of entries.slice(retentionCount)) {
    await fs.promises.rm(path.join(backupDirectory, entry.name));
    removed.push(entry.name);
  }

  return removed;
}

async function createBackup(env = process.env) {
  const sourcePath = resolveSqlitePath(env.DATABASE_URL);
  const backupDirectory = resolveServerPath(env.BACKUP_DIR || 'backups');
  const retentionCount = getRequiredPositiveInteger(
    env.BACKUP_RETENTION_COUNT,
    'BACKUP_RETENTION_COUNT',
    7
  );
  const encryptionKey = getEncryptionKey(env);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z');
  const extension = encryptionKey ? '.db.enc' : '.db';
  const filename = `dentalpro-${timestamp}-${crypto.randomBytes(4).toString('hex')}${extension}`;
  const outputPath = path.join(backupDirectory, filename);
  const temporaryPath = `${outputPath}.tmp`;

  await fs.promises.mkdir(backupDirectory, { recursive: true });
  await fs.promises.chmod(backupDirectory, 0o700);

  try {
    const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
    try {
      await source.backup(temporaryPath);
    } finally {
      source.close();
    }

    verifySqliteFile(temporaryPath);
    const sqliteBytes = await fs.promises.readFile(temporaryPath);
    const outputBytes = encryptionKey ? encryptBackup(sqliteBytes, encryptionKey) : sqliteBytes;
    await fs.promises.writeFile(outputPath, outputBytes, { mode: 0o600 });
    await fs.promises.chmod(outputPath, 0o600);
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }

  const removed = await applyRetention(backupDirectory, retentionCount);
  return { outputPath, encrypted: Boolean(encryptionKey), removed };
}

if (require.main === module) {
  createBackup()
    .then(({ outputPath, encrypted, removed }) => {
      console.log(`SQLite backup created: ${outputPath}`);
      console.log(`Encryption: ${encrypted ? 'enabled' : 'disabled'}`);
      if (removed.length > 0) console.log(`Retention removed: ${removed.join(', ')}`);
    })
    .catch((error) => {
      console.error(`Backup failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  BACKUP_MAGIC,
  applyRetention,
  createBackup,
  encryptBackup,
  getEncryptionKey,
  verifySqliteFile,
};
