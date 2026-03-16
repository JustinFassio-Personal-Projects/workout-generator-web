-- Admin-dash-astro Analytics: tighten RLS on web_events and errors_frontend.
-- anon: can only insert rows with user_id null. authenticated: user_id must be null or auth.uid().

-- web_events
DROP POLICY IF EXISTS web_events_insert_anon ON public.web_events;
DROP POLICY IF EXISTS web_events_insert_authenticated ON public.web_events;

CREATE POLICY web_events_insert_anon
  ON public.web_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY web_events_insert_authenticated
  ON public.web_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- errors_frontend
DROP POLICY IF EXISTS errors_frontend_insert_anon ON public.errors_frontend;
DROP POLICY IF EXISTS errors_frontend_insert_authenticated ON public.errors_frontend;

CREATE POLICY errors_frontend_insert_anon
  ON public.errors_frontend
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY errors_frontend_insert_authenticated
  ON public.errors_frontend
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
