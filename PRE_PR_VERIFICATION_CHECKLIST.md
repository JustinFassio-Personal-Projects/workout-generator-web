# Pre-PR Verification Checklist for AI Agents

**Purpose**: This checklist is designed for AI agents to run comprehensive diagnostics before code changes are committed, ensuring the automated Pre-PR Verification System has the best chance of success.

**Usage**: Run through this checklist systematically before suggesting any code changes or before the user commits code.

---

## 🏗️ **Hybrid Architecture**

This project uses a hybrid **Astro + Next.js** architecture:

- **Astro** (`astro-site/`): Public marketing pages, blog, static content, API routes (leads, blog list)
- **Next.js** (root): Admin dashboard, complex interactive features, admin API routes
- **Vercel Rewrites**: Routes `/admin/*` and `/api/admin/*` to the Next.js deployment

**Run verification for BOTH projects before pushing** when changes touch either codebase.

---

## 🚨 **MANDATORY PRE-PUSH CHECKLIST** ⚠️ **RUN BEFORE EVERY PUSH**

**Before pushing ANY code, you MUST run these commands in order and verify ALL pass:**

```bash
# 1. Format all files and verify
npm run format
npm run format:check  # MUST show "All matched files use Prettier code style!"

# 2. Lint and type check
npm run lint  # MUST show "✔ No ESLint warnings or errors"
npm run type-check  # MUST complete without errors

# 3. Run all tests
npm run test:run  # ALL tests must pass

# 4. Verify test coverage (CRITICAL - MUST be ≥ 80%)
npm run test:coverage  # MUST NOT show "ERROR: Coverage for functions"
# Verify function coverage is ≥ 80% in output

# 5. Security checks
npm audit --audit-level=moderate  # Review moderate+ vulnerabilities
grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"
# MUST return empty or only show safe patterns (process.env / import.meta.env references)

# 6. Build verification (both projects)
npm run build  # Next.js MUST succeed
cd astro-site && npm run build  # Astro MUST succeed (if astro-site exists)

# 7. Check for React act() warnings in test output
# Review test output - MUST NOT have "not wrapped in act(...)" warnings

# 8. Full verification (optional but recommended)
npm run verify  # Runs Next.js checks
cd astro-site && npm run build  # Astro build (when astro-site exists)
```

**⚠️ CRITICAL**: If ANY of these checks fail, DO NOT push. Fix the issue first!

**Common CI Failures to Prevent:**

1. ❌ Prettier formatting errors → Run `npm run format` and `npm run format:check`
2. ❌ Test coverage below 80% → Add tests to reach ≥ 80% function coverage
3. ❌ Secrets in code → Remove hardcoded secrets, use `process.env` only
4. ❌ React act() warnings → Fix async test patterns using `waitFor()`
5. ❌ Security vulnerabilities → Review `npm audit` output
6. ❌ Build failures → Fix TypeScript/linting errors before pushing

---

## 🔍 **Pre-Change Diagnostics**

### **1. Project Health Assessment** ⚠️ **MANDATORY BEFORE ANY CHANGES**

- [ ] **Check current test status**: `npm run test:run`
  - ⚠️ **CRITICAL**: All tests must pass before making changes
- [ ] **Run critical path tests**: `npm run test:critical`
  - ⚠️ **CRITICAL**: Critical path tests must pass
- [ ] **Verify linting status**: `npm run lint`
  - ⚠️ **CRITICAL**: Must show "✔ No ESLint warnings or errors"
- [ ] **Check formatting**: `npm run format:check`
  - ⚠️ **CRITICAL**: Must show "All matched files use Prettier code style!"
  - If not, run `npm run format` and verify again
- [ ] **TypeScript compilation**: `npm run type-check`
  - ⚠️ **CRITICAL**: Must complete without errors
- [ ] **Build verification**: `npm run build`
  - ⚠️ **CRITICAL**: Production build must succeed
- [ ] **Security audit**: `npm audit --audit-level=moderate`
  - ⚠️ **CRITICAL**: Review moderate+ vulnerabilities - document or fix before pushing
- [ ] **Security scan for secrets**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" src/ app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"`
  - ⚠️ **CRITICAL**: Must return empty or only show safe patterns (process.env / import.meta.env references)
  - No hardcoded secrets allowed - only environment variable references
- [ ] **Environment variable exposure check**: Verify no service keys in client-accessible code
  - ⚠️ **CRITICAL**: Next.js: only `NEXT_PUBLIC_*` in client code. Astro: only `PUBLIC_*` in client; server-only vars in `.astro` frontmatter and `pages/api/*.ts`

### **2. Code Quality Baseline**

- [ ] **Test coverage report**: `npm run test:coverage`
- [ ] **Verify coverage thresholds**: All metrics (functions, statements, branches, lines) ≥ 80%
- [ ] **Identify uncovered files/functions**: Focus on function coverage if below threshold
  - ⚠️ **CRITICAL**: Function coverage must be ≥ 80% or CI will fail
- [ ] **Check for existing linting errors**
- [ ] **Review TypeScript strict mode compliance**
- [ ] **Verify Prettier formatting consistency**: `npm run format:check`
  - ⚠️ **CRITICAL**: Formatting check must pass or CI will fail

---

## 🛠️ **Change Implementation Guidelines**

### **3. Code Structure Standards**

- [ ] **File organization**: Follow existing patterns:
  - **Next.js**: `app/`, `components/`, `features/` structure
  - **Astro**: `astro-site/src/pages/` (pages + API routes), `astro-site/src/components/`, `astro-site/src/layouts/`
- [ ] **Import organization**: Group imports (React, external, internal, relative)
- [ ] **Component structure**: Use functional components with TypeScript (React); `.astro` files for Astro components
- [ ] **Hook usage**: Follow React hooks rules and custom hook patterns (Next.js / React islands)
- [ ] **Type definitions**: Use proper TypeScript interfaces and types
- [ ] **Next.js App Router**: Follow App Router conventions for pages and layouts
- [ ] **Astro boundaries**: Server logic (Supabase, secrets) only in `.astro` frontmatter or `pages/api/*.ts`; React islands use `client:*` directives (`client:load`, `client:visible`, `client:idle`)

### **4. Testing Requirements**

- [ ] **Component tests**: Create tests for new React components
- [ ] **Hook tests**: Test custom hooks with `renderHook`
- [ ] **Utility tests**: Test pure functions and utilities
- [ ] **Integration tests**: Test component interactions
- [ ] **Critical path tests**: Ensure core blog and landing page functionality works
- [ ] **Mock external dependencies**: Next.js Router, AOS animations

### **5. Code Quality Standards**

- [ ] **ESLint compliance**: No unused variables, proper naming
- [ ] **TypeScript strict mode**: No `any` types, proper interfaces
- [ ] **Prettier formatting**: Consistent code style
- [ ] **Accessibility**: Proper ARIA labels, semantic HTML
- [ ] **Performance**: Avoid unnecessary re-renders, optimize imports
- [ ] **Security compliance**: No service keys in client code, proper environment variable usage
- [ ] **Secret management**: Verify only safe env vars in client-accessible files

---

## 🎯 **Critical Path Testing Requirements**

### **5.1 Blog Functionality Tests**

- [ ] **Blog (Astro)**: Blog listing (`/blog`) and post pages (`/blog/[slug]`) render; Supabase fallback works when DB unavailable
- [ ] **Blog (Next.js, if still used)**: `getAllPosts` / `getPostBySlug` return posts; `useBlogPosts` hook and blog components render
- [ ] **Blog Post Loading**: Test post data fetching (Astro: `getAllPublishedPosts`; Next.js: `getAllPosts`)
- [ ] **Blog Post Retrieval**: Test `getPostBySlug` / equivalent finds posts by slug
- [ ] **Blog Post Sorting**: Verify posts are sorted by date (newest first)
- [ ] **Blog Components**: Test blog listing cards and individual post content render

### **5.2 Landing Page Functionality Tests**

- [ ] **Home Page Rendering**: Test home page renders all sections
- [ ] **Hero Section**: Test hero renders with title, subtitle, and CTAs
- [ ] **Features Section**: Test all feature cards render correctly
- [ ] **Journey Section**: Test journey steps render in order
- [ ] **Testimonials Section**: Test testimonials carousel renders
- [ ] **Pricing Section**: Test pricing plans render correctly
- [ ] **Footer Section**: Test footer renders with links

### **5.3 Critical Path Commands**

```bash
# Run critical path tests (essential before any deployment)
npm run test:critical

# Run comprehensive pre-deployment validation
npm run verify

# Run critical path tests with verbose output for debugging
npm run test:critical -- --reporter=verbose
```

### **5.4 Production Deployment Validation**

- [ ] **Next.js Build**: Verify production build succeeds (`npm run build`)
- [ ] **Astro Build**: Verify Astro build succeeds (`cd astro-site && npm run build`) when astro-site exists
- [ ] **Type Safety**: All TypeScript types compile without errors (both projects)
- [ ] **Static/SSR**: Next.js static generation; Astro static pages + SSR routes (blog, API) build correctly
- [ ] **Component Rendering**: All components render without errors
- [ ] **Route Handling**: All routes are accessible (including `/admin/*` proxy to Next.js)

---

## 🧪 **Testing Implementation Checklist**

### **6. Test File Structure**

```typescript
// Required test file structure
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ComponentName } from '@/components/path/component'

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    // Test implementation
  })

  it('should handle user interactions', () => {
    // Test implementation
  })
})
```

### **7. Test Coverage Requirements**

- [ ] **Component rendering**: Test that components render without errors
- [ ] **Props handling**: Test component behavior with different props
- [ ] **User interactions**: Test clicks, form submissions, navigation
- [ ] **Error states**: Test error handling and loading states
- [ ] **Edge cases**: Test boundary conditions and error scenarios
- [ ] **Function coverage**: Ensure all functions are tested (80% threshold required)
  - ⚠️ **CRITICAL**: Function coverage MUST be ≥ 80% or CI will fail
  - Run `npm run test:coverage` and verify no "ERROR: Coverage for functions" message
- [ ] **Branch coverage**: Test all conditional paths (if/else, switch cases)
- [ ] **Statement coverage**: Ensure all code statements are executed
- [ ] **React act() compliance**: Ensure all async state updates in tests use proper patterns
  - Use `waitFor()` for async assertions instead of `act()` when possible
  - Verify test output has no "not wrapped in act(...)" warnings

### **8. Mocking Strategy**

```typescript
// Required mocks in src/test/setup.ts
- Next.js router (useRouter, usePathname, useSearchParams)
- AOS animations
- Window APIs (matchMedia, ResizeObserver, IntersectionObserver)
- Global fetch (to prevent network errors in CI)
  - ⚠️ **CRITICAL**: Tests must mock fetch to avoid "ECONNREFUSED" errors in CI
  - Use vi.fn() to mock fetch in test setup or individual test files
```

**⚠️ Network Request Mocking**:

- [ ] **Mock fetch globally**: Add fetch mock to `src/test/setup.ts` to prevent network errors
- [ ] **Mock API endpoints**: Ensure all API calls are mocked in tests
- [ ] **Avoid real network calls**: Tests should never make real HTTP requests (causes CI failures)

---

## 🔧 **Pre-Commit Verification**

### **9. Automated Checks** ⚠️ **MANDATORY BEFORE COMMIT**

- [ ] **Format code**: `npm run format` (auto-fix formatting issues)
  - ⚡ **AUTOMATIC**: Git pre-commit hook will auto-format files before commit (via husky)
  - Still recommended to run manually before final commit to catch issues early
- [ ] **Check formatting**: `npm run format:check` (verify all files are formatted)
  - ⚠️ **CRITICAL**: This check is included in `npm run verify` and CI will fail if formatting is incorrect
  - Must pass before committing - CI will reject PRs with formatting issues
  - **MUST RUN BEFORE EVERY COMMIT**: `npm run format:check` must show "All matched files use Prettier code style!"
- [ ] **Run full verification**: `npm run verify` (includes lint, type-check, format:check, tests, and build)
- [ ] **Run critical path tests**: `npm run test:critical`
- [ ] **Quick verification**: `npm run verify:quick`
- [ ] **Test coverage check**: Ensure all thresholds are met (`npm run test:coverage`)
  - [ ] **Function coverage ≥ 80%** (critical - CI will fail if below)
  - [ ] **Statement coverage ≥ 80%**
  - [ ] **Branch coverage ≥ 80%**
  - [ ] **Line coverage ≥ 80%**
  - ⚠️ **CRITICAL**: Function coverage must be ≥ 80% or CI will fail
  - **MUST VERIFY**: Check output for "ERROR: Coverage for functions" - must not appear
- [ ] **Build verification**: Confirm production build succeeds (`npm run build`)
- [ ] **Security audit**: `npm audit --audit-level=moderate`
  - ⚠️ **CRITICAL**: Review and address moderate+ vulnerabilities before pushing
  - If vulnerabilities exist, document why they're acceptable or fix them
- [ ] **Secret scanning**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"`
  - ⚠️ **CRITICAL**: No hardcoded secrets allowed - only `process.env.VAR_NAME`, `import.meta.env.VAR_NAME`, or `NEXT_PUBLIC_*` / `PUBLIC_*` patterns
  - Must return empty or only show safe patterns
- [ ] **React act() warnings check**: Run tests and verify no act() warnings in output
  - ⚠️ **CRITICAL**: All React state updates in tests must be properly handled
  - If warnings appear, wrap async operations in `waitFor()` or use proper async test patterns
  - Check test output for: "An update to ... inside a test was not wrapped in act(...)"

**⚠️ CRITICAL - MANDATORY CHECKS BEFORE EVERY PUSH**:

1. **Formatting**: `npm run format:check` MUST pass - CI will fail otherwise
2. **Test Coverage**: `npm run test:coverage` MUST show function coverage ≥ 80%
3. **Secrets**: No hardcoded API keys, passwords, or secrets in code
4. **Security**: `npm audit` should be reviewed for moderate+ vulnerabilities
5. **React Tests**: No act() warnings in test output
6. **Build**: `npm run build` (Next.js) and `cd astro-site && npm run build` (Astro, when present) MUST succeed

**Pre-Push Checklist** (run these in order):

```bash
# 1. Format all files
npm run format

# 2. Verify formatting
npm run format:check

# 3. Run linting
npm run lint

# 4. Type check
npm run type-check

# 5. Run all tests
npm run test:run

# 6. Check coverage (MUST be ≥ 80% for functions)
npm run test:coverage

# 7. Security audit
npm audit --audit-level=moderate

# 8. Secret scan (Next.js + Astro)
grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"

# 9. Build verification (both projects)
npm run build
cd astro-site && npm run build  # when astro-site exists

# 10. Full verification (Next.js + Astro build)
npm run verify
cd astro-site && npm run build  # when astro-site exists
```

### **10. Manual Quality Checks**

- [ ] **Code review**: Review for logical errors and edge cases
- [ ] **Performance review**: Check for memory leaks or performance issues
- [ ] **Accessibility review**: Ensure keyboard navigation and screen reader support
- [ ] **Browser compatibility**: Test in different browsers if applicable
- [ ] **Mobile responsiveness**: Verify mobile layout and interactions

---

## 📋 **File-Specific Guidelines**

### **11. Component Files**

**Next.js React components** (client-side when needed):

```typescript
// Required structure for React components
'use client' // If using client-side features

import { useState, useEffect } from 'react'
import { ComponentProps } from '@/types'
import { useCustomHook } from '@/hooks/use-custom-hook'

interface ComponentNameProps {
  // Define props interface
}

export const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Component implementation
  return (
    // JSX with proper accessibility attributes
  )
}
```

**Astro React islands** (client hydration directives; no server logic in component):

```astro
<!-- In .astro file: server logic in frontmatter; React only for interactivity -->
---
import { MyReactComponent } from '@/components/react/MyReactComponent'
---
<MyReactComponent client:visible prop1={data} />
<!-- client:load = immediate; client:visible = on scroll; client:idle = when idle -->
```

### **12. Hook Files**

```typescript
// Required structure for custom hooks
'use client'

import { useState, useEffect } from 'react'

export function useCustomHook(param: string) {
  // Hook implementation with proper error handling
  return {
    data,
    isLoading,
    error,
    mutate,
  }
}
```

### **13. Utility Files**

```typescript
// Required structure for utility functions
export function utilityFunction(input: string): string {
  // Pure function implementation
  return processedInput
}
```

### **14. Next.js Page Files**

```typescript
// Server Component (default)
import { Component } from '@/components/Component'

export default async function Page() {
  // Server-side data fetching
  return <Component />
}

// Client Component (if needed)
'use client'

import { useState } from 'react'

export default function Page() {
  // Client-side logic
  return <div>Content</div>
}
```

---

## 🚨 **Common CI Failures & How to Prevent Them**

### **14.1. Prettier Formatting Errors** ⚠️ **MOST COMMON FAILURE**

**Symptom**: CI shows "❌ Prettier formatting issues detected"

**Prevention**:

- [ ] **ALWAYS run before push**: `npm run format` then `npm run format:check`
- [ ] **Verify output**: Must show "All matched files use Prettier code style!"
- [ ] **If formatting fails**: Run `npm run format` again, then verify with `npm run format:check`

**Fix**: `npm run format` or `npx prettier --write .`

### **14.2. Test Coverage Below 80%** ⚠️ **CRITICAL FAILURE**

**Symptom**: CI shows "ERROR: Coverage for functions (XX.XX%) does not meet global threshold (80%)"

**Prevention**:

- [ ] **ALWAYS check before push**: `npm run test:coverage`
- [ ] **Verify function coverage**: Must be ≥ 80% (check the "% Funcs" column)
- [ ] **If below threshold**: Add tests for uncovered functions, especially in new files

**Fix**: Add tests for uncovered functions, focus on function coverage

### **14.3. Secrets in Code** ⚠️ **SECURITY FAILURE**

**Symptom**: CI shows "⚠️ Warning: Potential secrets found in code"

**Prevention**:

- [ ] **ALWAYS scan before push**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"`
- [ ] **Must return empty**: Only `process.env.VAR_NAME`, `import.meta.env.VAR_NAME`, or `NEXT_PUBLIC_*` / `PUBLIC_*` patterns allowed
- [ ] **No hardcoded values**: Never hardcode API keys, passwords, or secrets

**Fix**: Move hardcoded secrets to environment variables (Next.js: `process.env.VAR_NAME`; Astro: `import.meta.env.VAR_NAME` in server code only)

### **14.4. React act() Warnings** ⚠️ **TEST QUALITY ISSUE**

**Symptom**: Test output shows "An update to ... inside a test was not wrapped in act(...)"

**Prevention**:

- [ ] **Review test output**: Check for act() warnings after running tests
- [ ] **Use proper async patterns**: Use `waitFor()` for async assertions instead of `act()`
- [ ] **Fix async state updates**: Ensure all React state updates in tests are properly handled

**Fix**: Wrap async operations in `waitFor()` or use proper async test patterns

### **14.5. Security Vulnerabilities** ⚠️ **SECURITY ISSUE**

**Symptom**: CI shows vulnerabilities from `npm audit`

**Prevention**:

- [ ] **ALWAYS check before push**: `npm audit --audit-level=moderate`
- [ ] **Review vulnerabilities**: Document why moderate+ vulnerabilities are acceptable or fix them
- [ ] **Update dependencies**: Use `npm audit fix` when safe, or document why not updating

**Fix**: Run `npm audit fix` or document why vulnerabilities are acceptable

### **14.6. Build Failures** ⚠️ **CRITICAL FAILURE**

**Symptom**: CI build fails with TypeScript or compilation errors

**Prevention**:

- [ ] **ALWAYS build before push**: `npm run build`
- [ ] **Fix all errors**: Build must complete successfully
- [ ] **Check TypeScript**: `npm run type-check` must pass

**Fix**: Resolve TypeScript errors, linting issues, or build configuration problems

---

## 🚨 **Common Issues to Avoid**

### **15. Testing Pitfalls**

- [ ] **Avoid testing implementation details**: Focus on behavior, not internals
- [ ] **Don't test third-party libraries**: Mock them instead
- [ ] **Avoid flaky tests**: Use proper async handling and mocks
- [ ] **Don't skip error cases**: Test error scenarios thoroughly
- [ ] **Avoid testing multiple concerns**: One test per behavior

### **16. Code Quality Issues**

- [ ] **No unused imports**: Remove all unused imports
- [ ] **No console.log statements**: Remove debugging code
- [ ] **No hardcoded values**: Use constants or configuration
- [ ] **No magic numbers**: Use named constants
- [ ] **No commented-out code**: Remove or implement
- [ ] **No service keys in client code**: Verify no secrets exposed
- [ ] **No secrets in test files**: Ensure test utilities don't expose production secrets

### **17. TypeScript Issues**

- [ ] **No `any` types**: Use proper type definitions
- [ ] **No implicit any**: Explicitly type all parameters
- [ ] **No unused variables**: Remove or use all declared variables
- [ ] **Proper interface definitions**: Use interfaces for object shapes
- [ ] **Generic type usage**: Use generics where appropriate

### **18. Next.js and Astro Specific Issues**

**Next.js:**

- [ ] **Correct use of 'use client'**: Only use when necessary
- [ ] **Server Component patterns**: Use async/await for data fetching in Server Components
- [ ] **Route structure**: Follow App Router conventions
- [ ] **Metadata**: Include proper metadata for SEO
- [ ] **Image optimization**: Use Next.js Image component

**Astro:**

- [ ] **Client directives**: Use `client:load` / `client:visible` / `client:idle` for React islands; no server logic (DB, secrets) inside client components
- [ ] **SSR vs static**: Use `export const prerender = false` only for routes that need server-side data (blog, API)
- [ ] **Env vars**: Use `import.meta.env.PUBLIC_*` for client; server-only vars in API routes and `.astro` frontmatter

---

## 🔒 **Security Validation Requirements**

### **19. Secret Scanning**

- [ ] **Scan for service keys**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" src/ app/ components/ features/ astro-site/src/ --exclude-dir=node_modules`
- [ ] **Check environment variable usage**: Verify only safe env vars in client code (Next.js: `NEXT_PUBLIC_*`; Astro: `PUBLIC_*` via `import.meta.env`)
- [ ] **Validate test file security**: Ensure test utilities don't expose production secrets
- [ ] **Review Next.js configuration**: Confirm no secrets in `next.config.js`
- [ ] **Review Astro configuration**: Confirm no secrets in `astro.config.mjs`; env only via `import.meta.env`

### **20. Environment Variable Security**

- [ ] **Client-safe variables only**: Next.js: only `NEXT_PUBLIC_*` in client code. Astro: only `PUBLIC_*` (via `import.meta.env.PUBLIC_*`) in client-accessible code
- [ ] **Server-side isolation**: Server-only variables not exposed to client (Next.js API routes; Astro `.astro` frontmatter and `pages/api/*.ts`)
- [ ] **Test environment separation**: Test files use mock data, not production secrets
- [ ] **Build-time validation**: Ensure secrets not bundled in client builds (both projects)

### **21. Next.js and Astro Security**

- [ ] **No API keys in client**: Next.js: API keys only in API routes or Server Components. Astro: only in `pages/api/*.ts` or `.astro` frontmatter; never in React islands or client scripts
- [ ] **Proper authentication**: Use Next.js Auth if implementing auth (admin)
- [ ] **CSRF protection**: Implement CSRF protection for forms (both)
- [ ] **XSS prevention**: Sanitize user input (both)

---

## 🔄 **Post-Change Verification**

### **22. Final Checks** ⚠️ **MANDATORY BEFORE PUSH**

- [ ] **All tests pass**: `npm run test:run`
  - ⚠️ **CRITICAL**: Must show "Test Files X passed" with no failures
- [ ] **Critical path tests pass**: `npm run test:critical`
  - ⚠️ **CRITICAL**: All critical path tests must pass
- [ ] **No linting errors**: `npm run lint`
  - ⚠️ **CRITICAL**: Must show "✔ No ESLint warnings or errors"
- [ ] **Formatting is correct**: `npm run format:check`
  - ⚠️ **CRITICAL**: Must show "All matched files use Prettier code style!"
  - If not, run `npm run format` and verify again
- [ ] **TypeScript compiles**: `npm run type-check`
  - ⚠️ **CRITICAL**: Must complete without errors
- [ ] **Build succeeds**: `npm run build` (Next.js) and `cd astro-site && npm run build` (Astro, when present)
  - ⚠️ **CRITICAL**: Both production builds must complete successfully when both codebases exist
- [ ] **Coverage maintained**: `npm run test:coverage`
  - ⚠️ **CRITICAL**: Function coverage MUST be ≥ 80%
  - Verify no "ERROR: Coverage for functions" message appears
- [ ] **No secrets in code**: Secret scan returns empty or only safe patterns
  - ⚠️ **CRITICAL**: No hardcoded API keys, passwords, or secrets
- [ ] **Security audit reviewed**: `npm audit --audit-level=moderate`
  - ⚠️ **CRITICAL**: Review moderate+ vulnerabilities before pushing
- [ ] **No React act() warnings**: Test output has no act() warnings
  - ⚠️ **CRITICAL**: All async state updates properly handled in tests

### **23. Documentation Updates**

- [ ] **Update README**: If adding new features or changing setup
- [ ] **Update component documentation**: Add JSDoc comments
- [ ] **Update test documentation**: Document test patterns
- [ ] **Update API documentation**: If changing interfaces

---

## 📊 **Success Metrics**

### **24. Quality Indicators**

- [ ] **Test coverage thresholds met (80% minimum)**:
  - [ ] **Function coverage ≥ 80%**: All functions must be tested
  - [ ] **Statement coverage ≥ 80%**: All code statements executed
  - [ ] **Branch coverage ≥ 80%**: All conditional branches tested
  - [ ] **Line coverage ≥ 80%**: All lines of code executed
  - [ ] **Run coverage check**: `npm run test:coverage` to verify thresholds
- [ ] **Zero linting errors**: Clean codebase
- [ ] **Zero TypeScript errors**: Type safety
- [ ] **Build time < 60 seconds**: Performance
- [ ] **Test execution time < 30 seconds**: Fast feedback

### **25. Maintenance Indicators**

- [ ] **No security vulnerabilities**: Clean npm audit
- [ ] **Up-to-date dependencies**: Regular updates
- [ ] **Consistent code style**: Prettier compliance
- [ ] **Clear error messages**: User-friendly errors
- [ ] **Proper error handling**: Graceful failures

---

## 🆘 **Troubleshooting Guide**

### **26. Common Failures**

```bash
# Test failures
npm run test:run -- --reporter=verbose

# Critical path test failures
npm run test:critical -- --reporter=verbose

# Linting errors
npm run lint -- --fix

# TypeScript errors
npm run type-check

# Build failures
npm run build
```

### **27. Debugging Steps**

1. **Check error messages**: Read full error output
2. **Verify dependencies**: Ensure all packages are installed (`npm ci`)
3. **Check TypeScript version**: Ensure compatibility
4. **Review recent changes**: Identify what broke
5. **Check environment**: Verify Node.js version (18+) and OS compatibility
6. **Clear cache**: Delete `.next` and `node_modules`, reinstall

---

## 📝 **Checklist Usage Instructions**

### **For AI Agents:**

1. **Before making changes**: Run sections 1-2 (including critical path tests)
2. **During implementation**: Follow sections 3-8 (with critical path validation)
3. **Before committing**: Complete sections 9-21 (mandatory critical path tests)
4. **Before pushing**: ⚠️ **MANDATORY** - Run section 22 Final Checks in order:
   - `npm run format` → `npm run format:check` → `npm run lint` → `npm run type-check`
   - `npm run test:run` → `npm run test:coverage` → `npm audit --audit-level=moderate`
   - Secret scan (include astro-site/src/) → `npm run build` → `cd astro-site && npm run build` → `npm run verify`
5. **After changes**: Verify sections 22-25 (final critical path validation)
6. **If issues arise**: Use section 26-27 (including critical path debugging)

**⚠️ CRITICAL PRE-PUSH CHECKLIST** (run these commands in order before EVERY push):

```bash
# 1. Format and verify (Next.js)
npm run format && npm run format:check

# 2. Lint and type check
npm run lint && npm run type-check

# 3. Run all tests
npm run test:run

# 4. Verify coverage (MUST be ≥ 80%)
npm run test:coverage

# 5. Security checks
npm audit --audit-level=moderate
grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" app/ components/ features/ astro-site/src/ --exclude-dir=node_modules | grep -v "NEXT_PUBLIC_\|PUBLIC_\|process.env\|import.meta.env\|OPENAI_API_KEY.*process.env"

# 6. Build verification (both projects)
npm run build
cd astro-site && npm run build  # when astro-site exists

# 7. Full verification (Next.js + Astro build)
npm run verify
cd astro-site && npm run build  # when astro-site exists
```

**⚠️ CRITICAL**: Always run `npm run test:critical` before any production deployment!
**⚠️ CRITICAL**: If ANY check fails, DO NOT push - fix the issue first!

### **For Human Developers:**

1. **Use as a manual checklist** before pushing code
2. **Reference during code reviews**
3. **Use for onboarding new team members**
4. **Reference when troubleshooting issues**

---

## 🔗 **GitHub Actions Integration**

### **28. Automated Pre-PR Verification**

The project includes GitHub Actions workflows that automatically run:

- **Pre-PR Verification** (`.github/workflows/pre-pr-verification.yml`):
  - Runs on every pull request
  - Executes linting, type checking, tests, and build
  - Checks test coverage thresholds
  - Scans for secrets
  - Runs security audit

- **CI Pipeline** (`.github/workflows/ci.yml`):
  - Runs on push to main branch
  - Same checks as Pre-PR Verification
  - Ensures main branch always passes all checks

### **29. Required Status Checks**

Before merging PRs, ensure:

- [ ] **Pre-PR Verification workflow passes**
- [ ] **All status checks are green**
- [ ] **No failing tests**
- [ ] **Build succeeds**
- [ ] **Coverage thresholds met**

---

**Last Updated**: February 2026  
**Version**: 1.1  
**Status**: ✅ ACTIVE (Hybrid Astro + Next.js)

---

_This checklist ensures that all code changes meet the project's quality standards and that critical blog and landing page functionality is validated before reaching the automated Pre-PR Verification System._
