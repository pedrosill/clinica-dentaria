const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

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
  await fs.promises.access(status.outputPath, fs.constants.R_OK);
  if (status.secondaryPath) await fs.promises.access(status.secondaryPath, fs.constants.R_OK);
  return { ...status, ageHours: ageMs / 3600000 };
}

if (require.main === module) {
  verifyBackup()
    .then((status) => console.log(`Backup verification passed (${status.ageHours.toFixed(2)} hours old)`))
    .catch((error) => { console.error(`Backup verification failed: ${error.message}`); process.exitCode = 1; });
}

module.exports = { verifyBackup };
