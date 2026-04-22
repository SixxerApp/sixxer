
-- ============ TEAMS ============
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  banner_color TEXT NOT NULL DEFAULT 'pink',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- helper: get club_id for a team (security definer, no recursion)
CREATE OR REPLACE FUNCTION public.team_club_id(_team_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT club_id FROM public.teams WHERE id = _team_id
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id)
$$;

-- TEAMS policies
CREATE POLICY "Club members can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), club_id, 'admin'));

CREATE POLICY "Club admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), club_id, 'admin'));

CREATE POLICY "Club admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), club_id, 'admin'));

-- TEAM_MEMBERS policies
CREATE POLICY "Club members can view team rosters"
  ON public.team_members FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club admins can add members to teams"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Members can add themselves to a team"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_club_member(auth.uid(), public.team_club_id(team_id))
  );

CREATE POLICY "Club admins can remove team members"
  ON public.team_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

-- ============ INVITES ============
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can look up an invite by code (needed to join)
CREATE POLICY "Authenticated can view invites"
  ON public.invites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Club admins can create invites"
  ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), club_id, 'admin'));

CREATE POLICY "Club admins can delete invites"
  ON public.invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), club_id, 'admin'));

-- Allow joining a club via an invite: a player can insert a 'player' role for themselves
-- if a matching, unexpired invite exists.
CREATE POLICY "Join club via invite"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND role = 'player' AND
    EXISTS (
      SELECT 1 FROM public.invites i
      WHERE i.club_id = user_roles.club_id
        AND (i.expires_at IS NULL OR i.expires_at > now())
    )
  );

-- ============ EVENTS ============
CREATE TYPE public.event_type AS ENUM ('match', 'event');
CREATE TYPE public.home_away AS ENUM ('home', 'away');
CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'declined');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type event_type NOT NULL DEFAULT 'match',
  title TEXT NOT NULL,
  opponent TEXT,
  home_away home_away,
  starts_at TIMESTAMPTZ NOT NULL,
  meetup_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  location_url TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE INDEX events_team_starts_idx ON public.events (team_id, starts_at);

CREATE POLICY "Club members can view events"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club admins can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

-- ============ EVENT RESPONSES ============
CREATE OR REPLACE FUNCTION public.event_team_id(_event_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.events WHERE id = _event_id
$$;

CREATE TABLE public.event_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view RSVPs"
  ON public.event_responses FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(public.event_team_id(event_id))));

CREATE POLICY "Players can create their own RSVP"
  ON public.event_responses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_club_member(auth.uid(), public.team_club_id(public.event_team_id(event_id)))
  );

CREATE POLICY "Players can update their own RSVP"
  ON public.event_responses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Players can delete their own RSVP"
  ON public.event_responses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ POSTS ============
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX posts_team_created_idx ON public.posts (team_id, created_at DESC);

CREATE POLICY "Club members can view posts"
  ON public.posts FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club members can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    public.is_club_member(auth.uid(), public.team_club_id(team_id))
  );

CREATE POLICY "Authors can update their own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete posts"
  ON public.posts FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_role(auth.uid(), public.team_club_id(team_id), 'admin')
  );

-- ============ PAYMENTS ============
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'marked_paid', 'confirmed', 'rejected');

CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  due_at TIMESTAMPTZ,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.payment_request_team_id(_req_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.payment_requests WHERE id = _req_id
$$;

CREATE TABLE public.payment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status payment_status NOT NULL DEFAULT 'unpaid',
  note TEXT,
  marked_paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  UNIQUE (request_id, user_id)
);
ALTER TABLE public.payment_assignments ENABLE ROW LEVEL SECURITY;

-- payment_requests policies
CREATE POLICY "Club members can view payment requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club admins can create payment requests"
  ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can update payment requests"
  ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can delete payment requests"
  ON public.payment_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

-- payment_assignments policies
CREATE POLICY "Players see their own assignments; admins see all"
  ON public.payment_assignments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), public.team_club_id(public.payment_request_team_id(request_id)), 'admin')
  );

CREATE POLICY "Club admins can create assignments"
  ON public.payment_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), public.team_club_id(public.payment_request_team_id(request_id)), 'admin')
  );

-- Player marks own assignment paid; admin updates anything
CREATE POLICY "Player or admin can update assignment"
  ON public.payment_assignments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), public.team_club_id(public.payment_request_team_id(request_id)), 'admin')
  );

CREATE POLICY "Club admins can delete assignments"
  ON public.payment_assignments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), public.team_club_id(public.payment_request_team_id(request_id)), 'admin')
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE POLICY "Users see their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow inserts from any authenticated user (server functions / triggers will use this)
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
