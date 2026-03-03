-- Equipment tables: authenticated can read; only admin_users can insert/update/delete.
-- Requires admin_users table (from 20260104082749 or equivalent).
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
