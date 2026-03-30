-- Reverse trial: replace legacy growth_state literals with reverse_trial_* + premium_subscriber.
-- created_at must exist before predicates below; later migration 20260328100000 also ensures it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.profiles
SET growth_state = 'premium_subscriber'
WHERE growth_state = 'subscriber_active';

UPDATE public.profiles
SET growth_state = 'reverse_trial_expiring'
WHERE growth_state = 'trial_expiring_24h';

UPDATE public.profiles
SET growth_state = 'reverse_trial_expired'
WHERE growth_state = 'trial_active'
  AND (created_at IS NULL OR created_at <= now() - interval '6 days');

UPDATE public.profiles
SET growth_state = 'reverse_trial_expiring'
WHERE growth_state = 'trial_active'
  AND created_at IS NOT NULL
  AND created_at > now() - interval '6 days'
  AND created_at <= now() - interval '3 days';

UPDATE public.profiles
SET growth_state = 'reverse_trial_active'
WHERE growth_state = 'trial_active';

UPDATE public.profiles
SET growth_state = 'reverse_trial_expired'
WHERE growth_state = 'downgraded_free';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_growth_state_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_growth_state_check
  CHECK (
    growth_state IS NULL OR growth_state IN (
      'reverse_trial_active',
      'reverse_trial_expiring',
      'reverse_trial_expired',
      'premium_subscriber',
      'churned'
    )
  );
