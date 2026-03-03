# Admin user setup (admin-dash-astro & admin-dash)

admin-dash-astro uses the same **`admin_users`** table as admin-dash. The user must exist in **Supabase Auth** and have a row in **`public.admin_users`** with `id` = auth user UUID and `role` in `('admin', 'editor')`.

## Ensure Justin@aiworkoutgen.app is an admin

If the user already exists in **Authentication** but is missing from **admin_users**, or you want to (re)set their role:

### Option 1: Supabase Dashboard (SQL Editor)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project (`qbklyimfazrkutwqictw`).
2. Go to **SQL Editor** and run:

```sql
-- Insert or update admin_users for the user with this email.
-- Uses auth.users so you don't need to look up the UUID by hand.
INSERT INTO public.admin_users (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'Justin@aiworkoutgen.app'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### Option 2: Supabase CLI (after linking)

Link the project once, then run the SQL via a one-off migration or the Dashboard:

```bash
supabase link --project-ref qbklyimfazrkutwqictw
```

Then use **SQL Editor in the Dashboard** (Option 1) to run the same `INSERT ... ON CONFLICT` SQL, or create a migration file under `supabase/migrations/` with that SQL and run `supabase db push`.

If you use the **Supabase MCP server** (e.g. from `apps/nextjs-backend` where `@supabase/mcp-server-supabase` is installed), run the same SQL through that tool.

### Option 3: Script (nextjs-backend)

From `apps/nextjs-backend`, if you have `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` set:

```bash
cd apps/nextjs-backend
npx tsx scripts/setup-admin-user.ts Justin@aiworkoutgen.app <password> admin
```

That creates the auth user (if missing) and adds them to `admin_users`. If the user already exists in auth, the script will fail on create; then use Option 1 or 2 to add only the `admin_users` row.

---

## Verify

- **admin-dash**: Log in at the admin-dash login page with Justin@aiworkoutgen.app.
- **admin-dash-astro**: Log in at `/admin/login` (e.g. http://localhost:3009/admin/login) with the same email/password. Both apps now use `admin_users` for authorization.
