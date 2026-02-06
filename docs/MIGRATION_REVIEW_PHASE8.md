# Migration Review — Phase 8: Cross-Browser and Devices

Use this document to record pass/fail and notes for Phase 8 of the Next.js to Astro migration review. Follow the full instructions in the Phase 8 plan (e.g. `.cursor/plans/phase_8_cross-browser_devices_*.plan.md`). Phases 0–7 should be signed off before starting.

**Pass criteria:** No broken layout or JS errors; critical flows work on supported browsers and mobile; no hydration mismatch or React errors on island pages.

---

## 1. Support Matrix

Document or confirm the support matrix used for this phase.

| Category      | Browsers / devices                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Desktop**   | Chrome (latest), Firefox (latest), Safari (latest, macOS), Edge (latest)                        |
| **Mobile**    | iOS Safari (latest), Chrome on Android (latest)                                                 |
| **Viewports** | Mobile 375×667 or 390×844; tablet 768px; desktop 1280px+ (nav drawer shows below `xl` = 1280px) |

**Build-time targets:** Optional `browserslist` is set in `astro-site/package.json` for tooling (last 2 versions of Chrome, Firefox, Safari, Edge, iOS, Chrome Android). Manual testing covers the matrix above.

---

## 2. Key Flows and Routes

| Flow                          | Steps                                     | Routes / components                                                                                                       |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Landing → Blog → One post** | Home → Blog list → Open one post          | `/` → `/blog` → `/blog/[slug]` (e.g. first post)                                                                          |
| **Onboarding**                | Start onboarding, complete or exit        | `/onboard` (OnboardingWizard), `/onboarding` (WorkoutPlanBuilder); index CTA → onboard or onboarding                      |
| **Lead form**                 | Submit lead (when UI exists)              | `/api/leads` (POST). No form UI in Footer or exercise-challenge per README; if/when added, test submit and success/error. |
| **Report page**               | Open report, scroll, use interactive bits | `/reports` → `/reports/[slug]` (e.g. `/reports/ai-hallucinations-health-data`)                                            |

**Additional flows to spot-check:** FAQ (accordions), Equipment (grid), 404 (links and layout).

---

## 3. React Islands (hydration audit)

Pages that render React islands; verify no "hydration mismatch", "Text content does not match", or uncaught React errors on load and after interaction.

| Page                           | Islands                                                                             | Directive                    | Console / hydration (fill after test) |
| ------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| Homepage (`/`)                 | ScienceChart, EquipmentAdaptive, JourneySection, Testimonials, BlogPreview, FaqItem | client:load / client:visible |                                       |
| FAQ (`/faq`)                   | FaqItem (multiple)                                                                  | client:visible               |                                       |
| Equipment (`/equipment`)       | EquipmentCardGrid                                                                   | client:visible               |                                       |
| Onboarding (`/onboarding`)     | WorkoutPlanBuilder                                                                  | client:load                  |                                       |
| Onboard (`/onboard`)           | OnboardingWizard                                                                    | client:load                  |                                       |
| Report (`/reports/[slug]`)     | ReportV2Content                                                                     | client:visible               |                                       |
| Index (OnboardingIntroSection) | OnboardingIntroScreen                                                               | client:load                  |                                       |

**Hydration check:** For each page above, load with DevTools console open; interact (FAQ expand, report tabs, onboarding steps). Record any errors in the table or in the Results log below.

---

## 4. Mobile Review (device mode or real device)

**Tooling:** Chrome DevTools device toolbar (e.g. iPhone SE 375, Pixel 5 393) or real iOS/Android device. Use a viewport &lt; 1280px so the **nav drawer** is used.

**Checklist (human: tick as you complete)**

- [ ] **Touch targets:** Menu button, drawer links, CTAs (e.g. "Generate Workout", "Sign Up"), FAQ toggles, report tier selector, onboarding form controls are at least ~44×44px where possible.
- [ ] **Nav drawer:** Open (Menu) → links work → close via overlay, link click, or Escape; at 1280px+ drawer closes on resize. No double scroll or focus traps.
- [ ] **Forms:** Onboarding/onboard: fill and step through; no layout overflow or unresponsive inputs on small screens.
- [ ] **Lead form:** N/A until form UI exists (note in Results log).
- [ ] **Flows:** Landing → Blog → One post; Onboarding (onboard + onboarding); Report page. No broken layout, no JS errors in console.

**Results (human: fill)**

| Flow                              | Pass/Fail | Notes |
| --------------------------------- | --------- | ----- |
| Landing → Blog → One post         |           |       |
| Onboarding (onboard + onboarding) |           |       |
| Report page                       |           |       |
| Nav drawer (open, links, close)   |           |       |
| Forms (onboarding)                |           |       |

---

## 5. Desktop Review (Chrome, Firefox, Safari)

Same flows as mobile on each browser. Full nav bar visible at `xl`; no drawer needed. Pay attention in Safari to flexbox/grid, sticky header, and `backdrop-filter` (navbar/Footer).

**Results (human: fill)**

| Browser         | Landing → Blog → Post | Onboarding | Report page | Console clean (island pages) |
| --------------- | --------------------- | ---------- | ----------- | ---------------------------- |
| Chrome          |                       |            |             |                              |
| Firefox         |                       |            |             |                              |
| Safari          |                       |            |             |                              |
| Edge (optional) |                       |            |             |                              |

---

## 6. Hydration / Console (consolidated)

After testing all island pages (section 3), record any hydration or React errors here.

| Page              | Hydration / React errors? | Notes |
| ----------------- | ------------------------- | ----- |
| `/`               |                           |       |
| `/faq`            |                           |       |
| `/equipment`      |                           |       |
| `/onboarding`     |                           |       |
| `/onboard`        |                           |       |
| `/reports/[slug]` |                           |       |

---

## 7. Issues and Fixes

Document any layout, touch-target, or hydration issues found and the fixes applied (or ticket references).

| Issue | Fix / status |
| ----- | ------------ |
|       |              |

---

## 8. Pass Criteria Summary

- [ ] No broken layout or unreadable content on supported viewports.
- [ ] No JS errors or hydration errors in console on critical and island pages.
- [ ] Critical flows (landing → blog → post; onboarding; report page) work on Chrome, Firefox, Safari (desktop) and on one mobile profile (device mode or real device).
- [ ] Nav drawer works on mobile; forms (onboarding/onboard) are usable.
- [ ] When lead form exists: submit works; until then, lead form N/A is documented.

---

## 9. Phase 8 Sign-Off

- [ ] Support matrix defined; mobile and desktop passes completed and recorded above.
- [ ] Hydration/console checked for all island pages; any issues documented and fixed.
- [ ] Pass criteria met; any exceptions documented in Issues and Fixes.

**Next step:** Proceed to post–Phase 8 sign-off or remaining migration tasks.
