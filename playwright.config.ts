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
  /*
   * A whole minute per test, and every ACTION bounded.
   *
   * The action timeout was Playwright's default of zero — unbounded — so a
   * click that could not land ate the entire test budget and the failure read
   * "Test timeout of 30000ms exceeded" without naming the locator. That is the
   * difference between a failure you can read and one you have to reproduce.
   * The per-test budget is the one number that had to grow: this is a
   * four-core Raspberry Pi, and a poll may not be given more time than the
   * test it lives in (one here asked for 40s inside a 30s test, which cannot
   * ever be spent).
   */
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:4200',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    /*
     * Kept locally too. A flake on the machine where it flakes used to produce
     * nothing at all to look at, because retries are off here and the trace
     * was armed on the retry that never came.
     */
    trace: process.env['CI'] ? 'on-first-retry' : 'retain-on-failure',
  },
  /*
   * Pinned rather than derived from the core count, so the suite means the
   * same thing on every machine — and two is what this one can actually run
   * without the tests measuring each other.
   */
  workers: 2,
  webServer: [
    {
      /*
       * `--watch false`: nothing may recompile this server mid-run. The other
       * server's command used to rebuild dist/flow-based-lit after this one was
       * already serving, and the watcher's incremental rebuild against the
       * half-written library failed with a spurious TS7006 — leaving the vite
       * error overlay over the page, where it swallowed every click until the
       * suite ran out of retries.
       */
      command: 'npm run build:e2e && npx ng serve --watch false',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      /*
       * The ONE build, and everything else waits on it.
       *
       * Both servers used to build for themselves, and Playwright starts them in
       * parallel — so two `ng build`s rewrote dist/flow-based-core at the same
       * time and whichever compiler read it mid-write failed with errors about
       * exports that plainly do exist. The static server below simply 404s until
       * this finishes, which is exactly the "not ready yet" Playwright already
       * waits for.
       *
       * The library builds plus a first dev-server compile are slow on
       * low-powered hardware (this was developed on a Raspberry Pi).
       */
      timeout: 360_000,
    },
    {
      /*
       * Serves, never builds. It DID build (the stale-harness trap: a shell
       * from the day before passing everything) — but that build ran in
       * PARALLEL with the other server's `build:e2e`, and two `ng build`s
       * writing dist/flow-based-lit at once corrupted whichever compile read
       * it mid-write. `build:e2e` ends with the lit-demo bundle, so when the
       * servers boot together the harness is fresh by construction. The trap
       * that remains is the documented one: with a REUSED :4200 server no
       * build runs at all — after a lit change, run build:lit-demo by hand.
       */
      command: 'node scripts/serve-static.mjs dist/lit-demo 4400',
      url: 'http://localhost:4400/',
      reuseExistingServer: !process.env['CI'],
      timeout: 360_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
