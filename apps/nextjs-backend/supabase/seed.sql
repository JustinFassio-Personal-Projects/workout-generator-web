-- Seed Data for Blog Schema
-- Description: Initial categories and authors based on data/blog/posts.ts
-- Run this after applying the migration to populate initial data

-- ============================================================================
-- CATEGORIES
-- ============================================================================
INSERT INTO categories (name, slug, description) VALUES
  ('Getting Started', 'getting-started', 'Articles to help beginners get started with their fitness journey'),
  ('Home Fitness', 'home-fitness', 'Tips and workouts for exercising at home'),
  ('Nutrition', 'nutrition', 'Nutrition advice and dietary guidance'),
  ('Training', 'training', 'Advanced training techniques and strategies'),
  ('Recovery', 'recovery', 'Recovery methods and rest day guidance')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- AUTHORS
-- ============================================================================
INSERT INTO authors (name, slug, bio) VALUES
  ('Fitness Team', 'fitness-team', 'Our expert fitness team dedicated to helping you achieve your goals'),
  ('Nutrition Expert', 'nutrition-expert', 'Certified nutritionist specializing in fitness nutrition'),
  ('Workout Generator Team', 'workout-generator-team', 'The team behind AI Workout Generator')
ON CONFLICT (slug) DO NOTHING;
