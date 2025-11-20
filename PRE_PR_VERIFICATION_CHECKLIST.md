# Pre-PR Verification Checklist for AI Agents

**Purpose**: This checklist is designed for AI agents to run comprehensive diagnostics before code changes are committed, ensuring the automated Pre-PR Verification System has the best chance of success.

**Usage**: Run through this checklist systematically before suggesting any code changes or before the user commits code.

---

## 🔍 **Pre-Change Diagnostics**

### **1. Project Health Assessment**

- [ ] **Check current test status**: `npm run test:run`
- [ ] **Run critical path tests**: `npm run test:critical`
- [ ] **Verify linting status**: `npm run lint`
- [ ] **Check formatting**: `npm run format:check`
- [ ] **TypeScript compilation**: `npm run type-check`
- [ ] **Build verification**: `npm run build`
- [ ] **Security audit**: `npm audit`
- [ ] **Security scan for secrets**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" src/ app/ components/ features/ --exclude-dir=node_modules`
- [ ] **Environment variable exposure check**: Verify no service keys in client-accessible code

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

- [ ] **File organization**: Follow existing patterns in `app/`, `components/`, `features/` structure
- [ ] **Import organization**: Group imports (React, external, internal, relative)
- [ ] **Component structure**: Use functional components with TypeScript
- [ ] **Hook usage**: Follow React hooks rules and custom hook patterns
- [ ] **Type definitions**: Use proper TypeScript interfaces and types
- [ ] **Next.js App Router**: Follow App Router conventions for pages and layouts

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

- [ ] **Blog Post Loading**: Test `getAllPosts` returns posts correctly
- [ ] **Blog Post Retrieval**: Test `getPostBySlug` finds posts by slug
- [ ] **Blog Post Sorting**: Verify posts are sorted by date (newest first)
- [ ] **Blog Hook**: Test `useBlogPosts` hook loads and handles errors
- [ ] **Blog Components**: Test `BlogPostList` and `BlogPostCard` render correctly
- [ ] **Blog Pages**: Test blog listing and individual post pages render

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

- [ ] **Next.js Build**: Verify production build succeeds
- [ ] **Type Safety**: All TypeScript types compile without errors
- [ ] **Static Generation**: Blog pages generate correctly
- [ ] **Component Rendering**: All components render without errors
- [ ] **Route Handling**: All routes are accessible

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
- [ ] **Branch coverage**: Test all conditional paths (if/else, switch cases)
- [ ] **Statement coverage**: Ensure all code statements are executed

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
- [ ] **Run full verification**: `npm run verify` (includes lint, type-check, format:check, tests, and build)
- [ ] **Run critical path tests**: `npm run test:critical`
- [ ] **Quick verification**: `npm run verify:quick`
- [ ] **Test coverage check**: Ensure all thresholds are met (`npm run test:coverage`)
  - [ ] **Function coverage ≥ 80%** (critical - CI will fail if below)
  - [ ] **Statement coverage ≥ 80%**
  - [ ] **Branch coverage ≥ 80%**
  - [ ] **Line coverage ≥ 80%**
  - ⚠️ **CRITICAL**: Function coverage must be ≥ 80% or CI will fail
- [ ] **Build verification**: Confirm production build succeeds
- [ ] **Security scan**: Check for vulnerabilities

**⚠️ CRITICAL**:

- Git pre-commit hook automatically formats files before commit (prevents CI failures)
- Still run `npm run format` manually during development to catch issues early
- If pre-commit hook fails, fix issues and commit again
- **Format check is mandatory**: `npm run format:check` must pass - CI will reject PRs with formatting issues
- **Test coverage is mandatory**: Function coverage must be ≥ 80% - CI will reject PRs below threshold

### **10. Manual Quality Checks**

- [ ] **Code review**: Review for logical errors and edge cases
- [ ] **Performance review**: Check for memory leaks or performance issues
- [ ] **Accessibility review**: Ensure keyboard navigation and screen reader support
- [ ] **Browser compatibility**: Test in different browsers if applicable
- [ ] **Mobile responsiveness**: Verify mobile layout and interactions

---

## 📋 **File-Specific Guidelines**

### **11. Component Files**

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

### **18. Next.js Specific Issues**

- [ ] **Correct use of 'use client'**: Only use when necessary
- [ ] **Server Component patterns**: Use async/await for data fetching in Server Components
- [ ] **Route structure**: Follow App Router conventions
- [ ] **Metadata**: Include proper metadata for SEO
- [ ] **Image optimization**: Use Next.js Image component

---

## 🔒 **Security Validation Requirements**

### **19. Secret Scanning**

- [ ] **Scan for service keys**: `grep -r "SERVICE_ROLE_KEY\|SECRET_KEY\|API_KEY\|PASSWORD" src/ app/ components/ features/ --exclude-dir=node_modules`
- [ ] **Check environment variable usage**: Verify only safe env vars in client code
- [ ] **Validate test file security**: Ensure test utilities don't expose production secrets
- [ ] **Review Next.js configuration**: Confirm no secrets in `next.config.js`

### **20. Environment Variable Security**

- [ ] **Client-safe variables only**: Only `NEXT_PUBLIC_*` variables in client code
- [ ] **Server-side isolation**: Server-only variables not exposed to client
- [ ] **Test environment separation**: Test files use mock data, not production secrets
- [ ] **Build-time validation**: Ensure secrets not bundled in client builds

### **21. Next.js Security**

- [ ] **No API keys in client**: Verify API keys only in API routes or Server Components
- [ ] **Proper authentication**: Use Next.js Auth if implementing auth
- [ ] **CSRF protection**: Implement CSRF protection for forms
- [ ] **XSS prevention**: Sanitize user input

---

## 🔄 **Post-Change Verification**

### **22. Final Checks**

- [ ] **All tests pass**: `npm run test:run`
- [ ] **Critical path tests pass**: `npm run test:critical`
- [ ] **No linting errors**: `npm run lint`
- [ ] **Formatting is correct**: `npm run format:check`
- [ ] **TypeScript compiles**: `npm run type-check`
- [ ] **Build succeeds**: `npm run build`
- [ ] **Coverage maintained**: Check coverage report

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
4. **After changes**: Verify sections 22-25 (final critical path validation)
5. **If issues arise**: Use section 26-27 (including critical path debugging)

**⚠️ CRITICAL**: Always run `npm run test:critical` before any production deployment!

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

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: ✅ ACTIVE

---

_This checklist ensures that all code changes meet the project's quality standards and that critical blog and landing page functionality is validated before reaching the automated Pre-PR Verification System._
