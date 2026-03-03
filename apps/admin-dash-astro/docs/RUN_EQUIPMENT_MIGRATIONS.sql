-- Run this ENTIRE file in Supabase Dashboard → SQL Editor.
-- No CLI. No DB password. No token. Just paste → Run. (You're already signed in with Google in the Dashboard.)
-- Idempotent; safe to run multiple times. See EQUIPMENT_SCHEMA.md.

-- ========== 1. Initial schema (equipment_inventory, equipment_zones) ==========
CREATE TABLE IF NOT EXISTS public.equipment_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('resistance', 'cardio', 'utility'))
);
CREATE TABLE IF NOT EXISTS public.equipment_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('domestic', 'commercial', 'amenity', 'outdoor')),
  description text DEFAULT '',
  biomechanical_constraints text[] DEFAULT '{}',
  equipment_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
-- RLS: authenticated can read; only admin_users can insert/update/delete (admin-dash).
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage equipment_inventory" ON public.equipment_inventory;
DROP POLICY IF EXISTS "Admins can manage equipment_inventory" ON public.equipment_inventory;
CREATE POLICY "Authenticated users can read equipment_inventory"
  ON public.equipment_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage equipment_inventory"
  ON public.equipment_inventory FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can manage equipment_zones" ON public.equipment_zones;
DROP POLICY IF EXISTS "Admins can manage equipment_zones" ON public.equipment_zones;
CREATE POLICY "Authenticated users can read equipment_zones"
  ON public.equipment_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage equipment_zones"
  ON public.equipment_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid()));

-- ========== 2. Taxonomy (equipment_categories + backfill) ==========
CREATE TABLE IF NOT EXISTS public.equipment_categories (
  code text PRIMARY KEY,
  common_term text NOT NULL,
  technical_term text NOT NULL,
  examples text NOT NULL
);
INSERT INTO public.equipment_categories (code, common_term, technical_term, examples) VALUES
  ('free_weights', 'Free Weights', 'Isoinertial', 'Barbells, Dumbbells, Kettlebells'),
  ('machines', 'Machines', 'Mechanically Guided', 'Selectorized (pin-loaded) and plate-loaded equipment'),
  ('cables_bands', 'Cables & Bands', 'Variable/Constant Tension', 'Functional trainers, resistance bands, pulleys'),
  ('bodyweight', 'Bodyweight', 'Closed-Kinetic Chain', 'Pull-up bars, rings, dip stations, floor space'),
  ('benches_racks', 'Benches & Racks', 'Structural/Utility', 'Power cages, adjustable benches, squat stands'),
  ('conditioning', 'Conditioning', 'Metabolic Ergometers', 'Rowers, bikes, treadmills, stair climbers'),
  ('functional_training', 'Functional Training', 'Multi-Planar / Task-Specific', 'Medicine balls, battle ropes, sleds, stability balls, weight vests')
ON CONFLICT (code) DO NOTHING;
ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_category_check;
UPDATE public.equipment_inventory SET category = CASE
  WHEN category = 'resistance' THEN 'free_weights'
  WHEN category = 'cardio' THEN 'conditioning'
  WHEN category = 'utility' THEN 'benches_racks'
  ELSE 'free_weights'
END WHERE category IN ('resistance', 'cardio', 'utility');
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_category_check
  CHECK (category IN ('free_weights', 'machines', 'cables_bands', 'bodyweight', 'benches_racks', 'conditioning', 'functional_training'));
ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_category_fkey;
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_category_fkey
  FOREIGN KEY (category) REFERENCES public.equipment_categories(code);
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read equipment_categories" ON public.equipment_categories;
CREATE POLICY "Authenticated users can read equipment_categories"
  ON public.equipment_categories FOR SELECT TO authenticated USING (true);

-- ========== 3. Tags + unique (name, category) + canonical Benches & Racks (21 items) ==========
ALTER TABLE public.equipment_inventory ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_name_category_key;
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_name_category_key UNIQUE (name, category);
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Flat Bench', 'benches_racks', '{}'),
  ('Adjustable (FID) Bench', 'benches_racks', '{}'),
  ('Olympic Press Bench', 'benches_racks', '{}'),
  ('Utility Stool (Seated Bench)', 'benches_racks', '{}'),
  ('Abdominal/Crunch Bench', 'benches_racks', '{}'),
  ('Folding Bench', 'benches_racks', '{}'),
  ('Power Rack (Full Cage)', 'benches_racks', ARRAY['safety_features']),
  ('Half Rack', 'benches_racks', ARRAY['safety_features']),
  ('Squat Stand', 'benches_racks', '{}'),
  ('Wall-Mounted / Folding Rack', 'benches_racks', '{}'),
  ('Combo Rack', 'benches_racks', '{}'),
  ('Rig', 'benches_racks', '{}'),
  ('Preacher Curl Bench', 'benches_racks', '{}'),
  ('GHD (Glute Ham Developer)', 'benches_racks', '{}'),
  ('45-Degree Hyper-extension Bench', 'benches_racks', '{}'),
  ('Sissy Squat Stand', 'benches_racks', '{}'),
  ('Nordic Bench', 'benches_racks', '{}'),
  ('Dumbbell Rack (Tiered)', 'benches_racks', '{}'),
  ('Kettlebell Rack', 'benches_racks', '{}'),
  ('Weight Plate Tree / Toaster Rack', 'benches_racks', '{}'),
  ('Barbell Storage Rack (Vertical or Horizontal)', 'benches_racks', '{}')
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;

-- ========== 4. Bodyweight (canonical 20 items) ==========
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Pull-up Bar (Straight/Multi-grip)', 'bodyweight', '{}'),
  ('Dip Station / Parallel Bars', 'bodyweight', '{}'),
  ('Power Tower', 'bodyweight', '{}'),
  ('Wall-Mounted Pull-up Bar', 'bodyweight', '{}'),
  ('Parallettes', 'bodyweight', '{}'),
  ('Gymnastic Rings', 'bodyweight', '{}'),
  ('Suspension Trainer (e.g., TRX)', 'bodyweight', '{}'),
  ('Stall Bars (Gymnastic Wall)', 'bodyweight', '{}'),
  ('Ab Wheel / Roller', 'bodyweight', '{}'),
  ('Glute-Ham Developer (GHD)', 'bodyweight', '{}'),
  ('Reverse Hyper', 'bodyweight', '{}'),
  ('Sissy Squat Stand', 'bodyweight', '{}'),
  ('Nordic Curl Bench', 'bodyweight', '{}'),
  ('Plyo Box (Wood/Soft/Adjustable)', 'bodyweight', '{}'),
  ('Push-up Handles', 'bodyweight', '{}'),
  ('Yoga / Exercise Mat', 'bodyweight', '{}'),
  ('Peg Board', 'bodyweight', '{}'),
  ('Climbing Wall / Bouldering Holds', 'bodyweight', '{}'),
  ('Assistance Bands', 'bodyweight', '{}'),
  ('Floor space', 'bodyweight', '{}')
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;

-- ========== 5. Cables & Bands (canonical 21 + pulley_ratio column) ==========
ALTER TABLE public.equipment_inventory ADD COLUMN IF NOT EXISTS pulley_ratio text;
INSERT INTO public.equipment_inventory (name, category, tags, pulley_ratio)
VALUES
  ('Functional Trainer (Dual Stack)', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Single Column / Cable Tower', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Lat Pulldown Station', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Seated Row Machine (Cable)', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Cable Crossover', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Plate-Loaded Cable Tower', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('All-in-One / Smith-Cable Hybrid', 'cables_bands', ARRAY['cable_machine'], NULL),
  ('Lat Pulldown Bar', 'cables_bands', '{}', NULL),
  ('Straight Bar (Revolving)', 'cables_bands', '{}', NULL),
  ('EZ-Curl Bar Attachment', 'cables_bands', '{}', NULL),
  ('Tricep Rope (Single or Double)', 'cables_bands', '{}', NULL),
  ('D-Handle (Single Grip)', 'cables_bands', '{}', NULL),
  ('V-Bar (Tricep Pressdown)', 'cables_bands', '{}', NULL),
  ('Double D-Handle (Close-Grip Row)', 'cables_bands', '{}', NULL),
  ('Ankle Strap', 'cables_bands', '{}', NULL),
  ('Ab Crunch Strap', 'cables_bands', '{}', NULL),
  ('Loop Bands (Power/Strength Bands)', 'cables_bands', '{}', NULL),
  ('Mini-Bands (Glute Loops)', 'cables_bands', '{}', NULL),
  ('Tube Bands with Handles', 'cables_bands', '{}', NULL),
  ('Therapy Bands (Flat Strips)', 'cables_bands', '{}', NULL),
  ('Figure-8 Bands', 'cables_bands', '{}', NULL)
ON CONFLICT (name, category) DO UPDATE SET
  tags = EXCLUDED.tags,
  pulley_ratio = COALESCE(EXCLUDED.pulley_ratio, equipment_inventory.pulley_ratio);

-- ========== 6. Conditioning (canonical 18 items + low_impact tag) ==========
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Motorized Treadmill', 'conditioning', '{}'),
  ('Manual (Curved) Treadmill', 'conditioning', '{}'),
  ('Slat Belt Treadmill', 'conditioning', '{}'),
  ('Anti-Gravity Treadmill', 'conditioning', '{}'),
  ('Upright Bike', 'conditioning', '{}'),
  ('Recumbent Bike', 'conditioning', ARRAY['low_impact']),
  ('Spin (Studio) Bike', 'conditioning', '{}'),
  ('Air Bike (Fan Bike)', 'conditioning', '{}'),
  ('Standard Elliptical', 'conditioning', ARRAY['low_impact']),
  ('Arc Trainer', 'conditioning', ARRAY['low_impact']),
  ('Adaptive Motion Trainer (AMT)', 'conditioning', ARRAY['low_impact']),
  ('Rowing Machine (Air/Water/Magnetic)', 'conditioning', '{}'),
  ('SkiErg', 'conditioning', '{}'),
  ('StairMill / StepMill', 'conditioning', '{}'),
  ('Pedaling Stepper', 'conditioning', '{}'),
  ('Vertical Climber (VersaClimber)', 'conditioning', '{}'),
  ('Jacob''s Ladder', 'conditioning', '{}'),
  ('Jump Rope', 'conditioning', '{}')
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;

-- ========== 7. Functional Training (canonical 17 items) ==========
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
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;

-- ========== 8. Free Weights (canonical 16 items + drop_safe) ==========
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Standard Olympic Barbell', 'free_weights', '{}'),
  ('Safety Squat Bar (SSB)', 'free_weights', '{}'),
  ('Swiss Bar / Multi-Grip Bar', 'free_weights', '{}'),
  ('Trap Bar (Hex Bar)', 'free_weights', '{}'),
  ('EZ-Curl Bar', 'free_weights', '{}'),
  ('Cambered Bar', 'free_weights', '{}'),
  ('Fixed Dumbbells', 'free_weights', '{}'),
  ('Adjustable Dumbbells', 'free_weights', '{}'),
  ('Kettlebells', 'free_weights', '{}'),
  ('Loadable Dumbbells', 'free_weights', '{}'),
  ('Bumper Plates', 'free_weights', ARRAY['drop_safe']),
  ('Iron Plates', 'free_weights', '{}'),
  ('Fractional / Micro Plates', 'free_weights', '{}'),
  ('Barbell', 'free_weights', '{}'),
  ('Plates', 'free_weights', '{}'),
  ('Dumbbells', 'free_weights', '{}')
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;

-- ========== 9. Machines (canonical 17 + selectorized / plate_loaded) ==========
INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  ('Chest Press Machine (Seated)', 'machines', ARRAY['selectorized']),
  ('Pec Deck / Rear Delt Fly', 'machines', ARRAY['selectorized']),
  ('Shoulder Press Machine', 'machines', ARRAY['selectorized']),
  ('Lat Pulldown (Selectorized)', 'machines', ARRAY['selectorized']),
  ('Seated Row Machine', 'machines', ARRAY['selectorized']),
  ('Assisted Pull-up / Dip Machine', 'machines', ARRAY['selectorized']),
  ('Leg Press (45-Degree or Horizontal)', 'machines', ARRAY['selectorized']),
  ('Hack Squat', 'machines', ARRAY['plate_loaded']),
  ('Leg Extension', 'machines', ARRAY['selectorized']),
  ('Seated / Lying Leg Curl', 'machines', ARRAY['selectorized']),
  ('Adductor / Abductor Machine', 'machines', ARRAY['selectorized']),
  ('Standing / Seated Calf Raise', 'machines', ARRAY['selectorized']),
  ('Smith Machine', 'machines', ARRAY['plate_loaded']),
  ('Hip Thrust Machine', 'machines', ARRAY['plate_loaded']),
  ('T-Bar Row (Supported)', 'machines', ARRAY['plate_loaded']),
  ('Glute Drive', 'machines', ARRAY['plate_loaded']),
  ('Machines', 'machines', '{}')
ON CONFLICT (name, category) DO UPDATE SET tags = EXCLUDED.tags;
