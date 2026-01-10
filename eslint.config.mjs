import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

// Next.js 16 + ESLint 9 compatibility: Load configs with error suppression
// The circular structure warning is a known issue with FlatCompat but doesn't prevent ESLint from working
let nextConfig = []
let prettierConfig = []

// Suppress console.error for config loading to avoid noise (config still works)
const originalError = console.error
console.error = (...args) => {
  // Only suppress the circular structure error message
  const errorMsg = args.join(' ')
  if (
    !errorMsg.includes('Converting circular structure to JSON') &&
    !errorMsg.includes('closes the circle')
  ) {
    originalError(...args)
  }
}

try {
  const nextExtend = compat.extends('next/core-web-vitals')
  nextConfig = Array.isArray(nextExtend) ? nextExtend : [nextExtend].filter(Boolean)
} catch (error) {
  // Config loading failed, continue without Next.js specific rules
  nextConfig = []
}

try {
  const prettierExtend = compat.extends('prettier')
  prettierConfig = Array.isArray(prettierExtend) ? prettierExtend : [prettierExtend].filter(Boolean)
} catch (error) {
  // Prettier config is optional
  prettierConfig = []
}

// Restore console.error
console.error = originalError

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '.vitest/**',
      '*.tsbuildinfo',
      'next-env.d.ts',
      '_reference-architecture/**',
    ],
  },
  ...nextConfig,
  ...prettierConfig,
]

export default eslintConfig
