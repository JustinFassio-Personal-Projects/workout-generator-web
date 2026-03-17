-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trainer schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS trainer;

-- 1. Drop existing tables to start fresh (as requested)
DROP TABLE IF EXISTS trainer.chef_export_queue CASCADE;
DROP TABLE IF EXISTS trainer.workout_history_exercises CASCADE;
DROP TABLE IF EXISTS trainer.workout_history CASCADE;
DROP TABLE IF EXISTS trainer.workout_exercises CASCADE;
DROP TABLE IF EXISTS trainer.workout_templates CASCADE;
DROP TABLE IF EXISTS trainer.workouts CASCADE;
DROP TABLE IF EXISTS trainer.exercises CASCADE;
DROP TABLE IF EXISTS trainer.trainer_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE; -- Legacy table in public schema

-- 2. Trainer Profiles (Spoke specific data)
-- Hub handles: age, weight, height, gender, birthday
CREATE TABLE trainer.trainer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    fitness_level TEXT DEFAULT 'Intermediate',
    injuries TEXT[] DEFAULT '{}',
    medical_conditions TEXT[] DEFAULT '{}', -- Kept locally for safe workout generation context if needed, or could be in Hub. Plan says "injury history" is in Trainer.
    equipment_access TEXT[] DEFAULT '{}',
    preferred_workout_styles TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Exercise Library
CREATE TABLE trainer.exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    muscle_target TEXT,
    equipment_required TEXT[],
    description TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Workouts (Definitions)
CREATE TABLE trainer.workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT,
    trainer_notes TEXT,
    total_duration INTEGER, -- in minutes
    estimated_calories INTEGER,
    trainer_type TEXT, -- e.g., 'HIIT', 'Strength'
    focus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Workout Exercises (Details for a workout definition)
CREATE TABLE trainer.workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES trainer.workouts(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES trainer.exercises(id) ON DELETE SET NULL, -- Optional link to library
    name TEXT NOT NULL, -- Store name specifically in case library link is missing or custom
    section_type TEXT NOT NULL, -- 'Warmup', 'Main Workout', 'Cooldown', 'Finisher'
    muscle_target TEXT,
    sets_count INTEGER DEFAULT 3,
    tempo TEXT,
    cues TEXT[] DEFAULT '{}',
    detailed_instructions TEXT,
    set_details JSONB DEFAULT '[]', -- Store reps/weight targets as JSON
    order_index INTEGER DEFAULT 0
);

-- 6. Workout History (Completion Logs)
CREATE TABLE trainer.workout_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES trainer.workouts(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    calories_burned INTEGER,
    feeling_rating INTEGER, -- 1-10
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Workout History Exercises (Actual performance)
CREATE TABLE trainer.workout_history_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    history_id UUID REFERENCES trainer.workout_history(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    section_type TEXT,
    sets_completed INTEGER,
    performance_data JSONB DEFAULT '[]' -- Actual weights, reps, RPE per set
);

-- 8. Chef Export Queue
CREATE TABLE trainer.chef_export_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_history_id UUID REFERENCES trainer.workout_history(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'exported', 'failed'
    payload JSONB NOT NULL, -- { calories, intensity, muscle_groups, duration }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exported_at TIMESTAMP WITH TIME ZONE
);

-- 9. Workout Templates (Favorites/Saved)
CREATE TABLE trainer.workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_workout_id UUID REFERENCES trainer.workouts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Simple setup for now - assume authenticated user owns their data)
ALTER TABLE trainer.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.workout_history_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.chef_export_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer.workout_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own trainer profile" ON trainer.trainer_profiles
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Exercises are readable by everyone, writable by none (admin only in future)" ON trainer.exercises
    FOR SELECT USING (true);
-- Allow users to insert exercises if we want them to grow the library, otherwise restrict.
-- For now, let's allow authenticated users to add exercises for flexibility.
CREATE POLICY "Users can add exercises" ON trainer.exercises
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users manage their own workouts" ON trainer.workouts
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own workout exercises" ON trainer.workout_exercises
    USING (EXISTS (SELECT 1 FROM trainer.workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM trainer.workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid()));

CREATE POLICY "Users manage their own history" ON trainer.workout_history
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own history details" ON trainer.workout_history_exercises
    USING (EXISTS (SELECT 1 FROM trainer.workout_history WHERE id = workout_history_exercises.history_id AND user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM trainer.workout_history WHERE id = workout_history_exercises.history_id AND user_id = auth.uid()));

CREATE POLICY "Users manage their own export queue" ON trainer.chef_export_queue
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own templates" ON trainer.workout_templates
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
