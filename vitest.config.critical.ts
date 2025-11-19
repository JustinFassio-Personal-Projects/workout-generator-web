import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      '**/__tests__/pages/**/*.{test,spec}.{ts,tsx}',
      '**/__tests__/features/blog/**/*.{test,spec}.{ts,tsx}',
      '**/__tests__/critical/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'out', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
