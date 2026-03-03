-- Free Weights (Isoinertial) canonical list + drop_safe tag for Bumper Plates.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  -- 1. Barbells (Primary Axial Loaders)
  ('Standard Olympic Barbell', 'free_weights', '{}'),
  ('Safety Squat Bar (SSB)', 'free_weights', '{}'),
  ('Swiss Bar / Multi-Grip Bar', 'free_weights', '{}'),
  ('Trap Bar (Hex Bar)', 'free_weights', '{}'),
  ('EZ-Curl Bar', 'free_weights', '{}'),
  ('Cambered Bar', 'free_weights', '{}'),
  -- 2. Dumbbells & Kettlebells (Unilateral)
  ('Fixed Dumbbells', 'free_weights', '{}'),
  ('Adjustable Dumbbells', 'free_weights', '{}'),
  ('Kettlebells', 'free_weights', '{}'),
  ('Loadable Dumbbells', 'free_weights', '{}'),
  -- 3. Specialty Free Weights (Bumper vs Iron for program logic e.g. Power Cleans)
  ('Bumper Plates', 'free_weights', ARRAY['drop_safe']),
  ('Iron Plates', 'free_weights', '{}'),
  ('Fractional / Micro Plates', 'free_weights', '{}'),
  -- Legacy (backward compat for zone templates and seed)
  ('Barbell', 'free_weights', '{}'),
  ('Plates', 'free_weights', '{}'),
  ('Dumbbells', 'free_weights', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
