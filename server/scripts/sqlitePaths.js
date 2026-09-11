const path = require('node:path');

function resolveSqlitePath(databaseUrl, baseDirectory = path.resolve(__dirname, '../prisma')) {
  const value = String(databaseUrl || '');

  if (!value.startsWith('file:')) {
    throw new Error('DATABASE_URL must use the SQLite file: URL format');
  }

  const rawPath = value.slice('file:'.length).split('?')[0];
  if (!rawPath) throw new Error('DATABASE_URL does not contain a SQLite path');

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    throw new Error('DATABASE_URL contains an invalid encoded SQLite path');
  }

  return path.isAbsolute(decodedPath)
    ? path.normalize(decodedPath)
    : path.resolve(baseDirectory, decodedPath);
}

module.exports = {
  resolveSqlitePath,
};
