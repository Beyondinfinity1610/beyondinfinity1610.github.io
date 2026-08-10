import { defineConfig, devices } from '@playwright/test';

// Screenshot harness — spec §7.5. "Every visual bug this site has ever
// had was invisible in code and obvious in an image." tests/shots.spec.ts
// walks every movement at every viewport and emits shots/index.html, a
// contact sheet that must be opened and looked at, not just passed.
export default defineConfig({
  testDir: 'tests',
  // signal.spec.ts and ceiling-field.spec.ts are vitest unit suites (npm
  // run test), not browser suites — Playwright must not try to collect
  // them (mirror of vitest.config.ts's own exclusion of shots.spec.ts /
  // spine.spec.ts in the other direction). Phase 9 found this list had
  // fallen out of sync with vitest.config.ts's: ceiling-field.spec.ts
  // (added in Phase 8) was missing here, which made every untargeted
  // `playwright test` run — i.e. `npm run shots`, and therefore `npm run
  // verify` — fail at collection time with "Vitest failed to access its
  // internal state" before a single test ran. Silent because any run
  // scoped to one file or project (`playwright test tests/foo.spec.ts`)
  // skips collecting this file entirely and never hits it.
  testIgnore: ['**/signal.spec.ts', '**/ceiling-field.spec.ts'],
  outputDir: 'shots/.artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'shots/report', open: 'never' }]],
  use: {
    baseURL: process.env.SHOTS_BASE ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: process.env.SHOTS_BASE
    ? undefined
    : {
        command: 'npm run preview -- --port 4173',
        port: 4173,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'wide',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'narrow',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'reduced',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
});
