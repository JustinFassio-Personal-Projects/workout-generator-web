/**
 * Admin login gate: shows "Admin Login", opens AuthModal when unauthenticated,
 * redirects to /admin after successful admin login. Uses Supabase Auth.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { adminPaths } from '@/lib/admin/config';
import { setAuthCookie } from '@/lib/auth-cookie';

const AdminLoginGate: React.FC = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setCheckingAdmin(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (checkingAdmin) return;
    if (!user && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('showAuthModal'));
    }
  }, [user, checkingAdmin]);

  useEffect(() => {
    if (!user) return;

    const goAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (adminUser) {
        setAuthCookie(session);
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const redirect = params?.get('redirect');
        const target =
          redirect && redirect.startsWith('/admin') && !redirect.includes('//') ? redirect : adminPaths.root;
        window.location.href = target;
      }
    };
    goAdmin();
  }, [user]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold text-white md:text-3xl">Admin Login</h1>
      <p className="mt-2 text-white/80">Please sign in to continue.</p>
      {!user && (
        <p className="mt-4 text-sm text-white/60">
          The sign-in modal should open automatically. If it doesn&apos;t, try refreshing.
        </p>
      )}
    </div>
  );
};

export default AdminLoginGate;
