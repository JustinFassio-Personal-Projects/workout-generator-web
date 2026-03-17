#!/usr/bin/env tsx
/**
 * Development Token Generator
 *
 * This script generates Supabase session tokens for development and testing purposes.
 * It authenticates a test user and outputs access/refresh tokens that can be used
 * to test authentication flows in embedded or parent-child app scenarios.
 *
 * SECURITY NOTES:
 * - All credentials MUST be provided via environment variables
 * - Never commit credentials to the repository
 * - Use .env.local for local development (add to .gitignore)
 *
 * Usage:
 *   TEST_USER_EMAIL="test@example.com" TEST_USER_PASSWORD="password" npx tsx scripts/generate-dev-tokens.ts
 *
 * Or with .env.local:
 *   npx tsx scripts/generate-dev-tokens.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - Supabase credentials must be provided via environment variables
const SUPABASE_URL: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY;

// Validate Supabase credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).',
  );
  console.error('Set these in your environment or .env.local file and try again.');
  process.exit(1);
}

// TypeScript now knows these are defined after the check
const SUPABASE_URL_FINAL: string = SUPABASE_URL;
const SUPABASE_ANON_KEY_FINAL: string = SUPABASE_ANON_KEY;

// Test user credentials - must be provided via environment variables
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

async function generateDevTokens() {
  console.log('🔐 Generating development session tokens...\n');

  // Validate test user credentials
  if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
    console.error(
      '❌ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set!\n',
    );
    console.error('Steps:');
    console.error('1. Go to Supabase Dashboard → Authentication → Users');
    console.error('2. Create a test user (or use an existing one)');
    console.error('3. Set TEST_USER_EMAIL and TEST_USER_PASSWORD as environment variables');
    console.error(
      '   Example: TEST_USER_EMAIL="your@email.com" TEST_USER_PASSWORD="yourpassword" npx tsx scripts/generate-dev-tokens.ts',
    );
    console.error('   Or add them to your .env.local file\n');
    process.exit(1);
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL_FINAL, SUPABASE_ANON_KEY_FINAL);

    // Authenticate the test user
    console.log(`📧 Authenticating user: ${TEST_USER_EMAIL}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (error) {
      console.error('\n❌ Authentication failed:', error.message);
      console.error('\nPossible issues:');
      console.error('- User does not exist in Supabase');
      console.error('- Password is incorrect');
      console.error('- Email confirmation required but not completed');
      console.error('\nCheck your Supabase dashboard and verify the test user credentials.\n');
      process.exit(1);
    }

    if (!data.session) {
      console.error('\n❌ No session returned after authentication');
      process.exit(1);
    }

    // Success! Output the tokens
    console.log('\n✅ Authentication successful!\n');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('\n📋 Session Tokens:\n');
    console.log('Access Token:');
    console.log(data.session.access_token);
    console.log('\nRefresh Token:');
    console.log(data.session.refresh_token);
    console.log('\nExpires At:', new Date(data.session.expires_at! * 1000).toISOString());

    console.log('\n💡 Usage Example:');
    console.log('Note: The app now uses schema-based SSO (URL tokens).');
    console.log('For testing, you can manually navigate with tokens in URL:');
    console.log(`http://localhost:3001/?sso_token=test-token`);
    console.log('\nOr use the Hub app to generate proper SSO tokens via the sso_tokens table.');

    // Sign out to clean up
    await supabase.auth.signOut();
    console.log('🔒 Signed out successfully.\n');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Unexpected error:', error.message);
      console.error('\nStack trace:');
      console.error(error.stack);
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run the script
generateDevTokens();
