import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './')
        }
    },
    test: {
        // Test environment settings
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup/vitest.setup.js'],
        include: ['tests/**/*.test.js'],
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'tests/**',
                '**/*.d.ts',
                '**/*.test.js',
                '**/*.spec.js'
            ]
        },

        // Timeouts
        testTimeout: 10000,
        hookTimeout: 10000,

        // Thread management for stability
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true // Run tests in a single thread to avoid mock conflicts
            }
        }
    }
});
