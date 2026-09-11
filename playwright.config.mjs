import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node server/src/test/startBrowserServer.js',
      url: 'http://127.0.0.1:5100/',
      env: {
        CLIENT_ORIGIN: 'http://127.0.0.1:4173',
        PORT: '5100',
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'npm run dev --prefix client -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173/',
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:5100',
      },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
