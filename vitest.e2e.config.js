import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.test.js'],
    testTimeout: 30_000,
    hookTimeout: 300_000,
  },
});
