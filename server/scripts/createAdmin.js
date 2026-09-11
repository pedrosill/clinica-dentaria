const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const prisma = require('../db');
const { createUser } = require('../src/services/authService');

async function readSecret(promptText) {
  if (!input.isTTY || !output.isTTY) {
    const prompt = readline.createInterface({ input, output });
    const value = await prompt.question(promptText);
    prompt.close();
    return value;
  }

  output.write(promptText);
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    let password = '';

    function cleanup() {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
    }

    function onData(chunk) {
      const inputText = String(chunk);

      for (const character of inputText) {
        if (character === '\u0003') {
          cleanup();
          output.write('\n');
          reject(new Error('Password entry cancelled'));
          return;
        }

        if (character === '\r' || character === '\n') {
          cleanup();
          output.write('\n');
          resolve(password);
          return;
        }

        if (character === '\u0008' || character === '\u007f') {
          if (password) {
            password = password.slice(0, -1);
            output.write('\b \b');
          }
          continue;
        }

        password += character;
        output.write('*');
      }
    }

    input.on('data', onData);
  });
}

async function main() {
  const prompt = readline.createInterface({ input, output });
  const email = await prompt.question('Admin email: ');
  const displayName = await prompt.question('Display name: ');
  prompt.close();
  const password = await readSecret('Password (minimum 12 characters): ');

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
