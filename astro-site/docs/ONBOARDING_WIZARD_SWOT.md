# SWOT: OnboardingWizard on astro-site

**Context:** OnboardingWizard is the flow mounted at `/onboard` on astro-site. It is separate from WorkoutPlanBuilder (mounted at `/onboarding`). This document analyzes the OnboardingWizard component set and its role in the marketing → signup journey.

**Scope:** `astro-site/src/components/react/OnboardingWizard/` (no equivalent in programs; astro-site-only).

**Reference:** See also [WORKOUT_PLAN_BUILDER_SWOT.md](./WORKOUT_PLAN_BUILDER_SWOT.md) for the parallel builder flow and route semantics.

---

## Component overview

| File | Role |
|------|------|
| **OnboardingWizard.tsx** | Main container: Step 1 (goals, level, equipment) → Step 2 (activity, gender, age, units) → PlanPreview → “Create account” → Loading (10s) → redirect via `buildSignupUrl(formData)`. |
| **OnboardingIntroScreen.tsx** | Animated intro (globe, phases, “AI PERSONAL TRAINER”); used standalone on landing (navigates to `/onboard`) or with `onStart` when embedded. |
| **StepOne.tsx** | Goals, fitness level, equipment categories (string[]). Validates goals + equipment required. |
| **StepTwo.tsx** | Activity level, gender, age, preferred units. Same data shape as WorkoutPlanBuilder StepTwo. |
| **PlanPreview.tsx** | Summary cards + “CREATE ACCOUNT TO GENERATE WORKOUT” / “EDIT ANSWERS”. Calls `onCreateAccount` → wizard runs loading then redirect. |
| **Loading.tsx** | Themed loading sequence (messages, progress, “biomechanical” facts) shown for ~10 seconds before redirect. |
| **OnboardingWizard.module.scss** / **OnboardingIntroScreen.module.scss** | Layout and animation styles. |

---

## Entry points and data flow

- **Landing:** `OnboardingIntroSection.astro` renders `<OnboardingIntroScreen client:load standalone />`. “Generate Workout” / “Free Workout” → `window.location.href = '/onboard'`.
- **/onboard page:** `onboard.astro` renders `<OnboardingWizard client:load preselect={preselect} />`. Supports `?preselect=dumbbells` (etc.) to pre-fill level and equipment via `getPreselectData`.
- **Hero:** Does not link to OnboardingWizard; Hero “Generate Workout” uses `directAuthUrl` (app.aiworkoutgenerator.com?signin=1), so the main CTA bypasses both OnboardingWizard and WorkoutPlanBuilder.
- **Other CTAs:** FAQ, equipment, blog, reports, deep-research, index CTA, etc. link to `/onboard`, so they lead to OnboardingWizard when followed.

**Outcome:** “Create account” builds signup URL with `buildSignupUrl(formData, tenantId)`, runs a 10-second loading sequence, then redirects to app signup with query params (goals, level, equipment, units, age, gender, source=website, etc.).

---

## SWOT Analysis

### Strengths

| Item | Detail |
|------|--------|
| **Full flow and signup integration** | Two-step form + preview + loading then redirect; uses same `buildSignupUrl` and `WebsiteOnboardingData` contract as WorkoutPlanBuilder. App receives rich onboarding params. |
| **Analytics** | GA4 (`onboarding_start`, `onboarding_step_completed`, `onboarding_preview_viewed`, `onboarding_create_account_clicked`) and PostHog (`onboarding_create_account_clicked`) with goals, level, equipment, activity, location. |
| **Preselect from URL** | `?preselect=dumbbells` (etc.) pre-fills fitness level and equipment via `getPreselectData`; supports campaign or deep links. |
| **Strong visual identity** | Orange gradient branding, “Master the Science of Human Motion,” “Professional Kinetic Analysis Engine,” loading theatre (biomechanical facts, implode animation). Differentiates from WorkoutPlanBuilder’s more neutral “Build your AI workout plan in 2 minutes.” |
| **Intro + wizard split** | OnboardingIntroScreen can be used standalone on landing (drive to /onboard) or with callback when embedded; clear separation of “teaser” vs “form.” |
| **Required equipment in Step 1** | Validates at least one equipment category; avoids sending empty equipment to app. |
| **Shared data and options** | Uses `@/types/onboarding`, `@/data/onboarding-options`, `@/data/equipment-categories`; PlanPreview uses same labels and structure as WorkoutPlanBuilder’s preview. |

### Weaknesses

| Item | Detail |
|------|--------|
| **No URL sync** | Form state is not reflected in the URL (no `onboardingToSearchParams` / `parseOnboardingFromSearchParams`). Users cannot share or bookmark a pre-filled wizard state; back/forward does not restore choices. |
| **Fixed 10-second delay** | Redirect is delayed 10 seconds after “Create account” regardless of readiness; can feel slow or gimmicky. WorkoutPlanBuilder redirects immediately. |
| **Duplicate step/preview logic** | StepOne, StepTwo, and PlanPreview duplicate concepts and data shape of WorkoutPlanBuilder with different UI (e.g. Wizard StepOne uses `equipmentAccess: string[]` and category chips; Builder StepOne uses `EquipmentAccess` and different controls). Two code paths to maintain. |
| **Hero bypasses this flow** | The main Hero CTA goes to the app, not to /onboard, so most high-intent users never see OnboardingWizard unless they click other CTAs. |
| **Astro-site-only** | No counterpart in programs; programs use WorkoutPlanBuilder at /onboard. Migration and parity discussions must account for two different flows. |
| **Intro not shown on /onboard** | When user lands on /onboard (e.g. from “Generate Workout” in OnboardingIntroSection), they see the wizard form directly; the animated intro is only on the landing section. So “intro” is one-off on homepage, not part of /onboard. |

### Opportunities

| Item | Detail |
|------|--------|
| **Add URL sync** | Persist form state to query params (reuse or align with `urlOnboarding`) so users can share pre-filled links and back/forward works. |
| **Shorten or make loading optional** | Reduce delay (e.g. 2–3s) or redirect as soon as “ready” with loading as optional theatre; or make delay configurable. |
| **Unify with WorkoutPlanBuilder** | Reuse one set of steps and preview (e.g. Wizard uses Builder’s StepOne/StepTwo/PlanPreview with different wrapper/theme), or retire one flow and point all entries to the other. |
| **Point Hero at /onboard** | Change Hero “Generate Workout” to `/onboard` so OnboardingWizard becomes the primary path for users who start on the hero. |
| **Use intro on /onboard** | Optionally show OnboardingIntroScreen as first screen on /onboard (e.g. `showIntro` prop) so the animated intro is part of the same route. |
| **Single source of validation** | Share step validation and error messages between Wizard and Builder to avoid drift. |

### Threats

| Item | Detail |
|------|--------|
| **Two onboarding UIs** | Maintaining both OnboardingWizard and WorkoutPlanBuilder increases surface area, copy drift, and “which one is canonical?” confusion. |
| **Long delay and drop-off** | A mandatory 10s wait before redirect may increase abandonment; users may close the tab or assume an error. |
| **No shareable state** | Without URL sync, support and marketing cannot send “pre-filled plan” links; A/B tests or campaigns cannot deep-link specific configurations. |
| **Divergence from programs** | Programs’ /onboard = WorkoutPlanBuilder. Astro-site’s /onboard = OnboardingWizard. Same path, different implementation; documentation and training must spell this out. |

---

## Recommendations (short)

1. **Decide canonical flow:** Choose either OnboardingWizard or WorkoutPlanBuilder as the single “build your plan” flow for astro-site, then route Hero and all CTAs to it; deprecate or redirect the other.
2. **Improve Wizard UX:** Add URL sync for form state; shorten or make the loading delay configurable/optional.
3. **Reduce duplication:** Share step components or validation logic between Wizard and Builder where possible, or consolidate to one flow.
4. **Document and test:** Document that /onboard = OnboardingWizard and /onboarding = WorkoutPlanBuilder; add a smoke test that “Create account” redirects with expected query params.

---

## File / route reference

| Item | OnboardingWizard (astro-site) |
|------|-------------------------------|
| **Route** | `/onboard` (onboard.astro) |
| **Landing entry** | OnboardingIntroSection → OnboardingIntroScreen (standalone) → navigate to /onboard |
| **Hero** | Does not link here; links to app?signin=1 |
| **Redirect** | `buildSignupUrl(formData, tenantId)` after ~10s loading |
| **Analytics** | GA4 + PostHog on start, step, preview, create-account |
| **Preselect** | `?preselect=dumbbells` (etc.) on /onboard |
| **Programs equivalent** | None; programs use WorkoutPlanBuilder at /onboard |
