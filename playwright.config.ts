import { defineConfig, devices } from '@playwright/test';

/**
 * Replaces the Protractor project, whose Angular builder was removed in CLI 19.
 *
 * Two servers, because there are two shells to prove:
 *
 *  - :4200  the Angular demo. `npm start` builds the libraries first, so the
 *           tests exercise the same package path a real consumer would use.
 *  - :4400  the standalone web-component harness, with no Angular on the page.
 *           If that one passes, the Lit shell genuinely stands on the core alone.
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
  webServer: [
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      // The library builds plus a first dev-server compile are slow on
      // low-powered hardware (this was developed on a Raspberry Pi).
      timeout: 360_000,
    },
    {
      command: 'npm run build:lit-demo && npm run serve:lit-demo',
      url: 'http://localhost:4400/',
      reuseExistingServer: !process.env['CI'],
      timeout: 360_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
