# Migration Review — Phase 1: Core Static and Landing Pages

Use this document to record pass/fail and notes for Phase 1 of the Next.js to Astro migration review. Follow the full instructions in the Phase 1 plan (e.g. `.cursor/plans/phase_1_migration_review_plan_*.plan.md`). Phase 0 must be signed off before starting (see [MIGRATION_REVIEW_PHASE0.md](MIGRATION_REVIEW_PHASE0.md)).

---

## Phase 1 pages and local URLs

With the Astro dev server running (`cd astro-site && npm run dev`), open:

| Page                  | Local URL                                |
| --------------------- | ---------------------------------------- |
| Homepage              | http://localhost:4321/                   |
| About                 | http://localhost:4321/about              |
| FAQ                   | http://localhost:4321/faq                |
| Equipment             | http://localhost:4321/equipment          |
| Founder story         | http://localhost:4321/founder-story      |
| Onboard               | http://localhost:4321/onboard            |
| Onboarding            | http://localhost:4321/onboarding         |
| Exercise challenge    | http://localhost:4321/exercise-challenge |
| Reports listing       | http://localhost:4321/reports            |
| Deep research listing | http://localhost:4321/deep-research      |

---

## Results log (human: fill after running manual checks)

Mark Pass/Fail per page or per section. Add short notes for any failure or fix.

| Page                  | Correctness | SEO | Performance | Notes |
| --------------------- | ----------- | --- | ----------- | ----- |
| Homepage              |             |     |             |       |
| About                 |             |     |             |       |
| FAQ                   |             |     |             |       |
| Equipment             |             |     |             |       |
| Founder story         |             |     |             |       |
| Onboard               |             |     |             |       |
| Onboarding            |             |     |             |       |
| Exercise challenge    |             |     |             |       |
| Reports listing       |             |     |             |       |
| Deep research listing |             |     |             |       |

---

## Checklist summary (human: tick as you complete)

**Correctness**

- [ ] 1.1 Content and layout: All 10 pages match baseline; sections and CTAs present.
- [ ] 1.2 Nav and footer: Render on every page; internal links correct; mobile drawer works.
- [ ] 1.3 Admin/app links: Point to correct destinations (e.g. `/admin`, app login).
- [ ] 1.4 Forms: Lead form and onboarding submit to expected endpoints; success/error behavior correct.

**SEO**

- [ ] 2.1 Title and description: Unique `<title>` and `<meta name="description">` on each page.
- [ ] 2.2 Canonical: `<link rel="canonical">` present and correct on all 10 pages.
- [ ] 2.3 Open Graph: `og:title`, `og:description`, `og:image`, `og:url` present; optional: Facebook Sharing Debugger.
- [ ] 2.4 JSON-LD: At least Organization/WebSite; no duplicate or invalid blocks.
- [ ] 2.5 Indexability: No `noindex` on Phase 1 pages unless intended.

**Performance**

- [ ] 3.1 Lighthouse: Desktop and Mobile run on homepage + 2–3 pages; scores acceptable (e.g. 90+ or no regression).
- [ ] 3.2 Hydration: No single enormous blocking script; `client:visible`/`client:idle` used where appropriate.
- [ ] 3.3 Fonts/CSS: No large layout shift or FOUC.

---

## Phase 1 sign-off

- [ ] All 10 pages load; correctness, SEO, and performance checks completed and recorded above.
- [ ] Any failures documented with notes; fixes applied and re-checked as needed.

**Next step:** Proceed to Phase 2 (Blog: listing, post, author, category).
