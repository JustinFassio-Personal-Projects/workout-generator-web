'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileSetup } from './ProfileSetup';
import { DailyCheckIn } from './DailyCheckIn';
import { WorkoutDisplay } from './WorkoutDisplay';
import { WorkoutHistory } from './WorkoutHistory';
import { Header } from './Header';
import { generateWorkout, updateGeminiApiKey, getGeminiApiKey } from '../services/geminiService';
import {
  verifyDatabaseSchema,
  getUserProfile,
  saveUserProfile,
  getWorkoutById,
  supabase,
} from '../services/dbService';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, DailyContext, TrainerType, WorkoutPlan } from '../types';
import { AlertTriangle, Loader2, X, Key } from 'lucide-react';

// Auth events that trigger user data loading
const AUTH_EVENTS_TO_LOAD: readonly string[] = ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'];

type View = 'generator' | 'history' | 'active-workout';
type DbStatus = 'checking' | 'connected' | 'error';

export const Home: React.FC = () => {
  const router = useRouter();

  // Use the useAuth hook for authentication
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('generator');

  // Database Status State
  const [dbStatus, setDbStatus] = useState<DbStatus>('checking');
  const [dbMessage, setDbMessage] = useState<string>('Connecting...');

  // Settings / API Key State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Track URL parameters and load attempts to prevent duplicate loads
  const urlWorkoutIdRef = useRef<string | null>(null);
  const urlViewRef = useRef<string | null>(null);
  const hasAttemptedUrlLoad = useRef(false);
  const isLoadingDataRef = useRef(false);

  // Helper to load data for a specific user ID
  const loadDataForUser = useCallback(async (uid: string) => {
    // Prevent concurrent executions to avoid race conditions
    if (isLoadingDataRef.current) {
      console.log('⏳ Data load already in progress, skipping duplicate call');
      return;
    }

    isLoadingDataRef.current = true;

    try {
      // Verify session exists before querying database
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏳ Waiting for Supabase session establishment...');
        setDbStatus('checking');
        setDbMessage('Waiting for authentication...');
        return; // Don't query database without session
      }

      console.log('✅ Session verified, proceeding with database queries');

      // 1. Verify DB
      const result = await verifyDatabaseSchema();
      if (result.success) {
        setDbStatus('connected');
        setDbMessage(result.message);

        // 2. Fetch Profile from DB
        const fetchedProfile = await getUserProfile(uid);
        if (fetchedProfile) {
          console.log('Profile loaded from DB for user:', uid, fetchedProfile);
          setProfile(fetchedProfile);
        } else {
          console.log('No profile found in DB, user needs to set up profile.');
          // Don't set seed data - profile remains null until user creates one
        }
      } else {
        setDbStatus('error');
        setDbMessage(result.message);
      }
    } finally {
      isLoadingDataRef.current = false;
    }
  }, []);

  // Handler to load workout plan into view
  const handleLoadWorkout = useCallback((plan: WorkoutPlan) => {
    console.log('💪 [TRAINER] handleLoadWorkout called with plan:', plan.title, plan.id);
    setWorkoutPlan(plan);
    console.log('💪 [TRAINER] Setting view to active-workout');
    setCurrentView('active-workout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('💪 [TRAINER] Workout loaded and displayed');
  }, []);

  // Schema-based SSO handles authentication via URL tokens
  // All apps share the same Supabase auth - no cross-app communication required

  // Redirect to /account if not authenticated
  // Note: ProtectedRoute also handles this redirect, but this provides an additional safeguard
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('🔐 No authenticated user - redirecting to /account');
      router.push('/account');
    }
  }, [user, authLoading, router]);

  // Load data when user ID is available (from useAuth hook)
  useEffect(() => {
    if (currentUserId && !authLoading) {
      console.log('Loading data for User ID:', currentUserId);
      loadDataForUser(currentUserId);
    }
  }, [currentUserId, authLoading, loadDataForUser]);

  // Listen for session state changes and reload data when session is established
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, !!session);

      // When session is established or refreshed, load user data
      // Use session.user.id directly to avoid race condition with React state
      if (AUTH_EVENTS_TO_LOAD.includes(event) && session?.user?.id) {
        console.log('✅ Session established/refreshed, loading user data for:', session.user.id);
        loadDataForUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadDataForUser]);

  // Initialize API Key from localStorage
  useEffect(() => {
    setTempApiKey(getGeminiApiKey() || '');
  }, []);

  // 5. Extract URL parameters once on mount (only runs once)
  useEffect(() => {
    // Use window.location.search for client-side URL params
    const urlParams = new URLSearchParams(window.location.search);
    const workoutId = urlParams.get('workout');
    const view = urlParams.get('view');

    urlWorkoutIdRef.current = workoutId;
    urlViewRef.current = view;

    console.log('🔗 [EXTERNAL TRAINER] Extracted URL parameters:', {
      workoutId,
      view,
      fullSearch: window.location.search,
      fullUrl: window.location.href,
    });

    // Handle view parameter immediately (show history if no workout ID)
    if (view === 'workouts' && !workoutId) {
      console.log('🔗 [EXTERNAL TRAINER] URL parameter detected - showing workout history');
      setCurrentView('history');
    }
  }, []); // Only run once on mount - URL params are static

  // 6. Load workout from URL when app is initialized
  // This effect only runs when initialization state changes, not when URL changes
  useEffect(() => {
    const workoutId = urlWorkoutIdRef.current;

    // Only proceed if we have a workout ID and haven't attempted to load it yet
    if (!workoutId || hasAttemptedUrlLoad.current) {
      return;
    }

    console.log('🔗 [EXTERNAL TRAINER] Checking initialization state for workout load:', {
      workoutId,
      currentUserId,
      dbStatus,
      hasAttemptedLoad: hasAttemptedUrlLoad.current,
    });

    // Check if app is initialized
    if (!currentUserId) {
      console.log('🔗 [EXTERNAL TRAINER] Waiting for user ID initialization...');
      return;
    }

    // Check if database is ready (connected or checking is fine, error means we can't load)
    if (dbStatus === 'error') {
      console.warn('🔗 [EXTERNAL TRAINER] Database error - cannot load workout');
      hasAttemptedUrlLoad.current = true; // Mark as attempted to prevent retry loops
      return;
    }

    // If database is still checking, the effect will re-run when dbStatus changes
    if (dbStatus === 'checking') {
      console.log('🔗 [EXTERNAL TRAINER] Waiting for database connection...');
      return;
    }

    // App is initialized and database is ready (connected)
    console.log('🔗 [EXTERNAL TRAINER] App initialized, loading workout from URL');
    hasAttemptedUrlLoad.current = true; // Mark as attempted to prevent duplicate loads

    // Load workout inline to avoid callback dependency
    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const workout = await getWorkoutById(workoutId);
        if (workout) {
          console.log('✅ [EXTERNAL TRAINER] Workout loaded successfully:', workout.title);
          handleLoadWorkout(workout);
        } else {
          console.warn('⚠️ [EXTERNAL TRAINER] Workout not found:', workoutId);
          setError(`Workout not found: ${workoutId}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load workout';
        console.error('❌ [EXTERNAL TRAINER] Error loading workout:', err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUserId, dbStatus, handleLoadWorkout]); // Only depend on initialization state and stable handlers

  const handleSaveApiKey = () => {
    updateGeminiApiKey(tempApiKey);
    setIsSettingsOpen(false);
    // Clear any previous error if they are fixing it
    if (error?.includes('API key')) {
      setError(null);
    }
  };

  const handleProfileSave = async (updatedProfile: UserProfile) => {
    if (!currentUserId) return;

    // 1. Optimistic UI update
    setProfile(updatedProfile);

    // 2. Save to DB
    const success = await saveUserProfile(currentUserId, updatedProfile);
    if (success) {
      console.log('Profile saved to DB successfully');
    }
  };

  // Create minimal profile structure when user starts setting up profile
  const handleProfileInit = () => {
    if (!currentUserId) return;
    setProfile({
      id: currentUserId,
      age: 0,
      gender: '',
      weight: 0,
      height: 0,
      units: 'standard',
      fitnessLevel: 'Beginner', // Default to Beginner instead of empty string
      goals: [],
      injuries: [],
      medicalConditions: [],
      equipmentAccess: [],
      preferredWorkoutStyles: [],
    });
  };

  const handleGenerate = async (dailyContext: DailyContext, trainer: TrainerType) => {
    if (!profile) {
      setError('Please set up your profile before generating a workout.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setWorkoutPlan(null);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const plan = await generateWorkout(profile, dailyContext, trainer);
      setWorkoutPlan(plan);
      setCurrentView('active-workout');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate workout. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewWorkout = () => {
    setWorkoutPlan(null);
    setCurrentView('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Require authenticated user - no fallback to test user
  if (authLoading) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center'>
        <div className='bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full animate-in fade-in duration-700'>
          <Loader2 className='w-12 h-12 text-lime-500 animate-spin mx-auto mb-6' />
          <h2 className='text-2xl font-bold text-white mb-2'>Initializing...</h2>
          <p className='text-slate-400 text-sm'>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.id) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center'>
        <div className='bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full animate-in fade-in duration-700'>
          <AlertTriangle className='w-12 h-12 text-red-500 mx-auto mb-6' />
          <h2 className='text-2xl font-bold text-white mb-2'>Authentication Required</h2>
          <p className='text-slate-400 text-sm mb-6'>Please sign in to access the Trainer app.</p>
          <a
            href='/account'
            className='inline-block bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold py-3 px-6 rounded-lg transition-colors'
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 pb-20 relative'>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className='fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative'>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className='absolute top-4 right-4 text-slate-400 hover:text-white'
            >
              <X className='w-5 h-5' />
            </button>
            <div className='flex items-center gap-3 mb-4'>
              <div className='bg-lime-500/10 p-2 rounded-lg'>
                <Key className='w-6 h-6 text-lime-400' />
              </div>
              <h3 className='text-xl font-bold text-white'>API Configuration</h3>
            </div>
            <p className='text-slate-400 text-sm mb-4'>
              Enter your Gemini API Key manually. This will override the default configuration and
              persist in your browser.
            </p>
            <input
              type='text'
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder='AIzaSy...'
              className='w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mb-4 focus:border-lime-500 outline-none font-mono text-sm'
            />
            <button
              onClick={handleSaveApiKey}
              className='w-full bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold py-3 rounded-lg transition-colors'
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Show loading while checking authentication or redirecting */}
      {!user || authLoading ? (
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4 text-lime-500' />
            <p className='text-slate-400'>
              {authLoading ? 'Checking authentication...' : 'Redirecting to login...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <Header
            onNewWorkout={handleNewWorkout}
            onShowHistory={() => setCurrentView('history')}
            onOpenSettings={() => setIsSettingsOpen(true)}
            currentView={currentView}
          />

          {/* Main Content */}
          <main className='max-w-4xl mx-auto px-4 py-8'>
            {/* DB Connection Status (Small Indicator) */}
            {dbStatus !== 'connected' && (
              <div className='mb-4 flex items-center justify-center gap-2 text-xs text-slate-500'>
                {dbStatus === 'checking' && <Loader2 className='w-3 h-3 animate-spin' />}
                {dbStatus === 'error' && <AlertTriangle className='w-3 h-3 text-red-500' />}
                {dbMessage}
              </div>
            )}

            {profile ? (
              <ProfileSetup profile={profile} onSave={handleProfileSave} />
            ) : (
              <div className='bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-6'>
                <div className='text-center'>
                  <h2 className='text-2xl font-bold text-white mb-2'>
                    Welcome to FitCopilot Trainer
                  </h2>
                  <p className='text-slate-400 mb-6'>
                    Set up your profile to get started with personalized workout plans.
                  </p>
                  <button
                    onClick={handleProfileInit}
                    className='bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold py-3 px-6 rounded-lg transition-colors'
                  >
                    Set Up Profile
                  </button>
                </div>
              </div>
            )}

            {currentView === 'generator' && (
              <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
                <DailyCheckIn onSubmit={handleGenerate} isLoading={isLoading} />
                {error && (
                  <div className='mt-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3'>
                    <AlertTriangle className='w-5 h-5 shrink-0' />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            )}

            {currentView === 'active-workout' && workoutPlan && profile && currentUserId && (
              <WorkoutDisplay plan={workoutPlan} units={profile.units} userId={currentUserId} />
            )}

            {currentView === 'history' && currentUserId && (
              <WorkoutHistory userId={currentUserId} onLoadWorkout={handleLoadWorkout} />
            )}
          </main>
        </>
      )}
    </div>
  );
};
