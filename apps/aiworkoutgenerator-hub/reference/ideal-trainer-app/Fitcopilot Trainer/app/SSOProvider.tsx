'use client';

import React, { useEffect, useState } from 'react';
import { useSchemaBasedSSO, getSSOTokenFromUrl } from '../services/SchemaBasedSSO';
import { supabase } from '../services/dbService';

/**
 * Internal component that uses the SSO hook
 * This ensures hooks are called unconditionally
 */
function SSOProviderInner({ children }: { children: React.ReactNode }) {
  // Hook must be called unconditionally - supabase should always be available on client
  const { user, session, error } = useSchemaBasedSSO(supabase!);

  // Debug: Check for SSO token on app initialization
  useEffect(() => {
    console.log('🔍 [DEBUG] SSOProvider: Initializing, checking for SSO token...');
    const token = getSSOTokenFromUrl();
    if (token) {
      console.log('✅ [DEBUG] SSOProvider: SSO token detected in URL on mount');
    } else {
      console.log('ℹ️ [DEBUG] SSOProvider: No SSO token in URL on mount');
    }
  }, []);

  // Log authentication state for debugging
  useEffect(() => {
    if (error) {
      console.error('❌ SSOProvider: SSO error:', error);
    }
    if (session && user) {
      console.log('✅ SSOProvider: User authenticated via schema-based SSO:', user.email);
    }
  }, [user, session, error]);

  return <>{children}</>;
}

/**
 * SSOProvider Component
 *
 * Handles schema-based SSO authentication initialization.
 * This replaces the SSO logic that was in App.tsx.
 */
export function SSOProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // Ensure this only runs on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render SSO provider when on client and supabase is available
  if (!isClient || !supabase) {
    return <>{children}</>;
  }

  return <SSOProviderInner>{children}</SSOProviderInner>;
}
