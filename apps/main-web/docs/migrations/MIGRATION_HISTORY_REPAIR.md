# Supabase Migration History Repair

## Problem

```
Remote migration versions not found in local migrations directory.
```

The remote database has migration versions (e.g. `20260104172920`) that don't exist in your local `supabase/migrations/` folder. Your local migrations use different timestamps (e.g. `20260104082749`). This typically happens when:

- Migrations were applied from a different branch or machine
- The remote was set up with different migration files
- Migration filenames were renamed locally

## Prerequisites

1. **Supabase login** (not GitHub – that's different):

   ```bash
   supabase login
   ```

   If you see "Unauthorized" with `supabase link`, run this first. Use a token from https://supabase.com/dashboard/account/tokens if needed:

   ```bash
   supabase login --token YOUR_ACCESS_TOKEN
   ```

2. **Link the project** (requires DB password when prompted):

   ```bash
   supabase link --project-ref qbklyimfazrkutwqictw
   ```

   Set `SUPABASE_DB_PASSWORD` if you want to skip the prompt.

## Repair Steps

### Step 1: Mark remote-only migrations as reverted

This removes those versions from the remote migration history. It does **not** change the database schema.

```bash
supabase migration repair --status reverted 20260104172920 20260106052852 20260106140501 20260107131541 20260107164951 20260107165217 20260118070740 20260131194013
```

### Step 2: Mark your local migrations as applied

This adds your local migration versions to the remote history so Supabase treats them as already applied.

```bash
supabase migration repair --status applied 20260104082749 20260105204537 20260106060432 20260106140228 20260107084907 20260107085000 20260118091500 20260118170408
```

**Note:** If the `deep_research` table doesn't exist yet on remote, you may need to apply its creation migration first. Check with `supabase migration list --linked` after step 1.

### Step 3: Push the new migration

Apply only the new migration (`20260131000000_add_deep_research_metadata.sql`):

```bash
supabase db push
```

## Verify

```bash
supabase migration list --linked
```

You should see local and remote aligned, with only `20260131000000` as newly applied (if it wasn't already there).

## Alternative: db pull (baseline from remote)

If you prefer to treat the remote as the source of truth and sync local to it:

1. Revert all remote migrations (step 1 above).
2. Run:

   ```bash
   supabase db pull
   ```

3. When prompted "Update remote migration history table? [Y/n]", choose **Y**.

This creates a new migration file with the current remote schema. Your existing local migrations may conflict; you’d need to reconcile or remove duplicates manually.

## If deep_research table is missing

If the remote has no `deep_research` table, you’ll need its creation migration before the metadata one. Check whether there’s a `create_deep_research_schema` migration. If not, create it and push before applying the metadata migration.
