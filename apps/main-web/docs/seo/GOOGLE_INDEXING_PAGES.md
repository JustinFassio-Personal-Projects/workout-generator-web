# Google Indexing - Pages to Crawl

This document lists all pages that should be indexed by Google Search Console. All URLs use the base domain: `https://aiworkoutgenerator.com`

## Core Static Pages (High Priority)

1. **Homepage**
   - `https://aiworkoutgenerator.com/`
   - Priority: 1.0

2. **Equipment Hub** (New - High Priority)
   - `https://aiworkoutgenerator.com/equipment`
   - Priority: 0.9

3. **Onboarding Wizard** (Conversion Page)
   - `https://aiworkoutgenerator.com/onboard`
   - Priority: 0.9

4. **Blog Listing**
   - `https://aiworkoutgenerator.com/blog`
   - Priority: 0.8

5. **Reports Listing**
   - `https://aiworkoutgenerator.com/reports`
   - Priority: 0.8

6. **About Page**
   - `https://aiworkoutgenerator.com/about`
   - Priority: 0.7

7. **Exercise Challenge**
   - `https://aiworkoutgenerator.com/exercise-challenge`
   - Priority: 0.7

8. **Founder Story**
   - `https://aiworkoutgenerator.com/founder-story`
   - Priority: 0.7

## Report Pages (Content)

9. `https://aiworkoutgenerator.com/reports/system-vs-randomness`
10. `https://aiworkoutgenerator.com/reports/random-workouts-kill-progress`
11. `https://aiworkoutgenerator.com/reports/ai-hallucinations-health-data`

## Story Milestone Pages (Founder Story Chapters)

12. `https://aiworkoutgenerator.com/story/santa-cruz-surfing`
13. `https://aiworkoutgenerator.com/story/joining-the-air-force`
14. `https://aiworkoutgenerator.com/story/tacp`
15. `https://aiworkoutgenerator.com/story/mft-ufpm-3rd-asog`
16. `https://aiworkoutgenerator.com/story/ucsc-literature-critical-theory`
17. `https://aiworkoutgenerator.com/story/san-diego-core-fitness`
18. `https://aiworkoutgenerator.com/story/gymgo`
19. `https://aiworkoutgenerator.com/story/fitnimbus`
20. `https://aiworkoutgenerator.com/story/why-ai-workout-generator`

## Video Pages

21. `https://aiworkoutgenerator.com/videos/1` (Brand Video)
22. `https://aiworkoutgenerator.com/videos/2` (Featured Exercise Video 1)
23. `https://aiworkoutgenerator.com/videos/3` (Featured Exercise Video 2)
24. `https://aiworkoutgenerator.com/videos/4` (Kettlebell Complex)
25. `https://aiworkoutgenerator.com/videos/5` (HIIT Workout)

## Blog Pages (Dynamic - From Supabase)

**Note:** These pages are dynamically generated from your Supabase database. The exact URLs will depend on your published blog posts, authors, and categories.

### Blog Posts

- Pattern: `https://aiworkoutgenerator.com/blog/[slug]`
- All published posts with `status = 'published'` in the `posts` table

### Author Pages

- Pattern: `https://aiworkoutgenerator.com/blog/author/[slug]`
- All authors in the `authors` table

### Category Pages

- Pattern: `https://aiworkoutgenerator.com/blog/category/[slug]`
- All categories in the `categories` table

## Sitemap Location

All these pages are automatically included in your sitemap at:

- `https://aiworkoutgenerator.com/sitemap.xml`

## Google Search Console Actions

1. **Submit Sitemap**: Submit `https://aiworkoutgenerator.com/sitemap.xml` to Google Search Console
2. **Request Indexing**: For high-priority pages (homepage, `/equipment`, `/onboard`), you can manually request indexing in Google Search Console
3. **Monitor Coverage**: Check the Coverage report to ensure all pages are being discovered and indexed

## Priority Guidelines

- **Priority 1.0**: Homepage (most important)
- **Priority 0.9**: Key conversion pages (`/equipment`, `/onboard`)
- **Priority 0.8**: Category/listing pages (`/blog`, `/reports`)
- **Priority 0.7**: Content pages (reports, videos, static pages)
- **Priority 0.6**: Story pages, author pages, category pages

## Change Frequency

- **Weekly**: Homepage, `/blog`, `/onboard`, `/reports` (frequently updated)
- **Monthly**: Most content pages, static pages, videos, reports, story pages

---

**Last Updated**: Based on sitemap implementation as of the latest update.
