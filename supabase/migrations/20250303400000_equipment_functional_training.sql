-- Functional Training: add category and canonical equipment_inventory items.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

-- Add category to taxonomy
INSERT INTO public.equipment_categories (code, common_term, technical_term, examples) VALUES
  ('functional_training', 'Functional Training', 'Multi-Planar / Task-Specific', 'Medicine balls, battle ropes, sleds, stability balls, weight vests')
ON CONFLICT (code) DO NOTHING;

-- Allow equipment_inventory.category to reference functional_training
-- Backfill any legacy or invalid categories so no row violates the new CHECK
UPDATE public.equipment_inventory SET category = CASE
  WHEN category = 'resistance' THEN 'free_weights'
  WHEN category = 'cardio' THEN 'conditioning'
  WHEN category = 'utility' THEN 'benches_racks'
  WHEN category NOT IN ('free_weights', 'machines', 'cables_bands', 'bodyweight', 'benches_racks', 'conditioning', 'functional_training') OR category IS NULL THEN 'free_weights'
  ELSE category
END WHERE category IS NULL OR category NOT IN ('free_weights', 'machines', 'cables_bands', 'bodyweight', 'benches_racks', 'conditioning', 'functional_training');

ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_category_check;
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_category_check
  CHECK (category IN ('free_weights', 'machines', 'cables_bands', 'bodyweight', 'benches_racks', 'conditioning', 'functional_training'));

-- Canonical Functional Training equipment (no tags by default)
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Medicine Ball', 'functional_training', '{}'),
  ('Battle Rope', 'functional_training', '{}'),
  ('Sandbag', 'functional_training', '{}'),
  ('Sled / Prowler', 'functional_training', '{}'),
  ('Pull Sled', 'functional_training', '{}'),
  ('Tire (Flipping/Dragging)', 'functional_training', '{}'),
  ('Climbing Rope', 'functional_training', '{}'),
  ('Sliders / Gliders', 'functional_training', '{}'),
  ('Stability Ball', 'functional_training', '{}'),
  ('BOSU Ball', 'functional_training', '{}'),
  ('Weight Vest', 'functional_training', '{}'),
  ('Wall Ball', 'functional_training', '{}'),
  ('Slam Ball', 'functional_training', '{}'),
  ('Farmer''s Walk Handles', 'functional_training', '{}'),
  ('Agility Ladder', 'functional_training', '{}'),
  ('Foam Roller', 'functional_training', '{}'),
  ('Door Anchor', 'functional_training', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
