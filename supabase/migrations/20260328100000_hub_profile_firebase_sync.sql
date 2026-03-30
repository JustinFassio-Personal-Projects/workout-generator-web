-- Hub → Supabase profiles mirror: marketing/billing slice keyed by firebase_uid (Growth Engine CRM parity).
-- See apps/admin-dash-astro sync-firestore-profiles.ts + batch-job HUB_PROFILE_SYNC_ON_BATCH.

-- Ensure columns the RPC touches exist on minimal / legacy projects (idempotent).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS purchased_index integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'client';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT,
  ADD COLUMN IF NOT EXISTS hub_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- One partial index on firebase_uid is enough for equality lookups (no duplicate non-unique index on the same predicate).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_firebase_uid_uidx
  ON public.profiles (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_growth_state
  ON public.profiles (growth_state)
  WHERE growth_state IS NOT NULL;

CREATE OR REPLACE FUNCTION public.upsert_profile_from_hub(
  p_firebase_uid text,
  p_email text,
  p_full_name text,
  p_trial_ends_at timestamptz,
  p_purchased_index integer,
  p_created_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_inserted boolean := false;
  v_firebase_uid text;
BEGIN
  IF p_firebase_uid IS NULL OR btrim(p_firebase_uid) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_firebase_uid');
  END IF;

  v_firebase_uid := btrim(p_firebase_uid);

  SELECT id INTO v_id FROM public.profiles WHERE firebase_uid = v_firebase_uid LIMIT 1;

  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    v_inserted := true;
    INSERT INTO public.profiles (
      id,
      firebase_uid,
      email,
      full_name,
      trial_ends_at,
      purchased_index,
      created_at,
      hub_synced_at,
      updated_at,
      role
    )
    VALUES (
      v_id,
      v_firebase_uid,
      nullif(btrim(coalesce(p_email, '')), ''),
      nullif(btrim(coalesce(p_full_name, '')), ''),
      p_trial_ends_at,
      p_purchased_index,
      coalesce(p_created_at, now()),
      now(),
      now(),
      'client'
    );
  ELSE
    UPDATE public.profiles
    SET
      email = nullif(btrim(coalesce(p_email, '')), ''),
      full_name = nullif(btrim(coalesce(p_full_name, '')), ''),
      trial_ends_at = p_trial_ends_at,
      purchased_index = p_purchased_index,
      hub_synced_at = now(),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'profile_id', v_id,
    'inserted', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_profile_from_hub(text, text, text, timestamptz, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_profile_from_hub(text, text, text, timestamptz, integer, timestamptz) TO service_role;
