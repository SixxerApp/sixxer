-- PR-3: allow admins to attach an external live-scoring URL to a match event.
-- Stored on both the series template (so new instances inherit it) and on each
-- individual event (so future instances can override if a venue changes).

alter table public.events
  add column if not exists scoring_url text;

alter table public.event_series
  add column if not exists scoring_url text;

comment on column public.events.scoring_url is
  'Optional external link (e.g. CricClubs/CricHeroes match page) shown as "Watch live" on match events.';
comment on column public.event_series.scoring_url is
  'Default scoring URL propagated to new instances created from this series.';
