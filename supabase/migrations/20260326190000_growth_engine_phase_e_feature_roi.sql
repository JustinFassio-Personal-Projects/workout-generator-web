-- Growth Engine Phase E: feature ROI config and seed mappings.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.growth_feature_roi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('hub_firestore', 'supabase_funnel')),
  event_names TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_feature_roi_definitions_active_sort
  ON public.growth_feature_roi_definitions (is_active, sort_order, feature_key);

ALTER TABLE public.growth_feature_roi_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_feature_roi_definitions_admin_read ON public.growth_feature_roi_definitions;
CREATE POLICY growth_feature_roi_definitions_admin_read
  ON public.growth_feature_roi_definitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS growth_feature_roi_definitions_service_role_manage ON public.growth_feature_roi_definitions;
CREATE POLICY growth_feature_roi_definitions_service_role_manage
  ON public.growth_feature_roi_definitions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.growth_feature_roi_definitions
  (feature_key, display_label, source, event_names, notes, sort_order, is_active)
VALUES
  ('hub_app_open', 'Hub app open', 'hub_firestore', ARRAY['app:open'], NULL, 10, true),
  ('hub_session_start', 'Hub session started', 'hub_firestore', ARRAY['app:session_start'], NULL, 20, true),
  ('hub_workout_generate', 'Workout generated', 'hub_firestore', ARRAY['workout:generate'], NULL, 30, true),
  ('hub_workout_start', 'Workout started', 'hub_firestore', ARRAY['workout:start'], NULL, 40, true),
  ('hub_workout_complete', 'Workout completed', 'hub_firestore', ARRAY['workout:complete'], NULL, 50, true),
  ('hub_workout_save', 'Workout saved', 'hub_firestore', ARRAY['workout:save'], NULL, 60, true),
  ('hub_workout_share', 'Workout shared', 'hub_firestore', ARRAY['workout:share'], NULL, 70, true),
  ('hub_profile_onboarding_complete', 'Onboarding completed', 'hub_firestore', ARRAY['profile:onboarding_complete'], NULL, 80, true),
  ('hub_recipe_view', 'Recipe viewed', 'hub_firestore', ARRAY['recipe:view'], NULL, 90, true),
  ('hub_recipe_save', 'Recipe saved', 'hub_firestore', ARRAY['recipe:save'], NULL, 100, true),
  ('hub_subscription_upgrade', 'Subscription upgraded (hub signal)', 'hub_firestore', ARRAY['subscription:upgrade'], NULL, 110, true),
  ('hub_subscription_downgrade', 'Subscription downgraded (hub signal)', 'hub_firestore', ARRAY['subscription:downgrade'], NULL, 120, true),
  ('mkt_timer_session_complete', 'Timer session complete', 'supabase_funnel', ARRAY['timer_session_complete'], NULL, 130, true),
  ('mkt_hub_timer_launch_1', 'Hub timer launch 1', 'supabase_funnel', ARRAY['hub_timer_launch_1'], NULL, 140, true),
  ('mkt_hub_timer_launch_2', 'Hub timer launch 2', 'supabase_funnel', ARRAY['hub_timer_launch_2'], NULL, 150, true),
  ('mkt_timer_save_click', 'Timer save click', 'supabase_funnel', ARRAY['timer_save_click'], NULL, 160, true),
  ('mkt_account_land_handoff', 'Account handoff landed', 'supabase_funnel', ARRAY['account_land_handoff'], NULL, 170, true),
  ('mkt_account_session_prefill_success', 'Account prefill success', 'supabase_funnel', ARRAY['account_session_prefill_success'], NULL, 180, true)
ON CONFLICT (feature_key) DO UPDATE
SET
  display_label = EXCLUDED.display_label,
  source = EXCLUDED.source,
  event_names = EXCLUDED.event_names,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
