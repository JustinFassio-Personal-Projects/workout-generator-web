# Publish to Marketing

How to get content from the admin dash (Program Factory, Challenge Factory, Workout Factory, Manage Exercises) onto the marketing site (aiworkoutgenerator.com) homepage, Explore page, and programs app catalog.

## Quick reference

| Content type        | Detailed workflow |
|---------------------|-------------------|
| **Programs**        | [Program Publish Workflow](PROGRAM_PUBLISH_WORKFLOW.md) |
| **Challenges**      | [Challenge Publish Workflow](CHALLENGE_PUBLISH_WORKFLOW.md) |
| **Workouts**        | [Workout Publish Workflow](WORKOUT_PUBLISH_WORKFLOW.md) |
| **Exercises (deep dive)** | [Exercise Deep Dive Workflow](EXERCISE_DEEP_DIVE_WORKFLOW.md) |

---

## Programs

**Flow:** Draft → Publish → Feature on Homepage → appears on marketing homepage and Explore.

- **Feature on Homepage:** In the Program Library table, click the **Star** icon (enabled only when the program is published). You can also use the "Feature on Homepage" toggle in the Program Editor.
- **Detail:** [Program Publish Workflow](PROGRAM_PUBLISH_WORKFLOW.md).

---

## Challenges

**Flow:** Draft → Publish → Feature on Homepage → appears on marketing homepage and Explore.

- **Feature on Homepage:** In the Challenge Library table, click the **Star** icon (enabled only when the challenge is published). You can also use the "Feature on Homepage" toggle in the Challenge Editor.
- **Detail:** [Challenge Publish Workflow](CHALLENGE_PUBLISH_WORKFLOW.md).

---

## Workouts

**Flow:** Draft → Publish → Feature on Homepage → appears on marketing homepage and Explore.

- **Feature on Homepage:** In the Workout Library table, click the **Star** icon (enabled only when the workout is published).
- **Detail:** [Workout Publish Workflow](WORKOUT_PUBLISH_WORKFLOW.md).

---

## Exercises (deep dive)

**Flow:** Create/Import → Approve → Generate Deep Dive → Save → live on /learn and /exercises.

- Exercises do not use a "Feature on Homepage" flag. Approved exercises with deep dive content appear on the programs app at `/exercises` and `/learn`; astro-site nav links to these.
- **Detail:** [Exercise Deep Dive Workflow](EXERCISE_DEEP_DIVE_WORKFLOW.md).

---

## Resilience

When Supabase is unconfigured (e.g. missing env in CI or a preview deploy) or a featured-content query fails, the marketing site does not throw: featured sections receive empty data and the site still builds and serves. Homepage and Explore will show empty featured sections or fallback copy until Supabase is available again.

## Caching

The marketing site homepage (`/`) and Explore page (`/explore`) are cached at the CDN (1 minute) with revalidation for 5 minutes. When you feature or unfeature content, it may take up to about 1–5 minutes to appear on those pages.
