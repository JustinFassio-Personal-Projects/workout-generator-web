import { createClient } from '@supabase/supabase-js';

// Same Supabase project as programs/astro-site for shared admin
const DEFAULT_SUPABASE_URL = 'https://qbklyimfazrkutwqictw.supabase.co';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && !supabaseAnonKey) {
  console.warn(
    'Missing PUBLIC_SUPABASE_ANON_KEY. Copy from apps/programs/.env or set in apps/admin-dash-astro/.env'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || '' // Anon key required for auth; set in .env
);
