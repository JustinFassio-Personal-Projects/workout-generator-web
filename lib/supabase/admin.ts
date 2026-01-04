import { createClient } from '@supabase/supabase-js'

/**
 * Creates an admin Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) policies.
 *
 * WARNING: Only use this on the server-side. Never expose the service role key
 * to the client. This client should only be used for admin operations that
 * need to bypass RLS.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
