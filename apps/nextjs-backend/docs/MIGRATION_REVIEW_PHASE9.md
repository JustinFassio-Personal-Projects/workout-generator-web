# Migration Review — Phase 9: Pre-Launch Checklist (Consolidated)

Use this document as the **living checklist** for pre-launch. Tick each item as you verify it and note any fixes. When every phase and every Phase 9 item passes (or exceptions are documented), the migration is in good shape for SEO and performance at launch.

**Reference:** Phase 9 plan (e.g. `.cursor/plans/phase_9_pre-launch_checklist_*.plan.md`).

---

## 1. Phase Sign-Off Audit (Phases 0–8)

All phases 1–8 must be signed off (or exceptions documented) before considering Phase 9 complete.

| Phase | Focus                  | Signed off? | Exception / notes                                            |
| ----- | ---------------------- | ----------- | ------------------------------------------------------------ |
| 0     | Setup and baseline     | [ ]         | See [MIGRATION_REVIEW_PHASE0.md](MIGRATION_REVIEW_PHASE0.md) |
| 1     | Static/landing         | [ ]         | See [MIGRATION_REVIEW_PHASE1.md](MIGRATION_REVIEW_PHASE1.md) |
| 2     | Blog                   | [ ]         | No separate doc; document here if needed                     |
| 3     | Story, videos, reports | [ ]         | No separate doc; document here if needed                     |
| 4     | Deep research          | [ ]         | No separate doc; document here if needed                     |
| 5     | API and forms          | [ ]         | No separate doc; document here if needed                     |
| 6     | SEO infra              | [ ]         | No separate doc; document here if needed                     |
| 7     | Analytics and layout   | [ ]         | No separate doc; document here if needed                     |
| 8     | Cross-browser          | [ ]         | See [MIGRATION_REVIEW_PHASE8.md](MIGRATION_REVIEW_PHASE8.md) |

---

## 2. Production Environment

- [ ] **PUBLIC_SITE_URL (Astro)** and canonical base equal the live domain (e.g. `https://aiworkoutgenerator.com`). Verify in deployment env vars (Vercel project → Settings → Environment Variables).
- [ ] **Sitemap and robots** use the same domain. Fetch production `/robots.txt`, `/sitemap-index.xml`, and `/sitemap.xml`; confirm URLs in response use the live domain.
- [ ] **Canonical** on a sample page: open one production page (e.g. homepage or `/blog`), view source, and confirm `<link rel="canonical" href="https://...">` matches the live domain.

**Notes:**

---

## 3. Vercel (or Host)

- [ ] **Astro app** serves marketing, blog, and related routes (e.g. `/`, `/blog`, `/reports`, `/about`, `/faq`). Confirm these return 200 and correct content.
- [ ] **Rewrites** send `/admin` and `/api/admin/*` to Next.js. Config in `astro-site/vercel.json` points to the admin deployment (e.g. `aiworkoutgenerator-admin.vercel.app`). Hitting `/admin` and `/api/admin/*` does not 404.
- [ ] **No 404 for known routes**: `/`, `/blog`, `/reports`, `/admin` (after rewrite) all resolve; unknown paths show custom 404 with status 404.

**Notes:**

---

## 4. Lighthouse (or Equivalent)

Run on 3–5 key URLs (production or staging with production-like config). Performance and Best Practices in acceptable range; no critical SEO issues.

| URL                            | Performance | Best Practices | SEO | Notes |
| ------------------------------ | ----------- | -------------- | --- | ----- |
| `/`                            |             |                |     |       |
| `/blog`                        |             |                |     |       |
| `/blog/[slug]` (one post)      |             |                |     |       |
| `/reports`                     |             |                |     |       |
| `/reports/[slug]` (one report) |             |                |     |       |

- [ ] All key URLs run; scores and critical issues recorded above. Any critical SEO or Best Practices issues fixed or documented.

---

## 5. One Full Pass

Execute in order; confirm each step behaves and looks correct.

| Step                     | Route / action                                                              | Pass/Fail | Notes |
| ------------------------ | --------------------------------------------------------------------------- | --------- | ----- |
| 1. Homepage              | `/`                                                                         |           |       |
| 2. Blog listing          | `/blog`                                                                     |           |       |
| 3. One blog post         | `/blog/[slug]`                                                              |           |       |
| 4. Story (one milestone) | `/story/[slug]` (e.g. `/story/why-ai-workout-generator`)                    |           |       |
| 5. Reports listing       | `/reports`                                                                  |           |       |
| 6. One report            | `/reports/[slug]` (e.g. `/reports/ai-hallucinations-health-data`)           |           |       |
| 7. Form submit           | Onboarding flow and/or lead form (lead form N/A until UI added per README)  |           |       |
| 8. 404                   | Visit unknown path (e.g. `/unknown-page-xyz`); custom 404 page and HTTP 404 |           |       |

- [ ] Full pass completed; all steps Pass or exceptions documented.

---

## 6. Suggested Order and Time

Use this as reference when running the full migration review.

| Phase | Focus                  | Suggested time |
| ----- | ---------------------- | -------------- |
| 0     | Setup and baseline     | 15–30 min      |
| 1     | Static/landing         | 1–2 hours      |
| 2     | Blog                   | 1–1.5 hours    |
| 3     | Story, videos, reports | 1 hour         |
| 4     | Deep research          | 30–45 min      |
| 5     | API and forms          | 30–45 min      |
| 6     | SEO infra              | 30–45 min      |
| 7     | Analytics and layout   | 30 min         |
| 8     | Cross-browser          | 30–45 min      |
| 9     | Pre-launch             | 30 min         |

---

## 7. Final Recommendations (Post Review)

After Phase 9 verification, consider these follow-ups:

- **Monitoring:** Set up or review Core Web Vitals and 404 rate (e.g. Vercel Analytics, Google Search Console).
- **Lead form:** When lead form UI is added, add a Phase 8/9 step to test submit and document in the checklist.
- **Lighthouse:** Re-run on the same key URLs after major deploys or content changes; track regressions.
- **Env:** Keep `PUBLIC_SITE_URL` (Astro) and `NEXT_PUBLIC_SITE_URL` (Next.js, if used) aligned with the live domain in all environments.
- **Sign-off:** When every Phase 9 checkbox is ticked and exceptions (if any) documented, treat the migration as ready for launch from an SEO and performance perspective.

---

## 8. Phase 9 Sign-Off

- [ ] All phases 0–8 signed off or exceptions documented (Section 1).
- [ ] Production env verified (Section 2).
- [ ] Vercel/host verified (Section 3).
- [ ] Lighthouse run on 3–5 key URLs; no critical issues or documented (Section 4).
- [ ] Full pass completed; all steps behave and look correct (Section 5).
- [ ] Final recommendations reviewed and recorded (Section 7).

**When every item above is checked, Phase 9 is complete and the migration is in good shape for launch.**
