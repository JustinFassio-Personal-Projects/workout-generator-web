'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication. Redirects to /account (login page)
 * if user is not authenticated. Shows loading state while checking authentication.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && (!user || !user.id)) {
      router.replace('/account');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center'>
        <div className='bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full animate-in fade-in duration-700'>
          <Loader2 className='w-12 h-12 text-lime-500 animate-spin mx-auto mb-6' />
          <h2 className='text-2xl font-bold text-white mb-2'>Checking Authentication...</h2>
          <p className='text-slate-400 text-sm'>Please wait...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (show nothing while redirecting)
  if (!user || !user.id) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center'>
        <div className='bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full'>
          <Loader2 className='w-12 h-12 text-lime-500 animate-spin mx-auto mb-6' />
          <h2 className='text-2xl font-bold text-white mb-2'>Redirecting...</h2>
          <p className='text-slate-400 text-sm'>Please wait...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};
