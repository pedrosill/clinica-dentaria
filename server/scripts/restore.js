const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const { BACKUP_MAGIC, getEncryptionKey, verifySqliteFile } = require('./backup');
const { resolveSqlitePath } = require('./sqlitePaths');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function decryptBackup(buffer, key) {
  if (!buffer.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) return buffer;

  const headerStart = BACKUP_MAGIC.length;
  const headerEnd = buffer.indexOf(0x0a, headerStart);
  if (headerEnd === -1) throw new Error('Encrypted backup header is incomplete');

  let header;
  try {
    header = JSON.parse(buffer.subarray(headerStart, headerEnd).toString('utf8'));
  } catch {
    throw new Error('Encrypted backup header is invalid');
  }

  if (header.algorithm !== 'aes-256-gcm' || header.kdf !== 'scrypt') {
    throw new Error('Encrypted backup uses an unsupported format');
  }

  if (!key) throw new Error('BACKUP_ENCRYPTION_KEY or BACKUP_ENCRYPTION_KEY_FILE is required');

  const salt = Buffer.from(header.salt, 'base64url');
  const iv = Buffer.from(header.iv, 'base64url');
  const authTag = Buffer.from(header.authTag, 'base64url');
  const encryptionKey = crypto.scryptSync(String(key), salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([
      decipher.update(buffer.subarray(headerEnd + 1)),
      decipher.final(),
    ]);
  } catch {
    throw new Error('Backup decryption failed; check the encryption key');
  }
}

function parseArguments(args) {
  const source = args[0];
  const targetIndex = args.indexOf('--target');
  const target = targetIndex >= 0 ? args[targetIndex + 1] : process.env.RESTORE_DATABASE_URL;
  const replace = args.includes('--replace');

  if (!source || !target || targetIndex >= 0 && !target) {
    throw new Error('Usage: node scripts/restore.js BACKUP_FILE --target file:./restored.db [--replace]');
  }

  return { source, target, replace };
}

async function restoreBackup({ source, target, replace, env = process.env }) {
  const sourcePath = path.resolve(source);
  const targetPath = resolveSqlitePath(target);
  const targetExists = fs.existsSync(targetPath);

  if (targetExists && !replace) {
    throw new Error('Target database exists; pass --replace after stopping the server to restore it');
  }

  if (sourcePath === targetPath) {
    throw new Error('Backup file and target database must be different paths');
  }

  const backupBytes = await fs.promises.readFile(sourcePath);
  const restoredBytes = decryptBackup(
    backupBytes,
    backupBytes.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC) ? getEncryptionKey(env) : null
  );
  const temporaryPath = `${targetPath}.restore-${process.pid}.tmp`;
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(temporaryPath, restoredBytes, { mode: 0o600 });

  try {
    verifySqliteFile(temporaryPath);

    let safetyCopyPath = null;
    if (targetExists) {
      safetyCopyPath = `${targetPath}.pre-restore-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.(\d{3})Z$/, '$1Z')}.db`;
      await fs.promises.copyFile(targetPath, safetyCopyPath);
      await fs.promises.chmod(safetyCopyPath, 0o600);
      await fs.promises.rm(targetPath);
    }

    await fs.promises.rename(temporaryPath, targetPath);
    await fs.promises.chmod(targetPath, 0o600);
    return { targetPath, safetyCopyPath };
  } finally {
    await fs.promises.rm(temporaryPath, { force: true });
  }
}

if (require.main === module) {
  restoreBackup({ ...parseArguments(process.argv.slice(2)) })
    .then(({ targetPath, safetyCopyPath }) => {
      console.log(`Verified SQLite restore written to: ${targetPath}`);
      if (safetyCopyPath) console.log(`Previous database preserved at: ${safetyCopyPath}`);
    })
    .catch((error) => {
      console.error(`Restore failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  decryptBackup,
  parseArguments,
  restoreBackup,
};
