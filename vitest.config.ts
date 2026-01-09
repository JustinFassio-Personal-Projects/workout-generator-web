import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'out', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        'dist/',
        '**/*.config.{ts,js}',
        '**/types/**',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/test/**',
        // Temporarily exclude admin files from coverage - will be tested in follow-up PR
        'app/admin/**',
        'app/api/admin/**',
        'components/admin/**',
        'lib/supabase/**',
        'lib/blog/**',
        'middleware.ts',
        'scripts/**',
        // Exclude reference architecture directory (not part of main codebase)
        '_reference-architecture/**',
        // Exclude re-export and type-only files (no logic to test)
        'features/blog/index.ts',
        'features/blog/types.ts',
        'vitest.config.critical.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
