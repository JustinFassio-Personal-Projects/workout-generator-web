/**
 * Admin API requests: Bearer from Supabase session + credentials.
 * Server auth checks Authorization first; avoids 401 when the sb-access-token cookie lags first paint.
 */
import { supabase } from '@/lib/supabase/client';

export async function adminFetchInit(init: RequestInit = {}): Promise<RequestInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return { ...init, credentials: 'include' as RequestCredentials, headers };
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, await adminFetchInit(init));
}
