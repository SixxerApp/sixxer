import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CalendarPlus, ChevronDown, MapPin } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { dateBlock, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeamSeasons } from "@/features/seasons/use-team-seasons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/$teamId/events")({
  component: EventsTab,
});

interface EventCard {
  id: string;
  title: string;
  type: "match" | "event";
  opponent: string | null;
  home_away: "home" | "away" | null;
  season_id: string | null;
  starts_at: string;
  location: string | null;
  going: number;
  maybe: number;
  declined: number;
  myStatus: "going" | "maybe" | "declined" | null;
}

// Returns Monday 00:00 (local time) of the week containing `d`.
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

function formatWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const sameMonth = start.getMonth() === end.getMonth();
  const endStr = sameMonth
    ? end.toLocaleDateString(undefined, { day: "numeric" })
    : end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

function groupByWeek(events: EventCard[]) {
  const groups = new Map<number, { label: string; items: EventCard[] }>();
  for (const ev of events) {
    const start = startOfWeek(new Date(ev.starts_at));
    const key = start.getTime();
    const g = groups.get(key);
    if (g) g.items.push(ev);
    else groups.set(key, { label: formatWeekRange(start), items: [ev] });
  }
  return Array.from(groups.entries()).map(([k, v]) => ({ key: k, ...v }));
}

function EventsTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/events" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const { seasons, activeSeason, loading: seasonsLoading, refresh: refreshSeasons } = useTeamSeasons(teamId);
  const [filter, setFilter] = React.useState<"upcoming" | "past">("upcoming");
  const [seasonFilter, setSeasonFilter] = React.useState("all");
  const [activeSeasonSelection, setActiveSeasonSelection] = React.useState("");
  const [newSeasonName, setNewSeasonName] = React.useState("");
  const [newSeasonStartsOn, setNewSeasonStartsOn] = React.useState("");
  const [newSeasonEndsOn, setNewSeasonEndsOn] = React.useState("");
  const [seasonSubmitting, setSeasonSubmitting] = React.useState(false);
  const [events, setEvents] = React.useState<EventCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (activeSeasonSelection || seasonsLoading) return;
    setActiveSeasonSelection(activeSeason?.id ?? "");
  }, [activeSeason?.id, activeSeasonSelection, seasonsLoading]);

  React.useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const q = supabase
        .from("events")
        .select("id, title, type, opponent, home_away, season_id, starts_at, location")
        .eq("team_id", teamId)
        .eq("is_cancelled", false);
      if (seasonFilter === "unassigned") {
        q.is("season_id", null);
      } else if (seasonFilter !== "all") {
        q.eq("season_id", seasonFilter);
      }
      const { data: rows } =
        filter === "upcoming"
          ? await q.gte("starts_at", now).order("starts_at", { ascending: true })
          : await q.lt("starts_at", now).order("starts_at", { ascending: false });
      const ids = (rows ?? []).map((r) => r.id);
      const counts: Record<string, { going: number; maybe: number; declined: number }> = {};
      const mine: Record<string, "going" | "maybe" | "declined"> = {};
      if (ids.length) {
        const { data: resps } = await supabase
          .from("event_responses")
          .select("event_id, status, user_id")
          .in("event_id", ids);
        for (const r of resps ?? []) {
          counts[r.event_id] ??= { going: 0, maybe: 0, declined: 0 };
          counts[r.event_id][r.status] += 1;
          if (r.user_id === user.id) mine[r.event_id] = r.status;
        }
      }
      if (!active) return;
      setEvents(
        (rows ?? []).map((r) => ({
          ...r,
          going: counts[r.id]?.going ?? 0,
          maybe: counts[r.id]?.maybe ?? 0,
          declined: counts[r.id]?.declined ?? 0,
          myStatus: mine[r.id] ?? null,
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [teamId, user, filter, seasonFilter]);

  const grouped = React.useMemo(() => groupByWeek(events), [events]);

  async function createSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !ctx?.isAdmin || !newSeasonName.trim()) return;

    setSeasonSubmitting(true);
    const { data, error } = await supabase
      .from("seasons")
      .insert({
        team_id: teamId,
        name: newSeasonName.trim(),
        starts_on: newSeasonStartsOn || null,
        ends_on: newSeasonEndsOn || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      setSeasonSubmitting(false);
      toast.error(error?.message ?? "Could not create season");
      return;
    }

    const { error: activeError } = await supabase.rpc("set_active_season", {
      _season_id: data.id,
    });
    setSeasonSubmitting(false);

    if (activeError) {
      toast.error(`Season created, but not set active: ${activeError.message}`);
      await refreshSeasons();
      return;
    }

    setNewSeasonName("");
    setNewSeasonStartsOn("");
    setNewSeasonEndsOn("");
    setActiveSeasonSelection(data.id);
    setSeasonFilter(data.id);
    await refreshSeasons();
    toast.success("Season created");
  }

  async function setActiveSeason() {
    if (!ctx?.isAdmin || !activeSeasonSelection) return;
    setSeasonSubmitting(true);
    const { error } = await supabase.rpc("set_active_season", {
      _season_id: activeSeasonSelection,
    });
    setSeasonSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshSeasons();
    toast.success("Active season updated");
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <select
              aria-label="Season filter"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              disabled={seasonsLoading}
              className="h-9 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All seasons</option>
              <option value="unassigned">No season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.is_active ? " (active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setFilter(filter === "upcoming" ? "past" : "upcoming")}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            {filter === "upcoming" ? "Upcoming" : "Past"}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {ctx?.isAdmin && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <div className="space-y-1.5">
              <Label htmlFor="active-season">Active season</Label>
              <div className="flex gap-2">
                <select
                  id="active-season"
                  value={activeSeasonSelection}
                  onChange={(e) => setActiveSeasonSelection(e.target.value)}
                  disabled={seasonsLoading || seasons.length === 0}
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">No seasons yet</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                      {season.is_active ? " (active)" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={seasonSubmitting || !activeSeasonSelection}
                  onClick={setActiveSeason}
                  className="h-10 rounded-full"
                >
                  Set active
                </Button>
              </div>
            </div>

            <form onSubmit={createSeason} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="season-name">New season</Label>
                <Input
                  id="season-name"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="2026 Summer"
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-start">Starts</Label>
                <Input
                  id="season-start"
                  type="date"
                  value={newSeasonStartsOn}
                  onChange={(e) => setNewSeasonStartsOn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="season-end">Ends</Label>
                <Input
                  id="season-end"
                  type="date"
                  value={newSeasonEndsOn}
                  onChange={(e) => setNewSeasonEndsOn(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={seasonSubmitting}
                className="mt-auto h-10 rounded-full"
              >
                Create season
              </Button>
            </form>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-5 w-5" />}
          title={filter === "upcoming" ? "No upcoming events" : "Nothing in the past"}
          body={
            ctx?.isAdmin
              ? "Create a match or training to get started."
              : "Your admin hasn't scheduled anything yet."
          }
          action={
            ctx?.isAdmin ? (
              <Link
                to="/events/new"
                search={{ teamId }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                Create event
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group.label}</h2>
              <ul className="space-y-3">
                {group.items.map((ev) => {
                  const d = dateBlock(ev.starts_at);
                  const startDate = new Date(ev.starts_at);
                  const dayLabel = startDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <li key={ev.id}>
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: ev.id }}
                        className="flex items-stretch gap-4 rounded-2xl bg-card p-3 transition-colors hover:bg-secondary"
                      >
                        <div className="grid w-14 shrink-0 place-items-center text-center">
                          <div>
                            <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                              {d.mon}
                            </div>
                            <div className="text-3xl font-extrabold leading-none">{d.day}</div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-bold leading-snug">
                              {ev.title}
                            </p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {dayLabel}
                            </span>
                          </div>
                          {ev.opponent && (
                            <p className="truncate text-xs text-muted-foreground">
                              vs {ev.opponent} · {formatTime(ev.starts_at)}
                            </p>
                          )}
                          {!ev.opponent && (
                            <p className="truncate text-xs text-muted-foreground">
                              {formatTime(ev.starts_at)}
                            </p>
                          )}
                          {ev.location && (
                            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-success/40 px-2 text-success">
                              ✓ {ev.going}
                            </span>
                            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-warning/50 px-2 text-warning-foreground">
                              ? {ev.maybe}
                            </span>
                            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-destructive/40 px-2 text-destructive">
                              ✗ {ev.declined}
                            </span>
                            {ev.home_away && (
                              <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                                {ev.home_away}
                              </span>
                            )}
                          </div>
                          {ev.myStatus && (
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                              You: {ev.myStatus}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
