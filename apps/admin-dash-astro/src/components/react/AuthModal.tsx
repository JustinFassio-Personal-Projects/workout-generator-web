/**
 * Admin login modal: email/password only. On success, sets cookie and redirects to /admin.
 */
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { adminPaths } from '@/lib/admin/config';
import { setAuthCookie } from '@/lib/auth-cookie';

function getRedirectTarget(): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const redirect = q.get('redirect');
  if (!redirect || !redirect.startsWith('/admin') || redirect.includes('//')) return null;
  return redirect;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;

      if (data.user) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('id', data.user.id)
          .single();

        if (adminUser) {
          if (data.session) setAuthCookie(data.session);
          const target = getRedirectTarget() ?? adminPaths.root;
          window.location.href = target;
          return;
        }
      }
      setError('Your account does not have admin access.');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('Invalid login credentials') || raw.includes('invalid_grant')) {
        setError('Wrong email or password.');
      } else if (raw.includes('Email not confirmed')) {
        setError('Please confirm your email using the link we sent you.');
      } else if (raw.includes('Too many requests')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#ffbf00]/30 bg-[#0d0500] p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-6 text-xl font-bold text-white">Admin Login</h3>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm text-white/70">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-[#ffbf00]/50"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm text-white/70">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-[#ffbf00]/50"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#ffbf00] py-2 font-semibold text-black disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
