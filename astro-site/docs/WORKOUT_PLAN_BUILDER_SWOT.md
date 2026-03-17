# SWOT: WorkoutPlanBuilder on astro-site

**Context:** WorkoutPlanBuilder is the primary onboarding flow on astro-site. The Hero CTA and `/onboard` route send users into WorkoutPlanBuilder; funnel events feed admin-dash-astro Auth & onboarding analytics.

**Scope:** `astro-site/src/components/react/WorkoutPlanBuilder/` and its entry points vs. `apps/programs/src/components/react/WorkoutPlanBuilder/` and programs’ `/onboard` page.

---

## Summary: Current State (post–roadmap)

1. **Hero CTA points to onboarding.**  
   In `Hero.astro`, the primary “Generate Workout” button links to `/onboard`, which renders WorkoutPlanBuilder. Users get goals/equipment context before signup.

2. **Route alignment with programs.**  
   - **Programs:** `/onboard` → **WorkoutPlanBuilder** (with AppWrapper).  
   - **Astro-site:** `/onboard` → **WorkoutPlanBuilder** (with `preselect` from URL).  
   WorkoutPlanBuilder is the canonical onboarding flow; OnboardingWizard is deprecated for this route.

3. **Analytics.**  
   astro-site sends page-view and funnel events to the same Supabase tables as admin-dash-astro. WorkoutPlanBuilder emits `onboarding_builder_started`, step completed, preview shown, and create-account-clicked; Auth & onboarding dashboard shows “Onboarding drop-off” from these events.

---

## SWOT Analysis

### Strengths

| Item | Detail |
|------|--------|
| **Component set present** | WorkoutPlanBuilder exists in astro-site with the same five files as programs: `WorkoutPlanBuilder.tsx`, `IntroScreen.tsx`, `StepOne.tsx`, `StepTwo.tsx`, `PlanPreview.tsx`. |
| **Logic and signup flow** | Steps 1 & 2, URL sync (`onboardingToSearchParams`, `parseOnboardingFromSearchParams`), validation, and “Create account” → `buildSignupUrl(formData)` → redirect to app signup with query params are implemented. |
| **Shared primitives** | Uses shared `@/types/onboarding`, `@/lib/buildSignupUrl`, `@/lib/urlOnboarding`, `@/data/onboarding-options`; supports preselect/query params. |
| **Dedicated page** | `/onboard` mounts `<WorkoutPlanBuilder client:load skipIntro preselect={preselect} />`; `/onboarding` also exists and can mount the builder. |

### Weaknesses

| Item | Detail |
|------|--------|
| **Hero bypasses onboarding** | *(Addressed)* Hero now links to `/onboard` (WorkoutPlanBuilder). |
| **/onboard ≠ WorkoutPlanBuilder on astro-site** | *(Addressed)* `/onboard` now renders WorkoutPlanBuilder with `preselect` support. |
| **WorkoutPlanBuilder under-exposed** | *(Addressed)* Primary CTAs and Hero point to `/onboard` (WorkoutPlanBuilder). |
| **Two parallel onboarding flows** | OnboardingWizard remains in codebase but is no longer used at `/onboard`; WorkoutPlanBuilder is the canonical flow. |
| **No AppWrapper on builder page** | Programs’ `/onboard` wraps WorkoutPlanBuilder in `AppWrapper` (nav, etc.). Astro-site `/onboarding` uses only BaseLayout + Footer; no programs-style app chrome. |

### Opportunities

| Item | Detail |
|------|--------|
| **Point Hero at onboarding** | Change Hero “Generate Workout” from `directAuthUrl` to `/onboard` or `/onboarding` to make the builder (or unified flow) the primary path. |
| **Unify route semantics with programs** | Option A: Make `/onboard` render WorkoutPlanBuilder (and optionally retire or redirect OnboardingWizard). Option B: Keep both but document clearly and drive primary CTAs to the chosen flow. |
| **Single canonical flow** | Choose one: either OnboardingWizard or WorkoutPlanBuilder as the canonical “build your plan” flow, then route all CTAs and Hero to it. |
| **Reuse builder from /onboard** | If keeping OnboardingWizard intro, have it hand off to WorkoutPlanBuilder steps (or the same step data shape) so one backend/signup flow is used. |

### Threats

| Item | Detail |
|------|--------|
| **Lost onboarding context** | Sending users to `app?signin=1` with no query params means the app does not receive goals, equipment, level, etc. from the website; first-run experience is weaker. |
| **Two UIs, two behaviors** | Maintaining OnboardingWizard and WorkoutPlanBuilder risks drift (different copy, steps, or params) and confusion about which is “the” onboarding. |
| **Broken expectations** | Users (and internal docs) may assume “Generate Workout” or “Build your plan” runs the same flow as programs’ /onboard; currently it does not. |

---

## Recommendations (short)

1. **Decide primary entry:** *(Done)* Hero “Generate Workout” goes to `/onboard` (WorkoutPlanBuilder).
2. **Align /onboard with programs:** *(Done)* `/onboard` renders WorkoutPlanBuilder with `preselect` from URL.
3. **Single flow:** *(Done)* WorkoutPlanBuilder is the canonical flow; OnboardingWizard is deprecated for this route.
4. **Document and test:** Smoke test: from the homepage click “Generate Workout” → should land on `/onboard` (WorkoutPlanBuilder) → complete Step 1 and Step 2 → see preview → click “Create account” → redirect to app with params. Verify in Supabase that `web_events` (page_view) and `analytics_funnel_events` (onboarding_builder_*) receive events for the session.

---

## File / route reference

| Location | Programs | Astro-site |
|----------|----------|------------|
| Builder component | `apps/programs/src/components/react/WorkoutPlanBuilder/` | `astro-site/src/components/react/WorkoutPlanBuilder/` |
| `/onboard` page | Renders **WorkoutPlanBuilder** (with AppWrapper) | Renders **WorkoutPlanBuilder** (skipIntro, preselect) |
| `/onboarding` page | (not used) | (optional; can mount WorkoutPlanBuilder) |
| Hero “Generate Workout” | Links to `/onboard` (HeroSection.astro) | Links to `/onboard` (Hero.astro) |
| buildSignupUrl | `apps/programs/src/lib/buildSignupUrl.ts` | `astro-site/src/lib/buildSignupUrl.ts` (same contract) |
| Analytics | — | Page-view: `astro-site/src/pages/api/analytics/page-view.ts`; funnel: `track-event.ts`; WorkoutPlanBuilder emits onboarding_builder_* events; admin Auth & onboarding shows Onboarding drop-off from `analytics_funnel_events`. |
