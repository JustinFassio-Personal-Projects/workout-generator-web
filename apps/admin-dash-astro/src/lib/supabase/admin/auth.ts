/**
 * Server-side Supabase auth: verify session and admin role for admin routes.
 */
import { createClient } from '@supabase/supabase-js';

// Require env explicitly so we never silently point at the wrong project (fail fast).
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required. Copy .env.example to .env and set them (same project as programs for shared admin).'
  );
}

const COOKIE_NAME = 'sb-access-token';

export function extractAccessToken(
  request: Request,
  cookies?: { get: (name: string) => { value: string } | undefined }
): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim() || null;
  }
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const parsed = cookieHeader.split(';').reduce(
      (acc, part) => {
        const [key, ...val] = part.trim().split('=');
        if (key && val.length) acc[key.trim()] = decodeURIComponent(val.join('=').trim());
        return acc;
      },
      {} as Record<string, string>
    );
    return parsed[COOKIE_NAME] || parsed['sb-access-token'] || null;
  }
  if (cookies) {
    const c = cookies.get(COOKIE_NAME) ?? cookies.get('sb-access-token');
    if (c?.value) return c.value;
  }
  return null;
}

export async function verifyAdminRequest(
  request: Request,
  cookies?: { get: (name: string) => { value: string } | undefined }
): Promise<{ uid: string; email?: string }> {
  const token = extractAccessToken(request, cookies);
  if (!token) throw new Error('UNAUTHENTICATED');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) throw new Error('UNAUTHENTICATED');

  // Same as admin-dash: check admin_users table (id = auth user id, role in admin/editor)
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (adminError || !adminUser) {
    throw new Error('UNAUTHORIZED');
  }

  return { uid: user.id, email: user.email ?? undefined };
}
