-- Benches & Racks mass update: tags column, unique (name, category), canonical 21 items.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

-- Add optional tags (e.g. safety_features for racks with pins/straps)
ALTER TABLE public.equipment_inventory
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Allow upsert by name+category; drop first in case of re-run
ALTER TABLE public.equipment_inventory
  DROP CONSTRAINT IF EXISTS equipment_inventory_name_category_key;
ALTER TABLE public.equipment_inventory
  ADD CONSTRAINT equipment_inventory_name_category_key UNIQUE (name, category);

-- Insert canonical Benches & Racks (21 items). Safety Features for Power Rack (Full Cage) and Half Rack.
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  -- Benches (Body Support Units)
  ('Flat Bench', 'benches_racks', '{}'),
  ('Adjustable (FID) Bench', 'benches_racks', '{}'),
  ('Olympic Press Bench', 'benches_racks', '{}'),
  ('Utility Stool (Seated Bench)', 'benches_racks', '{}'),
  ('Abdominal/Crunch Bench', 'benches_racks', '{}'),
  ('Folding Bench', 'benches_racks', '{}'),
  -- Racks (Weight Support Units) — Power Rack and Half Rack tagged for safety pins/straps
  ('Power Rack (Full Cage)', 'benches_racks', ARRAY['safety_features']),
  ('Half Rack', 'benches_racks', ARRAY['safety_features']),
  ('Squat Stand', 'benches_racks', '{}'),
  ('Wall-Mounted / Folding Rack', 'benches_racks', '{}'),
  ('Combo Rack', 'benches_racks', '{}'),
  ('Rig', 'benches_racks', '{}'),
  -- Specialized Support Equipment
  ('Preacher Curl Bench', 'benches_racks', '{}'),
  ('GHD (Glute Ham Developer)', 'benches_racks', '{}'),
  ('45-Degree Hyper-extension Bench', 'benches_racks', '{}'),
  ('Sissy Squat Stand', 'benches_racks', '{}'),
  ('Nordic Bench', 'benches_racks', '{}'),
  -- Storage Racks (Utility)
  ('Dumbbell Rack (Tiered)', 'benches_racks', '{}'),
  ('Kettlebell Rack', 'benches_racks', '{}'),
  ('Weight Plate Tree / Toaster Rack', 'benches_racks', '{}'),
  ('Barbell Storage Rack (Vertical or Horizontal)', 'benches_racks', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
