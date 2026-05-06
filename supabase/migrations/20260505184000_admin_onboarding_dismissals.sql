CREATE TABLE public.admin_onboarding_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, club_id)
);

ALTER TABLE public.admin_onboarding_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own onboarding dismissals"
  ON public.admin_onboarding_dismissals FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), club_id, 'admin')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), club_id, 'admin')
  );
