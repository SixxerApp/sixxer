-- Calendar subscription tokens.
--
-- Each user gets a single long-lived, unguessable token that backs their
-- personal iCal subscription URL. The token is never exposed via RLS as a
-- "everyone can see tokens" row — users only see their own row. Validation of
-- a token from the unauthenticated iCal endpoint happens server-side with the
-- service-role key, so leaking a token only exposes that one user's events.

CREATE TABLE public.calendar_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_fetched_at TIMESTAMPTZ
);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar token"
  ON public.calendar_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for authenticated clients: all writes go
-- through the rotate_calendar_token() RPC so we control token generation.

-- Mint or rotate the caller's calendar token. Returns the new token value so
-- the caller can immediately assemble the webcal URL. Uses 32 random bytes
-- hex-encoded (64 chars), which is well past brute-force territory for the
-- volume of traffic this endpoint will ever see.
CREATE OR REPLACE FUNCTION public.rotate_calendar_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  new_token TEXT;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.calendar_tokens (user_id, token)
  VALUES (caller, new_token)
  ON CONFLICT (user_id)
  DO UPDATE SET token = excluded.token, created_at = now(), last_fetched_at = NULL;

  RETURN new_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_calendar_token() TO authenticated;
