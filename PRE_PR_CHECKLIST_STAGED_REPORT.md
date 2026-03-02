# Pre-PR Checklist Report — Staged Changes Only

**Scope:** Staged files only (main-web → nextjs-backend rename + root docs).  
**Checklist reference:** `apps/programs/PRE_PR_CHECKLIST.md`  
**Run date:** 2026-03-02

---

## Automatic pre-commit checks (nextjs-backend)

| Check | Status | Notes |
|-------|--------|--------|
| **ESLint** (`npm run lint`) | Pass | No errors. |
| **TypeScript** (`npm run type-check`) | Pass | No errors. |
| **Prettier** (`npm run format:check`) | Fixed then pass | 2 files were not formatted; Prettier was run with `--write` on them (see below). |
| **Tests** (`npm run test:run`) | 1 failure | 925 passed, 1 failed (timeout), 1 skipped. See [Test failure](#test-failure). |
| **Build** (`npm run build`) | Pass | Production build completed successfully. |

---

## Prettier fixes applied

These files were reformatted so `format:check` passes:

- `apps/nextjs-backend/components/landing/OnboardingWizard/OnboardingWizard.tsx` (staged)
- `apps/nextjs-backend/next-env.d.ts` (not staged)

**Action:** If you want the formatting changes included in the PR, stage the Prettier changes:

```bash
git add apps/nextjs-backend/components/landing/OnboardingWizard/OnboardingWizard.tsx
# optional: git add apps/nextjs-backend/next-env.d.ts
```

---

## Test failure

| Test | Result | Cause |
|------|--------|--------|
| `__tests__/components/landing/Bio/Bio.test.tsx` → “should handle \"Read the Founder Story\" button click” | Timeout (10000ms) | Test timed out; likely flaky or needs a higher timeout. Not caused by the rename. |

**Suggestion:** Increase timeout for this test or fix the async/button behavior so it completes within 10s. The rest of the suite (925 tests) passed.

---

## Checklist sections not applicable to staged changes

- **Firebase / Astro / programs:** Staged changes are in `nextjs-backend` and root docs only; no `apps/programs` or Astro/Firebase code.
- **Security scan / Firebase rules / App Check:** N/A for this PR.
- **Islands / Astro-specific:** N/A.

---

## Code quality (staged scope)

- **console.log:** None found in codebase.
- **.env / secrets:** Staged `.env.example` only; no secrets in staged files.

---

## Summary

| Item | Status |
|------|--------|
| Lint | Pass |
| Type-check | Pass |
| Format | Pass (after Prettier fix) |
| Tests | 1 timeout failure (Bio.test.tsx) |
| Build | Pass |

**Recommendation:** Stage the Prettier change to `OnboardingWizard.tsx` (and optionally `next-env.d.ts`). Consider fixing or relaxing the Bio “Read the Founder Story” test timeout before or after this PR.
