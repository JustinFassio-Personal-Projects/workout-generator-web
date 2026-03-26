-- Growth Engine Phase F: enrich intervention logs for messaging and experiments loop.

ALTER TABLE public.intervention_logs
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS directive_type TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'intervention_logs_channel_check'
  ) THEN
    ALTER TABLE public.intervention_logs
      ADD CONSTRAINT intervention_logs_channel_check
      CHECK (
        channel IS NULL OR channel IN (
          'push',
          'email',
          'in_app',
          'experiment',
          'eng_ticket',
          'other'
        )
      );
  END IF;
END $$;
