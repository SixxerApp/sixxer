import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchVisibleTeamsForUser } from "@/features/teams/visible-teams";

export interface CalendarEvent {
  id: string;
  team_id: string;
  team_name: string;
  title: string;
  type: "match" | "event";
  opponent: string | null;
  home_away: "home" | "away" | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  is_series_instance: boolean;
}

export interface CalendarDay {
  key: string;
  label: string;
  subLabel: string;
  items: CalendarEvent[];
}

export const CALENDAR_WINDOW_DAYS = 30;

async function fetchUpcoming(userId: string): Promise<CalendarEvent[]> {
  const visibleTeams = await fetchVisibleTeamsForUser(userId);
  const teamNames: Record<string, string> = {};
  const teamIds = visibleTeams.map((team) => team.id);
  for (const team of visibleTeams) {
    teamNames[team.id] = team.name;
  }
  if (teamIds.length === 0) return [];

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + CALENDAR_WINDOW_DAYS);

  const { data: rows } = await supabase
    .from("events")
    .select(
      "id, team_id, title, type, opponent, home_away, starts_at, ends_at, location, series_id",
    )
    .in("team_id", teamIds)
    .eq("is_cancelled", false)
    .gte("starts_at", now.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  return (rows ?? []).map((row) => ({
    id: row.id,
    team_id: row.team_id,
    team_name: teamNames[row.team_id] ?? "Team",
    title: row.title,
    type: row.type,
    opponent: row.opponent,
    home_away: row.home_away,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: row.location,
    is_series_instance: Boolean(row.series_id),
  }));
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function dayLabels(iso: string): { label: string; subLabel: string } {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = dayKey(iso) === dayKey(today.toISOString());
  const isTomorrow = dayKey(iso) === dayKey(tomorrow.toISOString());

  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (isToday) return { label: "Today", subLabel: `${weekday} · ${monthDay}` };
  if (isTomorrow) return { label: "Tomorrow", subLabel: `${weekday} · ${monthDay}` };
  return { label: weekday, subLabel: monthDay };
}

export function groupByDay(events: CalendarEvent[]): CalendarDay[] {
  const map = new Map<string, CalendarDay>();
  for (const event of events) {
    const key = dayKey(event.starts_at);
    let bucket = map.get(key);
    if (!bucket) {
      const { label, subLabel } = dayLabels(event.starts_at);
      bucket = { key, label, subLabel, items: [] };
      map.set(key, bucket);
    }
    bucket.items.push(event);
  }
  return Array.from(map.values());
}

export function useUpcomingEvents(userId: string | undefined) {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      const rows = await fetchUpcoming(userId);
      if (!active) return;
      setEvents(rows);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const days = React.useMemo(() => groupByDay(events), [events]);

  return { events, days, loading };
}
