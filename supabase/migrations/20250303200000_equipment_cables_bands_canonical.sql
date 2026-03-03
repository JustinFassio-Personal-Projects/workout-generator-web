-- Cables & Bands (Variable/Constant Tension) canonical list + optional pulley_ratio.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

-- Optional pulley ratio for cable machines (e.g. "2:1" = 100 lb stack feels like 50 lb).
ALTER TABLE public.equipment_inventory
  ADD COLUMN IF NOT EXISTS pulley_ratio text;

INSERT INTO public.equipment_inventory (name, category, tags, pulley_ratio)
VALUES
  -- 1. Cable Machine Architectures (tag: cable_machine)
  ('Functional Trainer (Dual Stack)', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Single Column / Cable Tower', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Lat Pulldown Station', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Seated Row Machine (Cable)', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Cable Crossover', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Plate-Loaded Cable Tower', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('All-in-One / Smith-Cable Hybrid', 'cables_bands', ARRAY['cable_machine'], NULL),
  -- 2. Cable Attachments
  ('Lat Pulldown Bar', 'cables_bands', '{}', NULL),
  ('Straight Bar (Revolving)', 'cables_bands', '{}', NULL),
  ('EZ-Curl Bar Attachment', 'cables_bands', '{}', NULL),
  ('Tricep Rope (Single or Double)', 'cables_bands', '{}', NULL),
  ('D-Handle (Single Grip)', 'cables_bands', '{}', NULL),
  ('V-Bar (Tricep Pressdown)', 'cables_bands', '{}', NULL),
  ('Double D-Handle (Close-Grip Row)', 'cables_bands', '{}', NULL),
  ('Ankle Strap', 'cables_bands', '{}', NULL),
  ('Ab Crunch Strap', 'cables_bands', '{}', NULL),
  -- 3. Elastic Resistance (Bands)
  ('Loop Bands (Power/Strength Bands)', 'cables_bands', '{}', NULL),
  ('Mini-Bands (Glute Loops)', 'cables_bands', '{}', NULL),
  ('Tube Bands with Handles', 'cables_bands', '{}', NULL),
  ('Therapy Bands (Flat Strips)', 'cables_bands', '{}', NULL),
  ('Figure-8 Bands', 'cables_bands', '{}', NULL)
ON CONFLICT (name, category)
  DO UPDATE SET
    tags = EXCLUDED.tags,
    pulley_ratio = COALESCE(EXCLUDED.pulley_ratio, equipment_inventory.pulley_ratio);
