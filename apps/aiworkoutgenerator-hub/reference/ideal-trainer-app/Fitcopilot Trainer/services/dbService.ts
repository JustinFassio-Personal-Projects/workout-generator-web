import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  WorkoutPlan,
  WorkoutSection,
  Exercise,
  UserProfile,
  TrainerType,
  HubProfile,
  TrainerProfile,
  ChefExportSummary,
} from '../types';

// Extend Window interface for type-safe Supabase client caching
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient;
  }
}

// Database record types matching new Schema
interface WorkoutRecord {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  trainer_notes: string;
  total_duration: number;
  estimated_calories: number;
  created_at: string;
  trainer_type?: string | null;
  focus?: string | null;
}

interface WorkoutExerciseRecord {
  id: string;
  workout_id: string;
  exercise_id?: string | null;
  name: string;
  section_type: string;
  muscle_target: string;
  sets_count: number;
  tempo?: string | null;
  cues?: string[];
  detailed_instructions?: string | null;
  set_details?: any[]; // JSONB
  order_index: number;
}

// Robust helper to find environment variables
export const getEnvVar = (key: string): string | undefined => {
  try {
    // Next.js uses process.env for client-accessible variables (NEXT_PUBLIC_*)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    /* ignore */
  }
  // Note: import.meta.env is not available in Next.js - removed Vite fallback
  return undefined;
};

// Configuration
// Next.js replaces NEXT_PUBLIC_* variables at build time
// Must access process.env.NEXT_PUBLIC_* directly for Next.js to replace them
// Using direct access ensures Next.js can statically replace these at build time
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  getEnvVar('SUPABASE_URL') ||
  undefined;

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_KEY') ||
  undefined;

let supabase: SupabaseClient | null = null;

// Only initialize Supabase on the client side to avoid SSR issues
if (typeof window !== 'undefined') {
  if (!SUPABASE_URL) {
    console.error(
      '❌ Supabase URL is not set. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file.',
    );
  } else if (!SUPABASE_KEY) {
    console.error(
      '❌ Supabase anon key is not set. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
    );
  } else {
    // Prevent multiple Supabase client instances (fixes GoTrueClient warning)
    if (window.__supabaseClient) {
      supabase = window.__supabaseClient;
      console.log('♻️ Reusing existing Supabase client instance');
    } else {
      try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
          db: { schema: 'public' },
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
          },
        });
        // Store in window to reuse on HMR reload
        window.__supabaseClient = supabase;
        console.log('✅ Supabase initialized connected to:', SUPABASE_URL);
      } catch (error) {
        console.error('❌ Error initializing Supabase client:', error);
      }
    }
  }
}

export { supabase };

/**
 * Verifies that the database connection is working.
 * Note: RLS policies require authentication, so we skip table verification
 * if the user is not authenticated yet.
 */
export const verifyDatabaseSchema = async (): Promise<{ success: boolean; message: string }> => {
  if (!supabase) return { success: false, message: 'Client not initialized' };

  try {
    // Check if user is authenticated first
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // User not authenticated yet - skip table verification
      // This is normal during app initialization
      console.log('⏳ Database verification skipped - user not authenticated yet');
      return { success: true, message: 'Database client initialized (auth pending)' };
    }

    // User is authenticated - verify tables
    const { error: workoutsError } = await supabase
      .schema('trainer')
      .from('workouts')
      .select('id')
      .limit(1);

    if (workoutsError) {
      // 42P01 = table doesn't exist
      if (workoutsError.code === '42P01') {
        return { success: false, message: 'Workouts Table Missing. Run Migration.' };
      }
      // PGRST301 = JWT expired (ignore, will be handled by auth refresh)
      if (workoutsError.code === 'PGRST301') {
        return { success: true, message: 'Database connected (token refresh needed)' };
      }
      console.warn('Database verification warning:', workoutsError);
      // Don't fail on other errors during verification
      return { success: true, message: 'Database client initialized' };
    }

    return { success: true, message: 'Database schema verified' };
  } catch (e: unknown) {
    console.error('Database verification error:', e);
    // Don't fail app initialization on verification errors
    return { success: true, message: 'Database client initialized' };
  }
};

/**
 * Fetches user profile data from the shared public.profiles table
 * Note: This table is managed by the Hub app. If it doesn't exist yet,
 * we return default values and let the user set up their profile.
 */
const getHubProfile = async (userId: string): Promise<HubProfile> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Check session availability - require authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    console.warn('⚠️ No active session - cannot fetch profile without authentication');
    // Return minimal profile structure - no seed data
    return {
      id: userId,
      age: 0,
      gender: '',
      weight: 0,
      height: 0,
      units: 'standard',
      goals: [],
    };
  }

  console.log(`📊 Fetching user profile from database for ${userId}`);

  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .select('id, age, gender, weight, height, preferred_units, fitness_goals')
    .eq('id', userId)
    .single();

  if (error) {
    // Handle table not found (Hub hasn't created it yet)
    if (error.code === '42P01' || error.code === 'PGRST204') {
      console.warn(
        '⚠️ Hub profiles table not found. Using defaults. (Table will be created by Hub app)',
      );
    } else if (error.code === 'PGRST116') {
      // No rows returned - user doesn't have a profile yet
      console.log(`ℹ️ No Hub profile found for user ${userId}, using defaults`);
    } else {
      console.error('Error fetching user profile from database:', error);
    }

    // Return minimal profile structure for error cases - no seed data
    return {
      id: userId,
      age: 0,
      gender: '',
      weight: 0,
      height: 0,
      units: 'standard',
      goals: [],
    };
  }

  if (!data) {
    console.log(`No profile found for user ${userId} - user needs to set up profile`);
    // Return minimal profile structure - no seed data
    return {
      id: userId,
      age: 0,
      gender: '',
      weight: 0,
      height: 0,
      units: 'standard',
      goals: [],
    };
  }

  console.log('✅ User profile loaded from database:', data.id);

  // Map database fields to HubProfile format
  const preferredUnits = (data.preferred_units as Record<string, string>) || {};
  const fitnessGoals = (data.fitness_goals as string[]) || [];

  return {
    id: data.id,
    age: data.age || 0,
    gender: data.gender || '',
    weight: data.weight ? Number(data.weight) : 0,
    height: data.height ? Number(data.height) : 0,
    units: preferredUnits.weight === 'kg' ? 'metric' : 'standard',
    goals: fitnessGoals,
  };
};

/**
 * Retrieves the user profile (combining Hub and Trainer data).
 * Returns null if no profile exists in the database (neither Hub profile nor Trainer profile).
 * Returns a profile object if at least one profile exists (even if it has empty/null values).
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!supabase) return null;

  try {
    // Check session availability - require authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.warn('⚠️ No active session - cannot fetch profile without authentication');
      return null;
    }

    // 1. Check if Hub profile exists in public.profiles
    const { data: hubData, error: hubError } = await supabase
      .schema('public')
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // 2. Check if Trainer profile exists in trainer.trainer_profiles
    const { data: trainerData, error: trainerError } = await supabase
      .schema('trainer')
      .from('trainer_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Handle schema/table not found errors (database not set up) - treat as "no profile"
    const hubTableExists = !hubError || (hubError.code !== '42P01' && hubError.code !== 'PGRST204');
    const trainerTableExists =
      !trainerError ||
      (trainerError.code !== '42P01' &&
        trainerError.code !== 'PGRST204' &&
        trainerError.code !== '3F000');

    // If tables don't exist, we can't check for profiles - return null
    if (!hubTableExists && !trainerTableExists) {
      console.warn('⚠️ Profile tables not found - database may not be set up');
      return null;
    }

    // Check if any profile exists
    const hubProfileExists = hubData !== null && hubTableExists;
    const trainerProfileExists = trainerData !== null && trainerTableExists;

    // If neither profile exists, return null (user needs to set up profile)
    if (!hubProfileExists && !trainerProfileExists) {
      console.log(`ℹ️ No profile found for user ${userId} - user needs to set up profile`);
      return null;
    }

    // 3. Fetch full Hub/shared data from public.profiles
    const hubProfile = await getHubProfile(userId);

    // 4. Fetch full Trainer Spoke Data (from trainer schema)
    const { data: fullTrainerData, error: fullTrainerError } = await supabase
      .schema('trainer')
      .from('trainer_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fullTrainerError && fullTrainerError.code !== 'PGRST116') {
      // Log non-"not found" errors
      if (
        fullTrainerError.code !== '42P01' &&
        fullTrainerError.code !== 'PGRST204' &&
        fullTrainerError.code !== '3F000'
      ) {
        console.error('Error fetching trainer profile:', fullTrainerError);
      }
    }

    // Default Trainer Data if missing - no seed data
    const trainerProfile: TrainerProfile = {
      fitnessLevel: fullTrainerData?.fitness_level || '',
      injuries: fullTrainerData?.injuries || [],
      medicalConditions: fullTrainerData?.medical_conditions || [],
      equipmentAccess: fullTrainerData?.equipment_access || [],
      preferredWorkoutStyles: fullTrainerData?.preferred_workout_styles || [],
    };

    // Merge and return profile (at least one profile exists)
    return {
      ...hubProfile,
      ...trainerProfile,
    };
  } catch (e) {
    console.error('Unexpected error fetching profile:', e);
    return null;
  }
};

/**
 * Saves/Updates the user profile.
 * Updates both trainer-specific data (trainer schema) and shared Hub data (public schema).
 */
export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<boolean> => {
  if (!supabase) return false;

  try {
    // Map to 'trainer_profiles' columns
    const trainerData = {
      id: userId,
      updated_at: new Date().toISOString(),
      fitness_level: profile.fitnessLevel,
      injuries: profile.injuries,
      medical_conditions: profile.medicalConditions,
      equipment_access: profile.equipmentAccess,
      preferred_workout_styles: profile.preferredWorkoutStyles,
    };

    // 1. Save trainer-specific data to trainer schema
    const { error: trainerError } = await supabase
      .schema('trainer')
      .from('trainer_profiles')
      .upsert(trainerData, { onConflict: 'id' });

    if (trainerError) {
      console.error('Error saving trainer profile:', trainerError);
      return false;
    }

    // 2. Save Hub/shared data to public.user_profiles
    const hubData = {
      id: userId,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender,
      fitness_goals: profile.goals || [],
      preferred_units: {
        weight: profile.units === 'metric' ? 'kg' : 'lb',
        height: profile.units === 'metric' ? 'cm' : 'in',
        distance: profile.units === 'metric' ? 'km' : 'mi',
      },
      updated_at: new Date().toISOString(),
    };

    const { error: hubError } = await supabase
      .schema('public')
      .from('profiles')
      .upsert(hubData, { onConflict: 'id' });

    if (hubError) {
      console.error('Error saving to Hub user_profiles:', hubError);
      // Don't fail completely - trainer data was saved
      console.warn('⚠️ Trainer data saved, but Hub profile update failed');
      return true; // Partial success
    }

    console.log('✅ Profile saved to both trainer and Hub schemas');
    return true;
  } catch (e) {
    console.error('Unexpected error saving profile:', e);
    return false;
  }
};

/**
 * Saves or Updates a workout plan to the Supabase database.
 */
export const saveWorkoutToDb = async (
  workout: WorkoutPlan,
  userId: string,
): Promise<string | null> => {
  if (!supabase) return null;

  // CRITICAL: Verify session before attempting save
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.error('❌ Cannot save workout - no active session');
    console.warn('⚠️ Attempted to save workout without authentication');
    return null;
  }

  console.log('✅ Session verified, saving workout:', workout.title);

  try {
    let workoutId: string | null = workout.id || null;
    const safeFocus = workout.focus || workout.trainerType || workout.title || 'General Fitness';

    // 1. Upsert Workout Definition
    const payload = {
      user_id: userId,
      title: workout.title,
      description: workout.description,
      difficulty: workout.difficulty,
      trainer_notes: workout.trainerNotes,
      total_duration: workout.totalDuration || 60,
      estimated_calories: workout.estimatedCalories,
      created_at: workout.createdAt || new Date().toISOString(),
      trainer_type: workout.trainerType || null,
      focus: safeFocus,
    };

    let data;
    let error;

    if (workoutId) {
      // Update
      const res = await supabase
        .schema('trainer')
        .from('workouts')
        .update(payload)
        .eq('id', workoutId)
        .select('id')
        .single();
      data = res.data;
      error = res.error;
    } else {
      // Insert
      const res = await supabase
        .schema('trainer')
        .from('workouts')
        .insert([payload])
        .select('id')
        .single();
      data = res.data;
      error = res.error;
    }

    if (error || !data) {
      console.error('Error saving workout definition:', error);
      throw error || new Error('No data returned');
    }
    workoutId = data.id || null;

    // 2. Handle Exercises (Delete old, insert new)
    if (workoutId) {
      await supabase
        .schema('trainer')
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);
    }

    const exercisesToInsert: any[] = [];
    let orderIndex = 0;

    workout.sections.forEach((section) => {
      section.exercises.forEach((exercise) => {
        exercisesToInsert.push({
          workout_id: workoutId,
          // exercise_id: exercise.id || null, // If we had library IDs
          name: exercise.name,
          section_type: section.type,
          muscle_target: exercise.muscleTarget,
          sets_count: exercise.sets,
          tempo: exercise.tempo || null,
          cues: exercise.cues || [],
          detailed_instructions: exercise.detailedInstructions || null,
          set_details: exercise.setDetails || [],
          order_index: orderIndex++,
        });
      });
    });

    const { error: exError } = await supabase
      .schema('trainer')
      .from('workout_exercises')
      .insert(exercisesToInsert);
    if (exError) {
      console.error('Error saving exercises:', exError);
      throw exError;
    }

    console.log('✅ Workout successfully saved/updated. ID:', workoutId);
    return workoutId;
  } catch (error: unknown) {
    console.error('Critical error saving to Supabase:', error);
    return null;
  }
};

/**
 * Fetches all workouts for a user
 */
export const getUserWorkouts = async (userId: string): Promise<WorkoutPlan[]> => {
  if (!supabase) return [];

  try {
    // Fetch Workouts (from trainer schema)
    const { data: workoutsData, error: workoutsError } = await supabase
      .schema('trainer')
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (workoutsError) throw workoutsError;
    if (!workoutsData || workoutsData.length === 0) return [];

    const workoutIds = workoutsData.map((w) => w.id);

    // Fetch Exercises (from trainer schema)
    const { data: exercisesData, error: exercisesError } = await supabase
      .schema('trainer')
      .from('workout_exercises')
      .select('*')
      .in('workout_id', workoutIds)
      .order('order_index', { ascending: true });

    if (exercisesError) throw exercisesError;

    // Map to WorkoutPlan
    return workoutsData.map((w: WorkoutRecord) => {
      const planExercises = ((exercisesData || []) as WorkoutExerciseRecord[]).filter(
        (e) => e.workout_id === w.id,
      );

      const sectionMap = new Map<string, Exercise[]>();
      const sectionTypes = ['Warmup', 'Main Workout', 'Cooldown', 'Finisher'];

      planExercises.forEach((e) => {
        const exObj: Exercise = {
          id: e.exercise_id || undefined,
          name: e.name,
          muscleTarget: e.muscle_target,
          sets: e.sets_count,
          tempo: e.tempo || undefined,
          cues: e.cues || [],
          detailedInstructions: e.detailed_instructions || undefined,
          setDetails: (e.set_details || []).map((s: any) => ({
            ...s,
            reps: s.reps?.toString(),
          })),
        };

        const currentList = sectionMap.get(e.section_type) || [];
        currentList.push(exObj);
        sectionMap.set(e.section_type, currentList);
      });

      const sections: WorkoutSection[] = [];
      sectionTypes.forEach((type) => {
        if (sectionMap.has(type)) {
          sections.push({
            type: type as any,
            durationEstimate: 'N/A',
            exercises: sectionMap.get(type)!,
          });
        }
      });

      return {
        id: w.id,
        title: w.title,
        description: w.description,
        difficulty: w.difficulty,
        trainerNotes: w.trainer_notes,
        totalDuration: w.total_duration,
        estimatedCalories: w.estimated_calories,
        createdAt: w.created_at,
        trainerType: w.trainer_type as TrainerType | undefined,
        focus: w.focus || undefined,
        sections: sections,
      };
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
};

export const deleteWorkout = async (workoutId: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.schema('trainer').from('workouts').delete().eq('id', workoutId);
  if (error) {
    console.error('Error deleting workout:', error);
    return false;
  }
  return true;
};

export const getWorkoutById = async (workoutId: string): Promise<WorkoutPlan | null> => {
  if (!supabase) return null;

  try {
    const { data: workoutData, error: workoutError } = await supabase
      .schema('trainer')
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single();

    if (workoutError) return null;
    if (!workoutData) return null;

    const { data: exercisesData } = await supabase
      .schema('trainer')
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    // ... Reuse mapping logic (simplified for brevity) ...
    // Copy-paste mapping from getUserWorkouts or refactor into helper
    const sectionMap = new Map<string, Exercise[]>();
    const sectionTypes = ['Warmup', 'Main Workout', 'Cooldown', 'Finisher'];

    ((exercisesData as WorkoutExerciseRecord[]) || []).forEach((e) => {
      const exObj: Exercise = {
        id: e.exercise_id || undefined,
        name: e.name,
        muscleTarget: e.muscle_target,
        sets: e.sets_count,
        tempo: e.tempo || undefined,
        cues: e.cues || [],
        detailedInstructions: e.detailed_instructions || undefined,
        setDetails: (e.set_details || []).map((s: any) => ({
          ...s,
          reps: s.reps?.toString(),
        })),
      };
      const currentList = sectionMap.get(e.section_type) || [];
      currentList.push(exObj);
      sectionMap.set(e.section_type, currentList);
    });

    const sections: WorkoutSection[] = [];
    sectionTypes.forEach((type) => {
      if (sectionMap.has(type)) {
        sections.push({
          type: type as any,
          durationEstimate: 'N/A',
          exercises: sectionMap.get(type)!,
        });
      }
    });

    return {
      id: workoutData.id,
      title: workoutData.title,
      description: workoutData.description,
      difficulty: workoutData.difficulty,
      trainerNotes: workoutData.trainer_notes,
      totalDuration: workoutData.total_duration,
      estimatedCalories: workoutData.estimated_calories,
      createdAt: workoutData.created_at,
      trainerType: workoutData.trainer_type as TrainerType | undefined,
      focus: workoutData.focus || undefined,
      sections: sections,
    };
  } catch (error) {
    console.error('Error fetching workout by ID:', error);
    return null;
  }
};

/**
 * Queues a workout summary for export to the Chef app.
 */
export const queueWorkoutForChef = async (
  userId: string,
  historyId: string, // We need a history ID to link to
  summary: ChefExportSummary,
): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase.schema('trainer').from('chef_export_queue').insert({
      user_id: userId,
      workout_history_id: historyId,
      status: 'pending',
      payload: summary,
    });

    if (error) {
      console.error('Error queuing for Chef:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error queuing for Chef:', e);
    return false;
  }
};
