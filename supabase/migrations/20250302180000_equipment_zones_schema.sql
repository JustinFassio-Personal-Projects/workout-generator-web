-- Equipment & Zones schema for admin-dash-astro (/admin/zones)
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

-- equipment_inventory: id, name, category (resistance | cardio | utility)
CREATE TABLE IF NOT EXISTS public.equipment_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('resistance', 'cardio', 'utility'))
);
-- equipment_zones: id, name, category, description, biomechanical_constraints, equipment_ids, created_at
CREATE TABLE IF NOT EXISTS public.equipment_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('domestic', 'commercial', 'amenity', 'outdoor')),
  description text DEFAULT '',
  biomechanical_constraints text[] DEFAULT '{}',
  equipment_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
-- RLS: enable; initial permissive policy is replaced by admin-only policy in 20260303130000_equipment_zones_admin_only_rls.sql
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage equipment_inventory" ON public.equipment_inventory;
CREATE POLICY "Authenticated users can manage equipment_inventory"
  ON public.equipment_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage equipment_zones" ON public.equipment_zones;
CREATE POLICY "Authenticated users can manage equipment_zones"
  ON public.equipment_zones FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
