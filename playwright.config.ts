import { defineConfig, devices } from '@playwright/test';

/**
 * Replaces the Protractor project, whose Angular builder was removed in CLI 19.
 *
 * `npm start` builds the library first and then serves the demo, so the smoke
 * test exercises the same package path a real consumer would use.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    // The library build plus a first dev-server compile is slow on low-powered
    // hardware (this was developed on a Raspberry Pi).
    timeout: 360_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
