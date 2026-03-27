/**
 * Admin-scoped AppContext: user, session, isAdmin, handleLogout.
 * Trimmed from programs AppContext for admin-dash-astro only.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { setAuthCookie } from '@/lib/auth-cookie';

export interface AdminUser {
  uid: string;
  email?: string | null;
  displayName?: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

interface AppContextType {
  user: AdminUser | null;
  session: Session | null;
  isAdmin: boolean;
  /** True after first auth state sync (session + sb-access-token cookie). Routes should wait to avoid 401 on API calls. */
  authHydrated: boolean;
  setProfile: (p: AdminUser | null) => void;
  handleLogout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);

  const fetchProfile = useCallback(async (userId: string, email?: string, userMetadata?: Record<string, unknown>) => {
    try {
      const adminUsersResult = await supabase.from('admin_users').select('id').eq('id', userId).single();
      const isAdmin = !adminUsersResult.error && !!adminUsersResult.data;

      // Use only auth user_metadata for display; do not query profiles (table may not exist in this project)
      const meta = userMetadata ?? {};
      const displayName = (meta.full_name as string) ?? (meta.name as string);
      const avatarUrl = (meta.avatar_url as string) ?? (meta.picture as string);

      setUser({
        uid: userId,
        email: email ?? null,
        displayName: displayName ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        isAdmin,
      });
    } catch (err) {
      if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
        console.error('Profile fetch failed', err);
      }
      const adminUsersResult = await supabase.from('admin_users').select('id').eq('id', userId).single();
      const isAdmin = !adminUsersResult.error && !!adminUsersResult.data;
      setUser({
        uid: userId,
        email: email ?? null,
        isAdmin,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setAuthCookie(session);
      setAuthHydrated(true);
      if (session?.user) {
        void fetchProfile(
          session.user.id,
          session.user.email ?? undefined,
          session.user.user_metadata as Record<string, unknown> | undefined
        );
      } else {
        setUser(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setAuthCookie(session);
      setAuthHydrated(true);
      if (session?.user) {
        void fetchProfile(
          session.user.id,
          session.user.email ?? undefined,
          session.user.user_metadata as Record<string, unknown> | undefined
        );
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        session,
        isAdmin: !!user?.isAdmin,
        authHydrated,
        setProfile: setUser,
        handleLogout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
