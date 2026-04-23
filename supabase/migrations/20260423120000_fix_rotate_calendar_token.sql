-- Fix rotate_calendar_token(): gen_random_bytes() ships in the `pgcrypto`
-- extension, which Supabase installs in the `extensions` schema (not
-- `public`). Our SECURITY DEFINER function had `SET search_path = public`, so
-- the unqualified call failed with 42883. We now:
--   1. Ensure pgcrypto is installed (idempotent).
--   2. Fully qualify the call as `extensions.gen_random_bytes`.
--   3. Pin search_path to `public, extensions` for defence in depth.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.rotate_calendar_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  caller UUID := auth.uid();
  new_token TEXT;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  new_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.calendar_tokens (user_id, token)
  VALUES (caller, new_token)
  ON CONFLICT (user_id)
  DO UPDATE SET token = excluded.token, created_at = now(), last_fetched_at = NULL;

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_calendar_token() TO authenticated;
