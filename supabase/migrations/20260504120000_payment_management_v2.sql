CREATE TYPE public.payment_category AS ENUM ('match_fee', 'subs', 'kit', 'fine', 'other');

ALTER TABLE public.payment_requests
  ADD COLUMN category public.payment_category NOT NULL DEFAULT 'other';

CREATE TABLE public.payment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category public.payment_category NOT NULL DEFAULT 'other',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_payment_assignment(_req_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payment_assignments
    WHERE request_id = _req_id
      AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Club members can view payment requests" ON public.payment_requests;
CREATE POLICY "Admins view all payment requests; players view assigned requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
    OR public.user_has_payment_assignment(id, auth.uid())
  );

CREATE POLICY "Club admins can view payment templates"
  ON public.payment_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can create payment templates"
  ON public.payment_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can update payment templates"
  ON public.payment_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can delete payment templates"
  ON public.payment_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));
