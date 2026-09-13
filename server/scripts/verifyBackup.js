const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const {
  BACKUP_MAGIC,
  decryptBackup,
  getEncryptionKey,
  verifySqliteFile,
} = require('./backup');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function resolveServerPath(value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(__dirname, '..', value);
}

async function verifyBackup(env = process.env) {
  const statusFile = resolveServerPath(env.BACKUP_STATUS_FILE || path.join(env.BACKUP_DIR || 'backups', 'backup-status.json'));
  const status = JSON.parse(await fs.promises.readFile(statusFile, 'utf8'));
  const ageMs = Date.now() - new Date(status.completedAt).getTime();
  const maxAgeHours = Number(env.BACKUP_MAX_AGE_HOURS || 26);
  if (!status.outputPath || !status.encrypted || !Number.isFinite(ageMs) || ageMs > maxAgeHours * 3600000) {
    throw new Error('Backup status is missing, unencrypted, invalid, or too old');
  }
  const backupPaths = [status.outputPath];
  if (status.secondaryPath) backupPaths.push(status.secondaryPath);

  const encryptionKey = getEncryptionKey(env);
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dentalpro-backup-verify-'));
  const verifiedContents = [];

  try {
    for (let index = 0; index < backupPaths.length; index += 1) {
      const backupPath = backupPaths[index];
      const backupBytes = await fs.promises.readFile(backupPath);
      const isEncrypted = backupBytes.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC);

      if (status.encrypted !== isEncrypted) {
        throw new Error(`Backup encryption state does not match status for ${backupPath}`);
      }

      const sqliteBytes = decryptBackup(backupBytes, isEncrypted ? encryptionKey : null);
      const temporaryPath = path.join(temporaryDirectory, `backup-${index}.db`);
      await fs.promises.writeFile(temporaryPath, sqliteBytes, { mode: 0o600 });
      verifySqliteFile(temporaryPath);
      verifiedContents.push(crypto.createHash('sha256').update(sqliteBytes).digest('hex'));
    }

    if (verifiedContents.length === 2 && verifiedContents[0] !== verifiedContents[1]) {
      throw new Error('Secondary backup content does not match the primary backup');
    }
  } finally {
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  }

  return {
    ...status,
    ageHours: ageMs / 3600000,
    verifiedCopies: backupPaths.length,
  };
}

if (require.main === module) {
  verifyBackup()
    .then((status) => console.log(`Backup verification passed (${status.ageHours.toFixed(2)} hours old)`))
    .catch((error) => { console.error(`Backup verification failed: ${error.message}`); process.exitCode = 1; });
}

module.exports = { verifyBackup };
