'use client';

import React, { useState } from 'react';
import { Dumbbell, Home, LayoutList, Settings, User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { HUB_URL } from '../config/constants';

interface HeaderProps {
  onNewWorkout?: () => void;
  onShowHistory?: () => void;
  onOpenSettings: () => void;
  currentView?: 'generator' | 'history' | 'active-workout';
}

export const Header: React.FC<HeaderProps> = ({
  onNewWorkout,
  onShowHistory,
  onOpenSettings,
  currentView,
}) => {
  const { isSignedIn, signOut, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    router.push('/');
  };

  // Helper to check if we are on the home page
  const isHome = pathname === '/';

  return (
    <nav className='bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800'>
      <div className='max-w-4xl mx-auto px-4 py-4 flex justify-between items-center'>
        <div
          className='flex items-center gap-2 cursor-pointer'
          onClick={() => {
            if (onNewWorkout) onNewWorkout();
            if (!isHome) router.push('/');
          }}
        >
          <div className='bg-lime-500 p-2 rounded-lg transform hover:scale-110 transition-transform'>
            <Dumbbell className='text-slate-900 w-5 h-5' />
          </div>
          <span className='text-xl font-bold text-white tracking-tight hidden sm:inline'>
            Fit<span className='text-lime-400'>copilot</span>{' '}
            <span className='text-white font-light'>Trainer</span>
          </span>
        </div>

        <div className='flex items-center gap-2 md:gap-4'>
          <a
            href={HUB_URL}
            className='text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-2 px-3 py-2 rounded-lg'
          >
            <Home className='w-4 h-4' /> <span className='hidden sm:inline'>Hub</span>
          </a>

          {/* Only show History button if we are on the home page and the callback is provided */}
          {isHome && onShowHistory && (
            <button
              onClick={onShowHistory}
              className={`text-sm font-medium transition-colors flex items-center gap-2 px-3 py-2 rounded-lg ${currentView === 'history' ? 'bg-slate-800 text-lime-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <LayoutList className='w-4 h-4' /> <span className='hidden sm:inline'>History</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className='text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/50 transition-colors'
          >
            <Settings className='w-5 h-5' />
          </button>

          <div className='relative'>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSignedIn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}
            >
              {isSignedIn ? (
                <span className='text-xs font-bold text-white'>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              ) : (
                <User className='w-4 h-4 text-slate-400' />
              )}
            </button>

            {isMenuOpen && (
              <div className='absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-50'>
                {isSignedIn ? (
                  <>
                    <Link
                      href='/account'
                      className='flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white'
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className='w-4 h-4' /> Account
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className='w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300'
                    >
                      <LogOut className='w-4 h-4' /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href='/account'
                    className='flex items-center gap-2 px-4 py-2 text-sm text-lime-400 hover:bg-slate-800 hover:text-lime-300'
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LogIn className='w-4 h-4' /> Sign In
                  </Link>
                )}
              </div>
            )}

            {/* Overlay to close menu when clicking outside */}
            {isMenuOpen && (
              <div
                className='fixed inset-0 z-40 bg-transparent'
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
