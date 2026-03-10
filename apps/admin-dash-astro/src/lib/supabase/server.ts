/**
 * Server-side Supabase client (optional service role for bypassing RLS).
 * Use for API routes that need to read/write without user context (e.g. admin users list).
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load env so API routes get correct values. Load monorepo root first so admin + programs share Supabase.
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
loadEnv({ path: resolve(rootDir, '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '.env.local') });

function normalizeEnvVar(v: string | undefined): string {
  if (v == null || typeof v !== 'string') return '';
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
    return t.slice(1, -1).trim();
  return t;
}

const supabaseUrl =
  normalizeEnvVar(process.env.PUBLIC_SUPABASE_URL) ||
  normalizeEnvVar(import.meta.env.PUBLIC_SUPABASE_URL as string | undefined);
const serviceRoleKey =
  normalizeEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  normalizeEnvVar(import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined);
const anonKey =
  normalizeEnvVar(process.env.PUBLIC_SUPABASE_ANON_KEY) ||
  normalizeEnvVar(import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined);

/**
 * Client with service role key when available (bypasses RLS). Otherwise anon (RLS applies).
 * Use for server-side reads/writes where RLS is acceptable (e.g. user-scoped queries).
 */
export function getSupabaseServer() {
  if (!supabaseUrl) throw new Error('PUBLIC_SUPABASE_URL is required');
  const key = serviceRoleKey || anonKey;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_ANON_KEY required');
  return createClient(supabaseUrl, key);
}

/**
 * Client with service role key only. Use for admin-only operations that require it
 * (e.g. auth.admin.listUsers(), bypassing RLS). Throws if SUPABASE_SERVICE_ROLE_KEY is missing
 * so misconfiguration is caught early instead of failing at runtime.
 */
export function getSupabaseServiceRole() {
  if (!supabaseUrl) throw new Error('PUBLIC_SUPABASE_URL is required');
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for this operation (e.g. admin users list). Set it in .env from Dashboard → Settings → API.'
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
