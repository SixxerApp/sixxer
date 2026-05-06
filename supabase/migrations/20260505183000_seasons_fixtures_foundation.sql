-- Seasons and fixture foundation.
-- Seasons are team-scoped for now because all current event/payment workflows
-- operate inside a team route. Club-level rollups can group team seasons later.

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_on DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX seasons_team_name_idx ON public.seasons (team_id, lower(name));
CREATE UNIQUE INDEX seasons_one_active_per_team_idx
  ON public.seasons (team_id)
  WHERE is_active;

CREATE POLICY "Club members can view seasons"
  ON public.seasons FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club admins can create seasons"
  ON public.seasons FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can update seasons"
  ON public.seasons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can delete seasons"
  ON public.seasons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE OR REPLACE FUNCTION public.season_team_id(_season_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.seasons WHERE id = _season_id
$$;

CREATE OR REPLACE FUNCTION public.set_active_season(_season_id UUID)
RETURNS public.seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_team_id UUID;
  updated_season public.seasons;
BEGIN
  SELECT team_id INTO target_team_id
  FROM public.seasons
  WHERE id = _season_id;

  IF target_team_id IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF NOT public.has_role(auth.uid(), public.team_club_id(target_team_id), 'admin') THEN
    RAISE EXCEPTION 'Only club admins can set the active season';
  END IF;

  UPDATE public.seasons
  SET is_active = false, updated_at = now()
  WHERE team_id = target_team_id
    AND id <> _season_id
    AND is_active = true;

  UPDATE public.seasons
  SET is_active = true, updated_at = now()
  WHERE id = _season_id
  RETURNING * INTO updated_season;

  RETURN updated_season;
END;
$$;

ALTER TABLE public.events
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

ALTER TABLE public.event_series
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

ALTER TABLE public.payment_requests
  ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

CREATE INDEX events_team_season_starts_idx ON public.events (team_id, season_id, starts_at);
CREATE INDEX event_series_team_season_idx ON public.event_series (team_id, season_id, starts_at);
CREATE INDEX payment_requests_team_season_idx ON public.payment_requests (team_id, season_id, due_at);

CREATE TYPE public.fixture_result_status AS ENUM ('scheduled', 'completed', 'abandoned', 'cancelled');

CREATE TABLE public.fixture_results (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  status public.fixture_result_status NOT NULL DEFAULT 'scheduled',
  team_runs INTEGER CHECK (team_runs IS NULL OR team_runs >= 0),
  team_wickets INTEGER CHECK (team_wickets IS NULL OR team_wickets BETWEEN 0 AND 10),
  opponent_runs INTEGER CHECK (opponent_runs IS NULL OR opponent_runs >= 0),
  opponent_wickets INTEGER CHECK (opponent_wickets IS NULL OR opponent_wickets BETWEEN 0 AND 10),
  result_summary TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fixture_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view fixture results"
  ON public.fixture_results FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(public.event_team_id(event_id))));

CREATE POLICY "Club admins can create fixture results"
  ON public.fixture_results FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin'));

CREATE POLICY "Club admins can update fixture results"
  ON public.fixture_results FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin'));

CREATE POLICY "Club admins can delete fixture results"
  ON public.fixture_results FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(public.event_team_id(event_id)), 'admin'));

CREATE TABLE public.season_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0 CHECK (played >= 0),
  won INTEGER NOT NULL DEFAULT 0 CHECK (won >= 0),
  lost INTEGER NOT NULL DEFAULT 0 CHECK (lost >= 0),
  tied INTEGER NOT NULL DEFAULT 0 CHECK (tied >= 0),
  no_result INTEGER NOT NULL DEFAULT 0 CHECK (no_result >= 0),
  points NUMERIC(6, 2) NOT NULL DEFAULT 0,
  net_run_rate NUMERIC(7, 3),
  position INTEGER CHECK (position IS NULL OR position > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_name)
);

ALTER TABLE public.season_standings ENABLE ROW LEVEL SECURITY;

CREATE INDEX season_standings_season_position_idx
  ON public.season_standings (season_id, position);

CREATE POLICY "Club members can view season standings"
  ON public.season_standings FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(public.season_team_id(season_id))));

CREATE POLICY "Club admins can create season standings"
  ON public.season_standings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(public.season_team_id(season_id)), 'admin'));

CREATE POLICY "Club admins can update season standings"
  ON public.season_standings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(public.season_team_id(season_id)), 'admin'));

CREATE POLICY "Club admins can delete season standings"
  ON public.season_standings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(public.season_team_id(season_id)), 'admin'));
