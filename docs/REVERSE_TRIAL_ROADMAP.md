# Reverse Trial Conversion Strategy Roadmap

**Target Price Point:** $11.99 (Tier 1)  
**Strategy:** Transition from usage-bound freemium to reverse trial with credit card upfront  
**Last Updated:** March 1, 2026

---

## Executive Summary

This roadmap outlines a phased approach to migrating AI Workout Generator from its current freemium model (5 lifetime workouts free) to a **reverse trial** strategy at an **$11.99** entry price point. The reverse trial grants new users full Pro access for a limited period (7–14 days) with credit card collected upfront; non-converters are downgraded to a restricted tier rather than locked out entirely, leveraging loss aversion to drive conversion.

---

## Strategic Context

### Source Document Summary

The conversion strategy document recommends:

1. **Reverse Trial over Freemium** — Full Pro access for a limited period, then downgrade (not lockout) to a basic tier with severe usage limits. Conversion rates of 7–21% vs. 2.18% median for freemium.

2. **Credit Card Upfront** — 7-day or 14-day trial with payment info collected at signup. Trial-to-paid conversion for top health apps reaches 40%+; users who provide credit card are 64% more likely to have higher LTV.

3. **Loss Aversion** — Frame benefits as "setback prevention": "Don't lose your volume load tracking. Without Pro, your 1RM estimations and muscle fatigue data will reset in 48 hours."

4. **Activation Metrics** — "Rule of Three": users completing 3 workouts in first 10 days are 400% more likely to subscribe. Time-to-first-logged-set within 15 minutes correlates with 50% higher Day 1 retention.

5. **Dynamic Paywall** — Contextual copy based on goals/equipment; Single Session Preview (MVC) before paywall to prove MacGyver/SAID logic in under 60 seconds.

### Why $11.99 vs. $5.99

The source document is calibrated for $5.99. At **$11.99**:

- Closer to Fitbod ($12.99) — price can carry more quality signal
- Slightly more "premium" positioning — less reliance on "Value Demonstrated" alone
- Allows for stronger exclusivity framing while still maintaining value demonstration

---

## Current State

### Pricing Tiers

| Tier | Price | Workouts | Features |
|------|-------|----------|----------|
| Premium | $11.99/mo | 20/month | Basic exercise library, daily check-in, profile customization |
| Pro | $19/mo | 50/month | Calendar, workout history analytics |
| Elite | $49/mo | Unlimited | Priority support, coach access (coming soon) |
| Coach | $99/mo | — | Live classes, coaching sessions |
| Coach Pro | $199/mo | — | High-touch coaching + nutrition |

### Current Model

- **Reverse trial / paid entry** — No free tier; Premium $11.99 is the entry tier
- **Stripe payment links** — Per-tier links; no trial logic in app yet
- **No trial infrastructure** — Stripe products/prices not configured for trials

### Key Files

- `apps/nextjs-backend/data/pricing.ts` — Pricing display
- `astro-site/src/data/pricing.ts` — Astro site pricing
- **Stripe env vars (per app):**
  - **nextjs-backend:** `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM`, `_PRO`, `_ELITE`, etc.
  - **astro-site / programs:** `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM`, `_PRO`, `_ELITE`, etc.
- Premium payment link (default): `https://buy.stripe.com/dRm6oHcW3gW19RZ6qlgnK00`

---

## Phased Roadmap

### Phase 1: Data & Instrumentation (2–3 weeks)

**Goal:** Measure current behavior before changing anything.

**Tasks:**

- [ ] Implement event schema from strategy doc:
  - `Onboarding_Complete` — User finished assessment and viewed MVC
  - `MacGyver_Engine_Engaged` — User toggled 3+ pieces of equipment
  - `Workout_Generated` — AI produced a custom session
  - `Set_Logged` — User recorded reps/weight
  - `Workout_Completed` — User finished all programmed sets
  - `Adaptation_Requested` — User asked AI to swap exercise
- [ ] Track "Rule of Three" — users completing 3 workouts in first 10 days
- [ ] Track time-to-first-logged-set (critical for Day 1 retention)
- [ ] Add PostHog/analytics events for paywall views, trial starts, conversions
- [ ] Establish baseline funnel: signup → activation → paywall view → conversion

**Deliverable:** Funnel and cohort dashboards.

#### Phase 1 Implementation (Landing Site)

Implemented in the nextjs-backend repo:

- **`lib/conversion-events.ts`** — Canonical event names (`CONVERSION_EVENTS`) and helpers: `trackOnboardingComplete`, `trackMacGyverEngineEngaged`.
- **Onboarding_Complete** — Fired when PlanPreview is shown in `OnboardingWizard` and `WorkoutPlanBuilder` (props: `fitness_goals`, `fitness_level`, `equipment_access`, `activity_level`, `source`).
- **MacGyver_Engine_Engaged** — Fired once when user selects 3+ equipment categories in both `OnboardingWizard/StepOne` (multi-select) and `WorkoutPlanBuilder/StepOne` (home/full_gym tier).
- **Workout_Generated** — Fired server-side in `app/api/reports/gemini-workout/route.ts` with `goal`, `level`, `equipment` (reports demo). Primary event for authenticated users is implemented in app (see spec below).
- **PostHog** — Phase 1 events added to `.posthog-events.json`.

App-side events (`Set_Logged`, `Workout_Completed`, `Adaptation_Requested`, `paywall_viewed`, Rule of Three, time-to-first-logged-set) are specified for the app team in [docs/PHASE1_APP_EVENTS_SPEC.md](PHASE1_APP_EVENTS_SPEC.md).

---

### Phase 2: Price & Tier Structure (1–2 weeks)

**Goal:** Introduce $11.99 as the primary entry tier.

**Tasks:**

- [x] Tier mapping: **Premium $11.99** replaces Basic; Free tier removed
- [ ] Create/update Stripe products and prices for $11.99 (Premium link: `https://buy.stripe.com/dRm6oHcW3gW19RZ6qlgnK00`)
- [x] Update `apps/nextjs-backend/data/pricing.ts` and `astro-site/src/data/pricing.ts` (Premium tier; no Free tier)
- [ ] Grandfather existing Basic ($5.99) subscribers if any
- [ ] Update FAQ and marketing copy for new price

**Deliverable:** Live $11.99 tier; no change to trial/paywall flow yet.

#### Phase 2 Implementation (Code Complete)

Implemented in this repo:

- **Pricing data:** Free tier removed. **Premium** tier at $11.99 replaces Basic in [astro-site/src/data/pricing.ts](astro-site/src/data/pricing.ts) and [apps/programs/src/data/pricing.ts](apps/programs/src/data/pricing.ts). nextjs-backend updated similarly.
- **FAQ:** "approx. $15/month" updated to "approx. $12/month" in [apps/nextjs-backend/data/faq-data.ts](apps/nextjs-backend/data/faq-data.ts) and [astro-site/src/data/faq-data.ts](astro-site/src/data/faq-data.ts).
- **Env:** `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM` in astro-site and programs `.env.example`; default link used in code: `https://buy.stripe.com/dRm6oHcW3gW19RZ6qlgnK00`.

**Manual steps:** Set `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM` in astro-site (and programs) .env to the $11.99 Stripe payment link, or rely on the default link in code.

**App team:** See [docs/PHASE2_APP_STRIPE_NOTE.md](PHASE2_APP_STRIPE_NOTE.md) — map Premium price ID to `subscription_tier: 'premium'` (or retain `basic` for backward compatibility if needed).

---

### Phase 3: Trial Infrastructure (2–3 weeks)

**Goal:** Add Stripe trial support and backend logic.

**Tasks:**

- [ ] Configure Stripe subscriptions with 7-day or 14-day trial
- [ ] Add `trial_end` handling in webhooks and subscription sync
- [ ] Store trial status in user metadata (`subscription_tier`, `trial_ends_at`)
- [ ] Ensure trial users get full Pro access during trial period
- [ ] Test trial → paid conversion flow

**Deliverable:** New signups can start a trial; existing freemium flow still works.

---

### Phase 4: Reverse Trial Flow (3–4 weeks)

**Goal:** Replace "5 free workouts then paywall" with "full access for X days, then downgrade."

**Tasks:**

- [ ] Implement new user path:
  1. Onboarding → Single Session Preview (MVC) → Paywall with trial CTA → Credit card → Full Pro access for 7/14 days
- [ ] Define post-trial downgrade tier: restricted (e.g., 1–2 workouts/month, limited history) vs. full lockout
- [ ] Implement downgrade logic: when `trial_ends_at` passes and no paid subscription, apply restricted limits
- [ ] Add loss-aversion messaging: "Your volume load tracking will reset in 48 hours unless you subscribe"
- [ ] Decide: keep "5 free workouts" path for users who skip trial, or remove entirely

**Deliverable:** Reverse trial as primary conversion path.

---

### Phase 5: Paywall & Onboarding UX (2–3 weeks)

**Goal:** Optimize conversion with behavioral design.

**Tasks:**

- [ ] Dynamic paywall copy based on goals/equipment (e.g., "Unlock your hypertrophy programming for the commercial gym")
- [ ] "Pre-decisional ownership" in onboarding: "We've reserved 5 slots in your 12-week mesocycle…"
- [ ] Single Session Preview before paywall to show MacGyver/SAID logic
- [ ] Anchoring: annual plan as "Just $X/month"; consider decoy tier
- [ ] Trust elements: "No-Headache Cancellation" policy, human-verification badge

**Deliverable:** Polished paywall and onboarding flows.

---

### Phase 6: Optimization & Iteration (Ongoing)

**Goal:** Continuous improvement based on data.

**Tasks:**

- [ ] A/B test trial length (7 vs. 14 days)
- [ ] A/B test paywall timing (after first workout vs. after onboarding)
- [ ] "Rule of Three" nudges: push users between workout 2 and 3
- [ ] Monitor refund rates and churn; refine copy and flow.

---

## Key Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Trial length | 7 days (standard) vs. 14 days (doc’s "Goldilocks" for fitness) | TBD |
| Tier mapping | $11.99 Premium tier; Free tier removed | Done |
| Existing free users | Keep 5-workout freemium for legacy vs. migrate to trial | TBD |
| Post-trial downgrade | What "restricted" looks like (workouts/month, history access) | TBD |

---

## Appendix: Event Tracking Schema

| Event Name | Type | Description |
|------------|------|-------------|
| `Onboarding_Complete` | Process | User finished assessment and viewed MVC |
| `MacGyver_Engine_Engaged` | Action | User toggled 3+ pieces of equipment |
| `Workout_Generated` | Value | AI produced a custom session |
| `Set_Logged` | Investment | User recorded reps/weight |
| `Workout_Completed` | Activation | User finished all programmed sets |
| `Adaptation_Requested` | Interaction | User asked AI to swap exercise |

---

## Appendix: Psychological Triggers

| Trigger | Application | Resulting Behavior |
|---------|-------------|-------------------|
| Investment Loop | Entering equipment list and injury history | Higher sunk-cost bias; harder to delete app |
| Loss Aversion | Notifications about streaks or "breaking the chain" | Immediate engagement to avoid losing streak status |
| Simulation | Showing projected strength gains over 12 weeks | User feels they have "already started" the journey |
| Progress Anchoring | Brzycki 1RM formula to show day-over-day gains | Perceived value shifts from workout to data insights |

---

## References

- Source: AI Workout App Conversion Strategy (internal document)
- Stripe: [Subscription trials](https://stripe.com/docs/billing/subscriptions/trials)
- RevenueCat: [State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- Userpilot: [Reverse Trial Method](https://userpilot.com/blog/saas-reverse-trial/)
