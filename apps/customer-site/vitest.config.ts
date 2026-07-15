import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the current customer-site unit tests.
 * Tests target pure logic (reducer, persistence, guards) so a jsdom environment
 * is used to provide a sessionStorage implementation without extra deps.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    // Deterministic execution: a single forked worker with no file-level
    // parallelism. This keeps `npm test` stable across environments (avoids
    // worker/tinypool flakiness) at a small cost to speed.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
  },
});
