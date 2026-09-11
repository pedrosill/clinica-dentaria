const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const prisma = require('../db');
const { createUser } = require('../src/services/authService');

async function main() {
  const prompt = readline.createInterface({ input, output });
  const email = await prompt.question('Admin email: ');
  const displayName = await prompt.question('Display name: ');
  const password = await prompt.question('Password (minimum 12 characters): ');
  prompt.close();

  const user = await createUser({
    email,
    displayName,
    password,
    role: 'admin',
  });

  console.log(`Created administrator ${user.email}`);
}

main()
  .catch((error) => {
    console.error('Failed to create administrator:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
