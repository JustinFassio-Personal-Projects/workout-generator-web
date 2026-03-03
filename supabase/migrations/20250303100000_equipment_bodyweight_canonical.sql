-- Bodyweight (Closed-Kinetic Chain) canonical equipment list.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  -- Upper body pulling & pushing
  ('Pull-up Bar (Straight/Multi-grip)', 'bodyweight', '{}'),
  ('Dip Station / Parallel Bars', 'bodyweight', '{}'),
  ('Power Tower', 'bodyweight', '{}'),
  ('Wall-Mounted Pull-up Bar', 'bodyweight', '{}'),
  ('Parallettes', 'bodyweight', '{}'),
  -- Suspension & lever
  ('Gymnastic Rings', 'bodyweight', '{}'),
  ('Suspension Trainer (e.g., TRX)', 'bodyweight', '{}'),
  ('Stall Bars (Gymnastic Wall)', 'bodyweight', '{}'),
  -- Core & lower body anchors
  ('Ab Wheel / Roller', 'bodyweight', '{}'),
  ('Glute-Ham Developer (GHD)', 'bodyweight', '{}'),
  ('Reverse Hyper', 'bodyweight', '{}'),
  ('Sissy Squat Stand', 'bodyweight', '{}'),
  ('Nordic Curl Bench', 'bodyweight', '{}'),
  -- Support & surface
  ('Plyo Box (Wood/Soft/Adjustable)', 'bodyweight', '{}'),
  ('Push-up Handles', 'bodyweight', '{}'),
  ('Yoga / Exercise Mat', 'bodyweight', '{}'),
  ('Peg Board', 'bodyweight', '{}'),
  ('Climbing Wall / Bouldering Holds', 'bodyweight', '{}'),
  -- Assistance (regression for pull-ups/dips)
  ('Assistance Bands', 'bodyweight', '{}'),
  -- Implicit / taxonomy
  ('Floor space', 'bodyweight', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
