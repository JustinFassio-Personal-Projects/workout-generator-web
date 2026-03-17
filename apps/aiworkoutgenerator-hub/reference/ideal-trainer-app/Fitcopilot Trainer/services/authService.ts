/**
 * AuthService - Standard Supabase Authentication
 *
 * Multi-schema architecture: No SSO or postMessage needed
 * All apps (Hub, Trainer, Chef) share the same Supabase authentication
 */

import { supabase } from './dbService';

export const authService = {
  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Get the current session
   */
  async getCurrentSession() {
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!supabase) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  },
};
