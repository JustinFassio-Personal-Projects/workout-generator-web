# Supabase setup for Visualization Lab (admin-dash-astro)

The admin dashboard and Visualization Lab use **the same Supabase project** as `apps/programs`. The following must exist in that project or you will see:

- **404** on `/rest/v1/generated_exercises` — table missing
- **404** on `/rest/v1/exercises` — `exercises` table missing (Exercise Library / Manually Added tabs)
- **404** on slug lookups — same
- **400 / "Bucket not found"** on image uploads — storage bucket missing

## Required schema and storage

1. **Table `public.generated_exercises`** — from `apps/programs/supabase/migrations/00001_initial_schema.sql`
2. **Table `public.exercises`** — manual exercise library (Exercise Library + Manually Added tabs)
3. **Table `public.exercise_images`** — from `apps/programs/supabase/migrations/00002_exercise_images.sql`
4. **Storage bucket `exercise-images`** (public) — from `apps/programs/supabase/migrations/00061_storage_exercise_images_bucket.sql`
5. RLS and policies for the above — see migrations `00018`, `00022`, `00023`, `00036`, `00037`, `00038`, `00043`, `00044`, `00054`, `00061`, `00062`

## How to apply

**If you still get 404 on `generated_exercises` or `exercises`, or 400 on storage after running migrations**, use **Option C** so everything is applied in the correct project in one go. The script includes the `exercises` table (for Exercise Library and Manually Added); re-running the full script is safe (idempotent).

### Option C: Single script in SQL Editor (recommended if you see 404/400)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → select the project that matches your `PUBLIC_SUPABASE_URL` (e.g. `qbklyimfazrkutwqictw`).
2. Go to **SQL Editor** → **New query**.
3. Copy the **entire** contents of `apps/admin-dash-astro/docs/SUPABASE_VISUALIZATION_LAB_SETUP.sql` and paste into the editor.
4. Click **Run**. The script is idempotent (safe to run more than once).
5. Wait a few seconds for Supabase to refresh the API schema, then try the Visualization Lab again.

### Option A: Supabase CLI

From the repo root, using the same Supabase project as programs:

```bash
cd apps/programs
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

`YOUR_PROJECT_REF` is the hex in your URL: `https://qbklyimfazrkutwqictw.supabase.co` → ref is `qbklyimfazrkutwqictw`.

If `supabase link` is already set up for programs, just run from `apps/programs`:

```bash
cd apps/programs
npm run db:push
```

(Ensure `apps/programs/.env` or `.env.local` has `SUPABASE_DB_PASSWORD` or whatever the CLI needs for push.)

### Option B: Run SQL in Supabase Dashboard

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the contents of these migration files in order (only if the objects don’t exist yet):
   - `apps/programs/supabase/migrations/00001_initial_schema.sql` (creates `generated_exercises` and other tables)
   - `apps/programs/supabase/migrations/00002_exercise_images.sql`
   - `00003_exercise_images_index.sql`
   - `00022_rls_generated_exercises.sql`, `00023_rls_exercise_images.sql`
   - `00036_policy_generated_exercises_approved.sql`, `00037_policy_generated_exercises_manage.sql`, `00038_policy_exercise_images.sql`
   - `00061_storage_exercise_images_bucket.sql` (creates the `exercise-images` bucket and policies)
   - `00062_storage_exercise_images_owner_policies.sql` (optional)

## Env in admin-dash-astro

Point at the **same** project as programs:

- `PUBLIC_SUPABASE_URL` — e.g. `https://qbklyimfazrkutwqictw.supabase.co`
- `PUBLIC_SUPABASE_ANON_KEY` — anon key from that project

No Firebase or Firestore is used; everything is Supabase (Postgres + Storage).

## How images are saved (code path)

- **Storage**: Images are uploaded to the **`exercise-images`** bucket via `uploadExerciseImage()` in `src/lib/supabase/client/storage.ts`. Paths look like `generated-exercises/{userId}/{slug}-{timestamp}.png`.
- **Database**: After upload, the public URL and path are stored in `generated_exercises` (primary image) and `exercise_images` (gallery/carousel) so the app can display and manage them.
- **Auth**: Uploads use the Supabase client with your anon key; the bucket policies (in Option C’s `SUPABASE_VISUALIZATION_LAB_SETUP.sql`, matching apps/programs 00061/00062) require the user to be **authenticated** and restrict access by `owner_id = auth.uid()`, so only the signed-in admin can upload/update/delete their own objects.

If you see **400 "Bucket not found"**, the bucket has not been created yet — apply the migrations below.

## Verify the fix

1. **Confirm project**: In Dashboard, the project ref in the URL (e.g. `qbklyimfazrkutwqictw`) must match the host in your `PUBLIC_SUPABASE_URL`. If you ran migrations in a different project, tables and bucket won't exist in the project the app uses.
2. **Run setup**: Use **Option C** (single script) in that project's SQL Editor, or Option A/B. Option C is in `docs/SUPABASE_VISUALIZATION_LAB_SETUP.sql`.
3. **Storage**: In Dashboard → **Storage**, confirm a bucket named **`exercise-images`** exists.
4. **Tables**: In **Table Editor**, confirm **`generated_exercises`** and **`exercise_images`** exist under the `public` schema. You can run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('generated_exercises', 'exercise_images');` — it should return both rows.
5. **After saving an exercise**: In Storage → `exercise-images` → `generated-exercises` you should see objects under `{user-id}/{slug}-{timestamp}.png`.
