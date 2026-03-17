import { useEffect, useState } from 'react';
import { supabase } from '../services/dbService';
import { syncProfileToHub } from '../services/hubSync';
import type { User, Session } from '@supabase/supabase-js';

/**
 * useAuth Hook - Standard Supabase Authentication
 *
 * Multi-schema architecture: No SSO needed
 * All apps (Hub, Trainer, Chef) share the same Supabase authentication
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.warn('⚠️ useAuth: Supabase client not initialized');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Sync on initial load if user exists
        if (session?.user) {
          syncProfileToHub(session.user);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('❌ useAuth: Error getting session:', error);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Sync to Hub on sign in
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await syncProfileToHub(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    session,
    loading,
    isSignedIn: !!user,
    signIn,
    signUp,
    signOut,
  };
}
