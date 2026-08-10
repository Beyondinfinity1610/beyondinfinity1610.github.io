import { defineConfig } from 'vitest/config';

// signal.spec.ts (Phase 2) is a vitest unit-test suite, named exactly as
// spec §7.2's tree requires. shots.spec.ts and spine.spec.ts are
// @playwright/test browser suites living in the same tests/ directory —
// vitest must not try to collect them. New Playwright suites added in
// later phases get added to this list.
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: [
      'tests/shots.spec.ts',
      'tests/spine.spec.ts',
      'tests/trace.spec.ts',
      'tests/instrument.spec.ts',
      'tests/webgl.spec.ts',
      'tests/topology.spec.ts',
      'tests/movement05.spec.ts',
      'tests/ceiling.spec.ts',
      'tests/a11y.spec.ts',
      'tests/audio.spec.ts',
      'node_modules/**',
    ],
  },
});
