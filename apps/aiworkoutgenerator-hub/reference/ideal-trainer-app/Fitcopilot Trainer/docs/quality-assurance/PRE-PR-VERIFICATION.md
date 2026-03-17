# Pre-PR Verification Checklist

Use this checklist before creating a pull request to ensure code quality and prevent common issues.

## Pre-Commit Checks (Automatic)

These checks run automatically via Git hooks:

- [ ] Code passes linting (`npm run lint`)
- [ ] Code is properly formatted (`npm run format:check`)

## Pre-Push Checks (Automatic)

These checks run automatically before pushing:

- [ ] All verification steps pass (`npm run verify`)

## Manual Pre-PR Checklist

Before creating a PR, manually verify:

### Code Quality

- [ ] Code follows project style guidelines
- [ ] No console.log statements left in code (use proper logging)
- [ ] No commented-out code blocks
- [ ] No TODO comments without issue references
- [ ] All imports are used and organized

### Testing

- [ ] All existing tests pass (`npm run test:run`)
- [ ] New features have corresponding tests
- [ ] Critical path tests pass (`npm run test:critical`)
- [ ] Test coverage meets thresholds (check with `npm run test:coverage`)

### Type Safety

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No `any` types (use proper types or `unknown`)
- [ ] All function parameters and return types are typed

### Security

- [ ] No hardcoded secrets or API keys (`npm run security:scan`)
- [ ] Environment variables are used for sensitive data
- [ ] No sensitive data in commit history

### Build & Deployment

- [ ] Project builds successfully (`npm run build`)
- [ ] No build warnings or errors
- [ ] Pre-deployment tests pass (`npm run test:pre-deploy`)

### Documentation

- [ ] Code changes are documented (comments, JSDoc)
- [ ] README updated if needed
- [ ] Breaking changes documented

### Workout Generator Specific

- [ ] Workout generation logic tested
- [ ] Profile management operations validated
- [ ] Database operations use proper error handling
- [ ] API endpoints return expected structures

## Quick Verification Commands

Run these commands before creating a PR:

```bash
# Quick verification (lint + type check + tests + build)
npm run verify:quick

# Full verification (includes format check)
npm run verify

# Critical path tests only
npm run test:critical

# Pre-deployment check
npm run test:pre-deploy
```

## CI/CD Checks

After creating a PR, GitHub Actions will automatically run:

- [ ] Linting passes
- [ ] Formatting check passes
- [ ] Type checking passes
- [ ] All tests pass
- [ ] Coverage thresholds met
- [ ] Security audit passes
- [ ] Build succeeds

## Common Issues to Avoid

- **Type Errors**: Run `npm run type-check` before committing
- **Formatting Issues**: Run `npm run format` to auto-fix
- **Test Failures**: Ensure all tests pass locally before pushing
- **Build Failures**: Verify build works with `npm run build`
- **Secret Leaks**: Never commit API keys or secrets

## Getting Help

If verification fails:

1. Check the error message carefully
2. Review the troubleshooting guide in `docs/quality-assurance/PRE-PR-VERIFICATION.md`
3. Ask for help in your team's communication channel

## Success Criteria

Your PR is ready when:

- ✅ All automatic checks pass
- ✅ All manual checklist items are verified
- ✅ CI/CD pipeline passes
- ✅ Code review feedback addressed (if any)
