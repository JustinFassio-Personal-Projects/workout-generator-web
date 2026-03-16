-- Admin-dash-astro Analytics: tighten analytics_events RLS to prevent user impersonation.
-- Only applies when public.analytics_events has user_id (funnel schema). Skip when table is from 20260118 custom schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_events' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS analytics_events_insert_anon ON public.analytics_events;
    DROP POLICY IF EXISTS analytics_events_insert_authenticated ON public.analytics_events;
    CREATE POLICY analytics_events_insert_anon ON public.analytics_events FOR INSERT TO anon WITH CHECK (user_id IS NULL);
    CREATE POLICY analytics_events_insert_authenticated ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;
