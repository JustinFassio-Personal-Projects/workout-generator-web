-- Conditioning (Metabolic Ergometry) canonical list + optional low_impact tag.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md and docs/PLAN_CONDITIONING_EQUIPMENT_UPDATE.md

INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  -- 1. Gait & Locomotion (Treadmills)
  ('Motorized Treadmill', 'conditioning', '{}'),
  ('Manual (Curved) Treadmill', 'conditioning', '{}'),
  ('Slat Belt Treadmill', 'conditioning', '{}'),
  ('Anti-Gravity Treadmill', 'conditioning', '{}'),
  -- 2. Stationary Cycling (Bikes)
  ('Upright Bike', 'conditioning', '{}'),
  ('Recumbent Bike', 'conditioning', ARRAY['low_impact']),
  ('Spin (Studio) Bike', 'conditioning', '{}'),
  ('Air Bike (Fan Bike)', 'conditioning', '{}'),
  -- 3. Low-Impact Striding & Ellipticals
  ('Standard Elliptical', 'conditioning', ARRAY['low_impact']),
  ('Arc Trainer', 'conditioning', ARRAY['low_impact']),
  ('Adaptive Motion Trainer (AMT)', 'conditioning', ARRAY['low_impact']),
  -- 4. Full-Body Ergometers (Pulling & Power)
  ('Rowing Machine (Air/Water/Magnetic)', 'conditioning', '{}'),
  ('SkiErg', 'conditioning', '{}'),
  -- 5. Vertical Displacement & Climbing
  ('StairMill / StepMill', 'conditioning', '{}'),
  ('Pedaling Stepper', 'conditioning', '{}'),
  ('Vertical Climber (VersaClimber)', 'conditioning', '{}'),
  ('Jacob''s Ladder', 'conditioning', '{}'),
  -- 6. Other (Simple / Portable)
  ('Jump Rope', 'conditioning', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
