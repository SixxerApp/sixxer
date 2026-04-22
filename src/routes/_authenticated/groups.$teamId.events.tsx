import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CalendarPlus, ChevronDown, MapPin } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { dateBlock, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/groups/$teamId/events")({
  component: EventsTab,
});

interface EventCard {
  id: string;
  title: string;
  type: "match" | "event";
  opponent: string | null;
  home_away: "home" | "away" | null;
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
  const [filter, setFilter] = React.useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = React.useState<EventCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const q = supabase
        .from("events")
        .select("id, title, type, opponent, home_away, starts_at, location")
        .eq("team_id", teamId);
      const { data: rows } = filter === "upcoming"
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
  }, [teamId, user, filter]);

  const grouped = React.useMemo(() => groupByWeek(events), [events]);

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setFilter(filter === "upcoming" ? "past" : "upcoming")}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          {filter === "upcoming" ? "Upcoming" : "Past"}
          <ChevronDown className="h-4 w-4" />
        </button>
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
