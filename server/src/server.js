const app = require('./app');
const { HOST, LOCAL_ONLY, NODE_ENV, PORT, SEED_DEVELOPMENT_DATA } = require('./config/env');
const { runSeed } = require('./startup/seed');
const { backfillPatientIdentityFields } = require('./startup/backfill');
const { ensureDefaultAdmin } = require('./startup/defaultAdmin');
const { ensureClinicSettings } = require('./services/clinicSettingsService');

async function startServer() {
  try {
    if (NODE_ENV !== 'production' && SEED_DEVELOPMENT_DATA) {
      await runSeed();
      await backfillPatientIdentityFields();
    }

    await ensureDefaultAdmin();
    await ensureClinicSettings();

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}${LOCAL_ONLY ? ' (local-only)' : ''}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
