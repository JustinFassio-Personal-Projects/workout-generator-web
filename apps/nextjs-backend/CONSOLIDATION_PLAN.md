# Strategy: Live Site Consolidation

**Goal:** Consolidate everything into the **Live Site repository** (`~/Local Sites/Workout Generator`), turning it into a monorepo structure _in-place_. This avoids the "fresh repo" confusion and keeps your git history and deployment settings intact.

## The Plan

1.  **Convert Live Site to Monorepo Root:**
    - We initialize a workspace in `~/Local Sites/Workout Generator`.
    - Move the current Next.js live site code into `apps/website`.
    - This keeps the live site isolated but part of the new structure.

2.  **Import the Admins:**
    - **Step A:** Copy `~/Local Sites/ai-fitness-guy` into `apps/admin-astro` (New Admin).
    - **Step B:** Copy `~/Local Sites/AI Workout Gen Admin` into `apps/admin-legacy` (Old Admin).
    - **Merge:** You can now incrementally port features from `admin-legacy` to `admin-astro` while both are in the same repo.

3.  **Deploy Strategy (The "Safe Swap"):**
    - **Live Site (`www`):** Deploys from `apps/website`. (Zero downtime, no code changes initially).
    - **Admin Subdomain (`admin`):** You point your `admin.aiworkoutgenerator.com` deployment to `apps/admin-astro`.
    - **Result:** You instantly get the new Astro admin on the subdomain. The main site stays Next.js for now.

4.  **Gradual Migration (The URLs):**
    - Once the admin is stable, you start moving pages (Blog, About, etc.) from `apps/website` (Next.js) into `apps/admin-astro` (Astro) or a new `apps/main` Astro app.
    - As you move pages, you update the deployment to point to the Astro app.

## Why this is safer

- **No Big Bang:** The live site code doesn't change _at all_ in step 1-3. It just moves into a subfolder.
- **Immediate Value:** You get the new Astro admin live on the subdomain immediately.
- **Git History:** You keep the history of your main repo.

**Shall I generate a Cursor plan to convert `~/Local Sites/Workout Generator` into this workspace structure?**
