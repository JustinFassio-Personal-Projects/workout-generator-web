-- Machines (Mechanically Guided) canonical list + selectorized / plate_loaded tags.
-- See apps/admin-dash-astro/docs/EQUIPMENT_SCHEMA.md

INSERT INTO public.equipment_inventory (name, category, tags)
VALUES
  -- 1. Upper body pressing & pulling
  ('Chest Press Machine (Seated)', 'machines', ARRAY['selectorized']),
  ('Pec Deck / Rear Delt Fly', 'machines', ARRAY['selectorized']),
  ('Shoulder Press Machine', 'machines', ARRAY['selectorized']),
  ('Lat Pulldown (Selectorized)', 'machines', ARRAY['selectorized']),
  ('Seated Row Machine', 'machines', ARRAY['selectorized']),
  ('Assisted Pull-up / Dip Machine', 'machines', ARRAY['selectorized']),
  -- 2. Lower body
  ('Leg Press (45-Degree or Horizontal)', 'machines', ARRAY['selectorized']),
  ('Hack Squat', 'machines', ARRAY['plate_loaded']),
  ('Leg Extension', 'machines', ARRAY['selectorized']),
  ('Seated / Lying Leg Curl', 'machines', ARRAY['selectorized']),
  ('Adductor / Abductor Machine', 'machines', ARRAY['selectorized']),
  ('Standing / Seated Calf Raise', 'machines', ARRAY['selectorized']),
  -- 3. Specialized & hybrid
  ('Smith Machine', 'machines', ARRAY['plate_loaded']),
  ('Hip Thrust Machine', 'machines', ARRAY['plate_loaded']),
  ('T-Bar Row (Supported)', 'machines', ARRAY['plate_loaded']),
  ('Glute Drive', 'machines', ARRAY['plate_loaded']),
  -- Legacy (backward compat for zone templates and seed)
  ('Machines', 'machines', '{}')
ON CONFLICT (name, category)
  DO UPDATE SET tags = EXCLUDED.tags;
