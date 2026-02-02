-- Migration: Add metadata columns to deep_research for profile-based filtering
-- Additive only - no resets, existing rows remain valid

ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS equipment_zones TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS experience_levels TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS injuries_addressed TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS days_per_week_min INT;
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS days_per_week_max INT;
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS diet_types TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS nutrition_goals TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}';
ALTER TABLE deep_research ADD COLUMN IF NOT EXISTS macro_focus TEXT[] DEFAULT '{}';
