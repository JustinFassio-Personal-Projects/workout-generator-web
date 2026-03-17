# Pre-PR Verification Checklist

Use this checklist before creating a pull request to ensure code quality and prevent production issues.

## 🔄 Automatic Pre-Commit Checks

These run via Git hooks (configured in `.husky/`):

- [ ] ESLint passes (`npm run lint`) - via lint-staged
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Prettier formatting applied (`npm run format`) - via lint-staged

> **Note:** Next.js build (`next build`) runs automatically in CI/CD with proper environment variables, not in pre-commit hooks. The pre-commit hook only runs lint-staged (ESLint + Prettier) and type-check for faster feedback. You can manually run `npm run verify:quick` to test the build locally before pushing.

## 🔒 Firebase Security Checks (CRITICAL)

**Run these manually before every PR:**

- [ ] **Firestore Security Rules**: No permissive `allow read, write: if true;` rules
- [ ] **Environment Variables**: No hardcoded Firebase API keys in code (only in `.env.local`)
- [ ] **Firebase Config**: `firebase.json` doesn't expose sensitive data
- [ ] **Authentication**: No client-side admin operations
- [ ] **Storage Rules**: File uploads have size/type validation

**Security Scan Command:**

```bash
npm run security:scan
```

## 🧪 Testing Requirements

### Unit Tests

- [ ] All existing tests pass (`npm run test`)
- [ ] New features have corresponding tests
- [ ] Test coverage ≥80% for new code (`npm run test:coverage`)

### Integration Tests

- [ ] Firebase Emulator Suite tests pass (`npm run test:emulator`)
- [ ] Auth flows tested (signup, login, logout, password reset)
- [ ] Firestore CRUD operations validated
- [ ] Cloud Functions (if any) tested locally

### Critical Path Tests

```bash
npm run test:critical
```

- [ ] User can generate workouts
- [ ] User can save/delete workouts
- [ ] Profile updates persist correctly
- [ ] Authentication flow completes end-to-end

## 🎯 Next.js Specific Checks

- [ ] No client components importing server-only code
- [ ] `use client` directives only where necessary (interactive components)
- [ ] Server actions properly marked with `'use server'`
- [ ] No `useEffect` fetching (use Server Components or `useSWR`/`React Query`)
- [ ] Images use `next/image` component (not `<img>`)
- [ ] Fonts use `next/font` (no CDN links)
- [ ] No `any` types in TypeScript

## 🔥 Firebase Best Practices

### Firestore

- [ ] Queries use indexes (check Firebase Console)
- [ ] No N+1 query patterns (batch reads where possible)
- [ ] Security rules tested with `firebase emulators:start`
- [ ] Pagination implemented for lists (limit queries)
- [ ] Timestamps use `serverTimestamp()` not client time

### Authentication

- [ ] Auth state changes handled properly (loading states)
- [ ] Protected routes check `currentUser` server-side
- [ ] Token refresh handled (Firebase SDK auto-refreshes)
- [ ] Logout clears all user data from state

### Firebase Hosting

- [ ] Redirects/rewrites configured correctly in `firebase.json`
- [ ] Custom domain SSL configured (if applicable)
- [ ] Headers set for security (CSP, X-Frame-Options)

## 🚀 Build & Performance

- [ ] Production build succeeds (`npm run build`)
- [ ] No build errors or warnings
- [ ] Bundle size reasonable (<300KB main chunk)
- [ ] No unused dependencies (`npm run check-deps`)
- [ ] Images optimized (use WebP/AVIF)
- [ ] Lazy load off-screen components

**Lighthouse Scores (minimum):**

- [ ] Performance: ≥90
- [ ] Accessibility: ≥95
- [ ] Best Practices: ≥95
- [ ] SEO: ≥90

## 📝 Code Quality

- [ ] No `console.log` in production code (use proper logging)
- [ ] No commented-out code blocks
- [ ] TODOs reference issue numbers (`// TODO: #123`)
- [ ] Descriptive variable/function names (no `data`, `temp`, `x`)
- [ ] Error boundaries wrap page components
- [ ] Loading states for async operations

## 🔐 Environment & Secrets

- [ ] `.env.local` not committed (in `.gitignore`)
- [ ] All Firebase config values in environment variables
- [ ] `.env.example` updated with new variables
- [ ] GitHub Secrets configured for CI/CD

**Required Environment Variables:**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 📚 Documentation

- [ ] README updated if setup changes
- [ ] JSDoc comments for public functions
- [ ] Component props documented (TypeScript interfaces)
- [ ] Breaking changes noted in PR description
- [ ] Firebase schema changes documented

## 🎨 UI/UX Checks (shadcn/ui)

- [ ] shadcn components use proper variants
- [ ] Tailwind classes follow project conventions
- [ ] Dark mode (if enabled) tested
- [ ] Mobile responsive (test on Chrome DevTools)
- [ ] Keyboard navigation works (tab through forms)
- [ ] ARIA labels on interactive elements

## 🐛 Common Pitfalls to Avoid

- ❌ **Firestore**: Reading entire collections without `.limit()`
- ❌ **Auth**: Not handling auth state changes properly
- ❌ **Next.js**: Client components fetching data in `useEffect`
- ❌ **TypeScript**: Using `any` type (use `unknown` or proper types)
- ❌ **Performance**: Large images not optimized
- ❌ **Security**: Sensitive logic in client components

## 🚦 Quick Verification Commands

```bash
# Run all checks at once
npm run verify:all

# Quick check (no tests)
npm run verify:quick

# Pre-deployment check
npm run verify:deploy
```

## ✅ PR Creation Checklist

Before clicking "Create Pull Request":

1. [ ] Branch is up-to-date with `main`
2. [ ] All automatic checks passed
3. [ ] Manual checklist items verified
4. [ ] Screenshots added for UI changes
5. [ ] PR description follows template
6. [ ] Reviewers assigned

## 🆘 Getting Help

If verification fails:

1. **Check error message**: Most errors are self-explanatory
2. **Firebase Emulator Logs**: `firebase emulators:start` shows detailed errors
3. **Next.js Docs**: Search for error codes
4. **Team Slack**: Ask in #dev-help channel

---

**Status Indicators:**

- 🔴 **Critical**: Must fix before PR
- 🟡 **Important**: Should fix before merge
- 🟢 **Nice-to-have**: Can address in follow-up PR
