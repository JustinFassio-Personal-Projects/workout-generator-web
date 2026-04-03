# Set a user as super admin (programs app)

The **programs** app (programs-admin) uses **only** `public.profiles.role` for admin access. There is no `admin_users` table in the programs app auth flow.

- **Admin / super admin:** same thing here — set `profiles.role = 'admin'`.
- **Server-side:** `verifyAdminRequest()` in `src/lib/supabase/admin/auth.ts` checks `profiles.role === 'admin'`.
- **Client-side:** AppContext and nav use `user.isAdmin` (from profile.role === 'admin').

## How to update the current user to super admin

1. Open your **Supabase** project (the one used by programs-admin) -> **SQL Editor**.
2. Run (replace `YOUR_USER_UUID` with your user’s id from **Authentication -> Users**):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_UUID';
```

3. If that user has no row in `profiles` yet (e.g. created before the trigger existed), insert one then set role (replace placeholders):

```sql
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'YOUR_USER_UUID',
  'your@email.example',
  'Your Name',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, full_name = EXCLUDED.full_name;
```

4. Reload the programs-admin site and sign in again. The dashboard and admin nav should appear.

## Roles in this app

| Role      | Meaning                                                                      |
| --------- | ---------------------------------------------------------------------------- |
| `client`  | Default; can use programs/workouts they’re enrolled in.                      |
| `trainer` | Can manage own programs and see trainer roster.                              |
| `admin`   | Full content admin: programs, challenges, workouts, exercises, users, stats. |

Only `profiles.role` is used. The **admin-dash-astro** app may use an `admin_users` table; that is separate. For programs-admin, updating `profiles.role` to `'admin'` is sufficient for super admin access.
