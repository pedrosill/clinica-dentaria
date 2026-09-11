const app = require('./app');
const { PORT } = require('./config/env');
const { runSeed } = require('./startup/seed');
const { backfillPatientIdentityFields } = require('./startup/backfill');

async function startServer() {
  try {
    await runSeed();
    await backfillPatientIdentityFields();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();