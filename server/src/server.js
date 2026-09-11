const app = require('./app');
const { NODE_ENV, PORT } = require('./config/env');
const { runSeed } = require('./startup/seed');
const { backfillPatientIdentityFields } = require('./startup/backfill');
const { ensureDefaultAdmin } = require('./startup/defaultAdmin');

async function startServer() {
  try {
    if (NODE_ENV !== 'production') {
      await runSeed();
      await backfillPatientIdentityFields();
    }

    await ensureDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
