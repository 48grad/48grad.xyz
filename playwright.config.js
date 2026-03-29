// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:8080',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.TEST_URL ? undefined : {
    command: 'npx serve site -p 8080 -s',
    url: 'http://localhost:8080',
    reuseExistingServer: false,
    timeout: 15000,
  },
});
