const seedModule = require('../../seed');

function resolveSeedDatabase() {
  if (typeof seedModule === 'function') {
    return seedModule;
  }

  if (seedModule && typeof seedModule.seedDatabase === 'function') {
    return seedModule.seedDatabase;
  }

  if (seedModule && typeof seedModule.default === 'function') {
    return seedModule.default;
  }

  return null;
}

async function runSeed() {
  const seedDatabase = resolveSeedDatabase();

  if (seedDatabase) {
    await seedDatabase();
    return;
  }

  console.warn('Seed function export not found, skipping seed step');
}

module.exports = {
  runSeed,
};