-- Equipment category taxonomy: common term, technical term, examples.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

-- New table: single source of truth for equipment category naming
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
  ('conditioning', 'Conditioning', 'Metabolic Ergometers', 'Rowers, bikes, treadmills, stair climbers')
ON CONFLICT (code) DO NOTHING;

-- Drop old CHECK and add new one; backfill existing rows
ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_category_check;
UPDATE public.equipment_inventory SET category = CASE
  WHEN category = 'resistance' THEN 'free_weights'
  WHEN category = 'cardio' THEN 'conditioning'
  WHEN category = 'utility' THEN 'benches_racks'
  ELSE 'free_weights'
END WHERE category IN ('resistance', 'cardio', 'utility');
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_category_check
  CHECK (category IN ('free_weights', 'machines', 'cables_bands', 'bodyweight', 'benches_racks', 'conditioning'));

-- Optional FK for referential integrity
ALTER TABLE public.equipment_inventory DROP CONSTRAINT IF EXISTS equipment_inventory_category_fkey;
ALTER TABLE public.equipment_inventory ADD CONSTRAINT equipment_inventory_category_fkey
  FOREIGN KEY (category) REFERENCES public.equipment_categories(code);

-- RLS for equipment_categories (read-only for authenticated)
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read equipment_categories"
  ON public.equipment_categories FOR SELECT
  TO authenticated
  USING (true);
