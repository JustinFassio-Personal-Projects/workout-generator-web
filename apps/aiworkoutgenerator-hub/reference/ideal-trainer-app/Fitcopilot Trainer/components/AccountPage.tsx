'use client';

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Dumbbell, Loader2, Mail, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { HUB_URL } from '../config/constants';

export default function AccountPage() {
  const { user, signOut, signIn } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    try {
      await signIn(email, password);
      // Redirect to home after successful login
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4'>
        <div className='w-full max-w-md animate-in fade-in zoom-in duration-500'>
          {/* Logo Header */}
          <div className='text-center mb-8'>
            <div className='bg-lime-500 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-lime-900/50 mb-4 transform hover:scale-110 transition-transform'>
              <Dumbbell className='text-slate-900 w-10 h-10' />
            </div>
            <h1 className='text-3xl font-bold text-white tracking-tight'>
              Fit<span className='text-lime-400'>copilot</span>{' '}
              <span className='font-light'>Trainer</span>
            </h1>
            <p className='text-slate-400 mt-2'>Your AI-powered personal fitness coach.</p>
          </div>

          {/* Auth Card */}
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl'>
            <h2 className='text-xl font-bold text-white mb-6'>Welcome Back</h2>

            {/* Error Alert */}
            {error && (
              <div className='bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-start gap-3 mb-6'>
                <AlertTriangle className='w-5 h-5 text-red-400 shrink-0 mt-0.5' />
                <p className='text-red-400 text-sm'>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className='space-y-4'>
              {/* Email Field */}
              <div>
                <label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
                  Email Address
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-3.5 w-5 h-5 text-slate-500' />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className='w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:border-lime-500 outline-none transition-colors'
                    placeholder='trainer@example.com'
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
                  Password
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-3.5 w-5 h-5 text-slate-500' />
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className='w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:border-lime-500 outline-none transition-colors'
                    placeholder='••••••••'
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={isLoggingIn}
                className='w-full bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-lime-900/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2'
              >
                {isLoggingIn ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className='w-5 h-5' />
                  </>
                )}
              </button>
            </form>

            {/* New User Link */}
            <div className='mt-6 pt-6 border-t border-slate-800 text-center'>
              <p className='text-slate-400 text-sm'>
                New to FitCopilot?{' '}
                <a href={HUB_URL} className='text-lime-400 font-bold hover:underline'>
                  Sign up at the Hub
                </a>
              </p>
            </div>
          </div>

          {/* Back to Home Link */}
          <div className='mt-6 text-center'>
            <button
              onClick={() => router.push('/')}
              className='text-sm text-slate-500 hover:text-slate-300 transition-colors'
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8 max-w-2xl'>
      <h1 className='text-3xl font-bold mb-8 text-white'>Account</h1>

      {/* User Info Card */}
      <div className='bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mb-6 overflow-hidden'>
        <div className='p-6'>
          <h2 className='text-xl font-bold text-white mb-4'>Profile Information</h2>

          <div className='space-y-4 mt-4'>
            <div>
              <label className='block mb-1'>
                <span className='text-slate-400 font-semibold text-sm'>Email</span>
              </label>
              <div className='px-4 py-3 bg-slate-950 rounded-lg text-slate-200 border border-slate-800'>
                {user.email}
              </div>
            </div>
            <div>
              <label className='block mb-1'>
                <span className='text-slate-400 font-semibold text-sm'>User ID</span>
              </label>
              <div className='px-4 py-3 bg-slate-950 rounded-lg font-mono text-sm text-slate-500 border border-slate-800 break-all'>
                {user.id}
              </div>
            </div>
            <div>
              <label className='block mb-1'>
                <span className='text-slate-400 font-semibold text-sm'>Account Created</span>
              </label>
              <div className='px-4 py-3 bg-slate-950 rounded-lg text-slate-200 border border-slate-800'>
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
            <div>
              <label className='block mb-1'>
                <span className='text-slate-400 font-semibold text-sm'>Last Sign In</span>
              </label>
              <div className='px-4 py-3 bg-slate-950 rounded-lg text-slate-200 border border-slate-800'>
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className='bg-slate-900 border border-slate-800 rounded-2xl shadow-xl'>
        <div className='p-6'>
          <h2 className='text-xl font-bold text-white mb-2'>Session</h2>

          {error && (
            <div className='bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-4'>
              <span>{error}</span>
            </div>
          )}

          <div className='mt-4'>
            <p className='text-slate-400 mb-4'>Sign out of your account on this device.</p>
            <button
              className='bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <span className='w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin'></span>
                  Signing Out...
                </>
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Back to Home Link */}
      <div className='mt-6'>
        <button
          className='text-slate-400 hover:text-white transition-colors flex items-center gap-2'
          onClick={() => router.push('/')}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
