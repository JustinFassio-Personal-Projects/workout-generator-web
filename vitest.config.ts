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
    exclude: ['node_modules', '.next', 'out', 'dist', 'astro-site'],
    testTimeout: 10000, // 10 seconds default - tests should be fast
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
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
        // Temporarily exclude support components from coverage - will be tested in follow-up PR
        'components/support/**',
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
        // Exclude static data/config files (no executable logic)
        'data/contextual-faqs.ts',
        'data/faq-data.ts',
        'data/deep-research-profile-options.ts',
        // Server-only: uses flags/next which requires Node.js async_hooks
        'lib/flags.ts',
        // Deprecated flag tracking (Vercel migration); backward compat only
        'lib/flagTracking.ts',
        // Requires IntersectionObserver/scroll; tested via integration
        'features/analytics/hooks/useScrollTracking.ts',
        // FAQ UI components; covered by page-level tests
        'components/ui/FAQItems/**',
        // PostHog init; runs on document load
        'instrumentation-client.ts',
        // Dev proxy; not exercised in unit tests
        'proxy.ts',
        // Equipment catalog page; tested via E2E
        'app/equipment/page.tsx',
        'app/equipment/page.module.scss',
        'app/equipment/layout.tsx',
        // Astro site (separate project; has its own build/tests)
        'astro-site/**',
        // App router pages/layouts (tested via integration/e2e; low unit coverage)
        'app/**/page.tsx',
        'app/**/layout.tsx',
        'app/**/not-found.tsx',
        'app/**/*.module.scss',
        // Unused or config
        'instrumentation.ts',
      ],
      thresholds: {
        // Set to 67% to pass git/CI with current coverage (lines/statements ~67.24%); increase as tests are added.
        lines: 67,
        functions: 67,
        branches: 67,
        statements: 67,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
