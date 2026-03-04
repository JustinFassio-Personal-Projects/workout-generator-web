# Programs Landing Page Conversion Plan

**Goal:** Update the Programs app landing page with high-converting content from the astro-site, to increase conversion to starting and completing the onboarding wizard (or equivalent entry flow).

**Primary concerns:** SEO, UI/UX, and cognitive overload.

**Status:** Planning. Tagline update completed (Phase 1.1).

---

## 1. Guiding Principles

### 1.1 SEO

- **Intent alignment:** Headlines and meta copy should match search intent for "AI workout generator," "personalized workout plans," "science-based fitness," "trainer-verified exercises."
- **Schema & meta:** Maintain/improve structured data (SoftwareApplication, FAQPage, BreadcrumbList), meta title/description, and canonical URLs.
- **Content hierarchy:** Use semantic HTML (h1 → h2 → h3) and `aria-labelledby` for sections. One primary h1 per page.
- **Internal linking:** Clear paths to conversion pages (onboarding, sign-up, purchase flow) with descriptive anchor text.

### 1.2 UI/UX

- **Single primary CTA:** One dominant action above the fold. Secondary actions are visually de-emphasized.
- **Progressive disclosure:** Don’t expose everything at once. Reveal complexity as the user scrolls or engages.
- **Mobile-first:** Hero and CTAs must work on small screens. Touch targets ≥ 44px.
- **Visual hierarchy:** Use size, weight, and color to guide attention to the primary CTA and key value props.

### 1.3 Cognitive Overload

- **Fewer choices:** Limit CTAs and navigation options in the hero. Avoid decision paralysis.
- **Chunked content:** Group related info into clear sections. Use whitespace and section breaks.
- **Scannable copy:** Short paragraphs, bullet lists, and bold keywords. Avoid long blocks of text.
- **Trust without noise:** Social proof and trust badges should support, not compete with, the main message.

---

## 2. Current State

### 2.1 Programs Landing (`apps/programs/src/pages/index.astro`)

| Section        | Component              | Purpose                                      |
|----------------|------------------------|----------------------------------------------|
| Hero           | `HeroSection.astro`    | Brand, tagline, emblem, marquee              |
| Programs       | `ProgramsSection.astro`| Featured programs (bodyweight, hypertrophy)  |
| Workouts       | `WorkoutsHeader` + `WorkoutCards` | Workout library                    |
| Complexes      | `ComplexesHeader` + `ComplexesCards` | Bodyweight complexes              |
| WOD            | `WODHeader` + `WODCards` | Workout of the day                     |
| Tabata         | `TabataHeader` + `TabataCards` | Tabata workouts                    |

**Conversion entry points today:** Hero "Generate Workout" → `/onboard` (WorkoutPlanBuilder then redirect to app signup with URL params), Navigation (hamburger), `#purchase-flow-mount` (PurchaseFlow), `ConversionModal` (upgrade).

### 2.2 Astro-Site Landing (Content Source)

| Section              | Content / CTA                                                                 |
|----------------------|-------------------------------------------------------------------------------|
| Hero                 | "Stop Guessing. Start Training." + "The Science-Based AI Workout Generator."  |
| Hero CTAs            | Primary: "Generate Workout" → app `?signin=1` (direct auth); Secondary: "See the Logic" → `#journey`. Shared classes: `cta-primary`, `cta-secondary`. |
| Trust badges         | "Vetted by U.S. Army Master Fitness Trainer." / "100% Hallucination-Free."    |
| Stats                | 8,000+ Athletes, 15k+ Plans, 4.9/5, Zero Hallucinations                      |
| Feature highlights   | Anti-Hallucination, Equipment Adaptive, Progressive Overload                 |
| OnboardingIntroSection | Animated intro + link to `/onboard`                                        |
| CTA strip            | "Ready to Stop Guessing?" + "Build My Free Plan" → `/onboard`                |
| FAQ                  | 4 condensed FAQs (effectiveness, hallucinations, equipment, free version)     |

### 2.3 Conversion Target in Programs

**To confirm:** Programs does not currently expose `/onboard` or `/onboarding`. Conversion may be:

- Auth modal (sign up / log in)
- Purchase flow (via `#purchase-flow-mount` / `ConversionModal`)
- A future onboarding wizard route

**Decision (implemented):** Replicate the astro-site workflow: **builder first, then redirect to app signup** (same logic as astro-site).
- **Programs:** Hero "Generate Workout" → `/onboard` (WorkoutPlanBuilder: goals, level, equipment → step 2 → plan preview) → "Create account to generate workout" → **redirect** to `app.aiworkoutgenerator.com/signup?fitness_level=...&tab=signup&mode=signup&view=signup&...` via `buildSignupUrl(formData)`. No in-place auth modal; app signup page receives URL params and populates the flow. Same workflow and logic as astro-site.
- **Astro-site:** WorkoutPlanBuilder and OnboardingWizard use `buildSignupUrl(formData)` and `window.location.href = signupUrl`. Programs uses identical `buildSignupUrl` (same params, `source=website_builder`, `tab=signup`, etc.).

**Shared CTA:** `.cta-primary` and `.cta-secondary` in `@workout-generator/design-system` (`packages/design-system/src/cta.css`). Use `data-cta` (e.g. `data-cta="hero-generate-workout"`) for analytics.

---

## 3. Phased Implementation Plan

### Phase 1: Hero & Above-the-Fold (Low Risk)

**1.1 Tagline** ✅ Done  
- Replaced "The AI Copilot for Personal Trainers" with **"Stop Guessing. Start Training."** in `HeroSection.astro`.

**1.2 Primary CTA in Hero** ✅ Done  
- Single prominent CTA below the tagline using shared class `cta-primary`.
- **Copy:** "Generate Workout" (with play icon).
- **Destination (Programs):** Link to `/onboard` → WorkoutPlanBuilder (same flow as astro-site: step 1 goals/level/equipment, step 2 activity/gender/age/units, plan preview) → "Create account to generate workout" → **redirect to app signup** (`buildSignupUrl(formData)` → `app.aiworkoutgenerator.com/signup?...`). URL params populate the app signup flow; workflow and logic match astro-site.
- **Destination (astro-site):** Link to app with `?signin=1` (app opens with auth modal).
- **Shared styles:** `packages/design-system/src/cta.css` (`.cta-primary`, `.cta-secondary`); use `data-cta="hero-generate-workout"` for analytics.
- **Cognitive load:** One primary CTA in hero; astro-site keeps secondary "See the Logic" with `cta-secondary`.

**1.3 Optional: Short Value Line**  
- One sentence under the tagline, e.g. "Science-based AI programs. Zero hallucinations."
- Keep it short to avoid clutter.

**1.4 Trust Badges (Use Sparingly)**  
- If added: 1–2 badges max (e.g. "Vetted by U.S. Army Master Fitness Trainer" / "100% Hallucination-Free").
- **Cognitive load:** Small pills/badges; do not compete with the main headline.

---

### Phase 2: Social Proof & Feature Highlights (Medium Risk)

**2.1 Stats Row**  
- Port astro-site stats: 8,000+ Athletes, 15k+ Plans, 4.9/5, Zero Hallucinations.
- **Placement:** Below hero CTA or in a thin bar.
- **Cognitive load:** 4 items max; compact layout. Consider collapsing to 2–3 on mobile.

**2.2 Feature Highlights Bar**  
- 3 items: Anti-Hallucination Engine, Equipment Adaptive, Progressive Overload.
- **Placement:** Below hero, above Programs section, or integrated into a slim bar.
- **Cognitive load:** Icons + short labels. No long descriptions in the hero area.

**2.3 Avoid**  
- Do not add testimonials, blog preview, or journey section in the hero zone. Reserve for lower on the page.

---

### Phase 3: Onboarding Intro & CTA Strip (Medium Risk)

**3.1 Onboarding Intro Block**  
- Add a section that explains the wizard and links to it.
- **Content:** Short headline + 1–2 sentences + CTA.
- **Placement:** After Programs section, before Workouts (or after first scroll).
- **Cognitive load:** Single CTA. No multi-step explanation.

**3.2 CTA Strip**  
- "Ready to Stop Guessing?" + "Join 8,000+ athletes…" + "Build My Free Plan" CTA.
- **Placement:** Mid-page or before footer.
- **Cognitive load:** One CTA per strip. No competing links.

---

### Phase 4: FAQ & Lower-Page Content (Lower Priority)

**4.1 FAQ Section**  
- 2–4 FAQs from astro-site (effectiveness, hallucinations, equipment, free version).
- **Placement:** Before footer or after CTA strip.
- **SEO:** Use FAQPage schema. Accordion or expandable for progressive disclosure.
- **Cognitive load:** Collapsed by default. User expands only what they care about.

**4.2 Existing Sections**  
- Keep Programs, Workouts, Complexes, WOD, Tabata. Do not remove.
- **Cognitive load:** Consider whether all sections are needed on the landing page, or if some could move to a "Explore" subpage. Defer this decision.

---

### Phase 5: SEO Hardening

**5.1 Meta & Title**  
- Update `BaseLayout` default title/description to align with new messaging.
- **Current:** `AI Fitcopilot | AI Copilot for Personal Trainers—Program Design & Client Prescription.`
- **Proposed:** `AI Fitcopilot | Stop Guessing. Start Training. Science-Based AI Workout Plans.`
- **Description:** Include "Stop Guessing. Start Training." and key differentiators (hallucination-free, equipment adaptive, progressive overload).

**5.2 Structured Data**  
- Add or update SoftwareApplication schema (name, description, featureList, offers).
- Add FAQPage schema when FAQ section is added.
- Ensure BreadcrumbList for navigation.

**5.3 Canonical & Sitemap**  
- Confirm canonical URL for the landing page.
- Ensure conversion pages (e.g. `/onboard` if added) are in sitemap with appropriate priority.

---

## 4. Cognitive Overload Checklist

Before adding any new element, verify:

- [ ] Does it support the primary CTA, or compete with it?
- [ ] Can a mobile user process this in &lt; 3 seconds?
- [ ] Are we adding more than one CTA in the same viewport?
- [ ] Is the section scannable (bullets, short paragraphs, clear headings)?
- [ ] Would removing this element simplify the page without losing conversion value?

---

## 5. UI/UX Checklist

- [ ] One primary CTA above the fold.
- [ ] Primary CTA has sufficient contrast and size (min 44px touch target).
- [ ] Secondary actions are visually de-emphasized (outline, smaller, or lower).
- [ ] Section order follows a logical flow: Hook → Value → Proof → CTA.
- [ ] Mobile: Hero and CTA work without horizontal scroll; text is readable.

---

## 6. SEO Checklist

- [ ] Single h1 with primary keyword + value prop.
- [ ] Meta title ≤ 60 chars; description ≤ 160 chars.
- [ ] Semantic structure (h1 → h2 → h3) and `aria-labelledby` where appropriate.
- [ ] Internal links use descriptive anchor text (e.g. "Build My Free Plan" not "Click here").
- [ ] Structured data (SoftwareApplication, FAQPage) valid and deployed.

---

## 7. File Reference

| File | Role |
|------|------|
| `apps/programs/src/pages/index.astro` | Landing page; composes sections |
| `apps/programs/src/components/astro/HeroSection.astro` | Hero (tagline, emblem, marquee) |
| `apps/programs/src/layouts/BaseLayout.astro` | Layout, meta, title, description |
| `astro-site/src/components/landing/Hero.astro` | Content source for hero |
| `astro-site/src/components/landing/OnboardingIntroSection.astro` | Content source for onboarding intro |
| `astro-site/src/pages/index.astro` | Full astro-site structure and CTA copy |

---

## 8. Open Questions

1. **Conversion entry point:** What is the canonical URL or flow for "start onboarding" in Programs? (`/onboard`, auth modal, purchase flow, or other?)
2. **Route parity:** Should Programs add `/onboard` (or equivalent) to mirror astro-site, or use a different flow?
3. **Stats accuracy:** Are "8,000+ athletes" and "15k+ plans" accurate for Programs? Update or remove if not.
4. **Section pruning:** Should Workouts, Complexes, WOD, Tabata all remain on the landing page, or move some to a secondary "Explore" page to reduce cognitive load?
