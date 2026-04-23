-- Recurring events: event_series defines a recurrence rule; concrete events are
-- materialized rows in public.events with series_id set. Individual instances can
-- be cancelled via events.is_cancelled without touching the series.

CREATE TABLE public.event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type event_type NOT NULL DEFAULT 'event',
  location TEXT,
  location_url TEXT,
  description TEXT,
  meetup_offset_minutes INTEGER,
  duration_minutes INTEGER,
  rrule TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

CREATE INDEX event_series_team_idx ON public.event_series (team_id, starts_at);

CREATE OR REPLACE FUNCTION public.event_series_team_id(_series_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.event_series WHERE id = _series_id
$$;

CREATE POLICY "Club members can view event series"
  ON public.event_series FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), public.team_club_id(team_id)));

CREATE POLICY "Club admins can create event series"
  ON public.event_series FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can update event series"
  ON public.event_series FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

CREATE POLICY "Club admins can delete event series"
  ON public.event_series FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), public.team_club_id(team_id), 'admin'));

-- Link events to their series and add soft-cancel.
ALTER TABLE public.events
  ADD COLUMN series_id UUID REFERENCES public.event_series(id) ON DELETE SET NULL,
  ADD COLUMN is_cancelled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX events_series_starts_idx ON public.events (series_id, starts_at);
