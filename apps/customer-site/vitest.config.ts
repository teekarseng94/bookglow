import { defineConfig } from 'vitest/config';

/**
 * Vitest config for customer-site unit tests.
 * Booking-v2 suite was removed; keep config ready for future pure-logic tests.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    passWithNoTests: true,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
  },
});
