import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Note: React plugin removed due to ESM compatibility issues
  // Tests should still work without it for basic React component testing
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Mock Next.js modules for tests
      'next/navigation': path.resolve(__dirname, './src/test/mocks/next-navigation.ts'),
    },
  },
});
