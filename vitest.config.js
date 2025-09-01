import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: [
      './tests/setup/vitest.setup.js'
    ],
    testTimeout: 10000, // 10 seconds default timeout
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Run tests in a single thread to avoid mock conflicts
      }
    },
    globalSetup: ['./tests/setup/global.setup.js']
  },
});
