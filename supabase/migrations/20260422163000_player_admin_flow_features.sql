ALTER TABLE public.notifications
ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;

CREATE POLICY "Users or admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR (
      club_id IS NOT NULL
      AND public.has_role(auth.uid(), club_id, 'admin')
      AND public.is_club_member(user_id, club_id)
    )
  );

CREATE INDEX notifications_club_user_idx
  ON public.notifications (club_id, user_id, created_at DESC);

CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT polls_options_is_array CHECK (jsonb_typeof(options) = 'array'),
  CONSTRAINT polls_options_length CHECK (jsonb_array_length(options) BETWEEN 2 AND 6)
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE INDEX polls_team_created_idx ON public.polls (team_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.poll_team_id(_poll_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.polls WHERE id = _poll_id
$$;

CREATE POLICY "Club members can view polls"
  ON public.polls FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club members can create polls"
  ON public.polls FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    public.is_club_member(auth.uid(), public.team_club_id(team_id))
  );

CREATE POLICY "Authors or admins can update polls"
  ON public.polls FOR UPDATE TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
  );

CREATE POLICY "Authors or admins can delete polls"
  ON public.polls FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
  );

CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE INDEX poll_votes_poll_created_idx ON public.poll_votes (poll_id, created_at DESC);

CREATE POLICY "Club members can view poll votes"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (
    public.is_club_member(auth.uid(), public.team_club_id(public.poll_team_id(poll_id)))
  );

CREATE POLICY "Members can vote on polls"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_club_member(auth.uid(), public.team_club_id(public.poll_team_id(poll_id)))
  );

CREATE POLICY "Members can update their own poll vote"
  ON public.poll_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can delete their own poll vote"
  ON public.poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.event_squads (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  selected_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  announcement_message TEXT,
  announced_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_squads_selected_user_ids_is_array CHECK (jsonb_typeof(selected_user_ids) = 'array')
);
ALTER TABLE public.event_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view event squads"
  ON public.event_squads FOR SELECT TO authenticated
  USING (
    public.is_club_member(auth.uid(), public.team_club_id(public.event_team_id(event_id)))
  );

CREATE POLICY "Club admins can insert event squads"
  ON public.event_squads FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin')
  );

CREATE POLICY "Club admins can update event squads"
  ON public.event_squads FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin')
  );

CREATE POLICY "Club admins can delete event squads"
  ON public.event_squads FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin')
  );
