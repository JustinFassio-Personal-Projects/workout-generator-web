# Database Setup Guide

This app requires specific tables to be created in your Supabase database. Follow these steps to set up the database schema.

## Current Status

The Trainer app is attempting to query two types of tables:

1. **`public.profiles`** - Managed by the Hub app (shared across all apps)
2. **`trainer.trainer_profiles`** - Managed by this Trainer app (trainer-specific data)

## Setup Instructions

### Step 1: Run Trainer Schema Migration

The Trainer app needs its own schema and tables. Run the provided SQL migration:

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase_schema.sql`
4. Paste into the SQL editor
5. Click **Run**

This will create:

- `trainer` schema
- `trainer.trainer_profiles` table
- `trainer.workouts` table
- `trainer.workout_exercises` table
- All necessary RLS policies

### Step 2: Hub Tables (Already Created ✅)

The `public.profiles` table is already created by the Hub app. No additional setup needed!

### Step 3: Verify Setup

After running the migrations, verify the setup:

1. **Check Schemas:**

   ```sql
   SELECT schema_name FROM information_schema.schemata
   WHERE schema_name IN ('public', 'trainer');
   ```

2. **Check Tables:**

   ```sql
   -- Check public schema
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'profiles';

   -- Check trainer schema
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'trainer';
   ```

3. **Check RLS Policies:**
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname IN ('public', 'trainer');
   ```

## Troubleshooting

### Error: "profiles table not found" (404)

**Cause:** The `public.profiles` table doesn't exist yet.

**Solution:**

- The table should be created by the Hub app
- Check that you're using the correct Supabase project
- The app will use default profile values until the table is created

### Error: "trainer_profiles schema not found" (406)

**Cause:** The `trainer` schema and tables haven't been created yet.

**Solution:** Run `supabase_schema.sql` in Supabase SQL Editor (Step 1 above)

### Error: "Failed to sync profile to Hub"

**Cause:** The `public.profiles` table doesn't exist, so syncing fails.

**Solution:** This is expected if the Hub tables aren't set up. The app will work fine with default values. To fix:

- Ensure you're connected to the correct Supabase project
- Check that the Hub app has created the `public.profiles` table

## Production Deployment

For production, ensure:

1. **Hub app creates `public.profiles`** (already done ✅)
2. **Run `supabase_schema.sql`** to create trainer-specific tables
3. **Same Supabase project** is used by both Hub and Trainer apps
4. **RLS policies** are enabled on all tables
5. **Environment variables** match between Hub and Trainer apps

## Schema Architecture

```
Supabase Database
│
├── public schema (managed by Hub)
│   └── profiles (shared data: age, weight, height, goals, email, etc.)
│
├── trainer schema (managed by Trainer app)
│   ├── trainer_profiles (trainer-specific: fitness level, injuries, equipment)
│   ├── workouts (workout definitions)
│   ├── workout_exercises (exercise details)
│   ├── workout_history (completion logs)
│   └── chef_export_queue (data for Chef app)
│
└── auth schema (managed by Supabase)
    └── users (authentication)
```

## Next Steps

After setting up the database:

1. ✅ Restart the Trainer app
2. ✅ Check browser console - errors should be gone
3. ✅ Try creating a profile in the app
4. ✅ Generate a workout to verify database writes work
5. ✅ Check Supabase Dashboard to see the data
