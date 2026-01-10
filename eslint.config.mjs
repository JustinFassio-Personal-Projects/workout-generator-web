import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Next.js 16 + ESLint 9 compatibility: extend configs separately to avoid circular structure
const nextConfig = compat.extends('next/core-web-vitals');
const prettierConfig = compat.extends('prettier');

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
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  ...(Array.isArray(prettierConfig) ? prettierConfig : [prettierConfig]),
];

export default eslintConfig;
