import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Plus, Wallet, CalendarPlus } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { dateBlock, formatMoney, formatRelativeDay, formatTime } from "@/lib/format";
import { InitialAvatar } from "@/components/Avatar";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Sixxer" }] }),
  component: HomePage,
});

interface UpcomingEvent {
  id: string;
  team_id: string;
  team_name: string;
  title: string;
  starts_at: string;
  home_away: "home" | "away" | null;
}

interface OutstandingPayment {
  request_id: string;
  title: string;
  amount_cents: number;
  currency: string;
  due_at: string | null;
}

function HomePage() {
  const { user } = useAuth();
  const [name, setName] = React.useState("Player");
  const [events, setEvents] = React.useState<UpcomingEvent[]>([]);
  const [payments, setPayments] = React.useState<OutstandingPayment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.full_name) setName(prof.full_name);

      // Teams I'm a member of
      const { data: tm } = await supabase
        .from("team_members")
        .select("team_id, teams:team_id(id, name)")
        .eq("user_id", user.id);
      const teamIds = (tm ?? []).map((t) => t.team_id);
      const teamNames: Record<string, string> = {};
      for (const t of tm ?? []) {
        const team = t.teams as { id: string; name: string } | null;
        if (team) teamNames[team.id] = team.name;
      }
      if (teamIds.length) {
        const now = new Date().toISOString();
        const { data: evs } = await supabase
          .from("events")
          .select("id, team_id, title, starts_at, home_away")
          .in("team_id", teamIds)
          .gte("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(5);
        setEvents(
          (evs ?? []).map((e) => ({
            ...e,
            team_name: teamNames[e.team_id] ?? "Team",
          })),
        );
      } else {
        setEvents([]);
      }

      // Outstanding payments for me
      const { data: assigns } = await supabase
        .from("payment_assignments")
        .select("request_id, status")
        .eq("user_id", user.id)
        .in("status", ["unpaid", "rejected"]);
      const reqIds = (assigns ?? []).map((a) => a.request_id);
      if (reqIds.length) {
        const { data: reqs } = await supabase
          .from("payment_requests")
          .select("id, title, amount_cents, currency, due_at")
          .in("id", reqIds)
          .order("due_at", { ascending: true, nullsFirst: false });
        setPayments(
          (reqs ?? []).map((r) => ({
            request_id: r.id,
            title: r.title,
            amount_cents: r.amount_cents,
            currency: r.currency,
            due_at: r.due_at,
          })),
        );
      } else {
        setPayments([]);
      }
      setLoading(false);
    })();
  }, [user]);

  const firstName = name.split(" ")[0];

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/profile" aria-label="Profile">
            <InitialAvatar name={name} size={44} />
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-xl font-extrabold tracking-tight">Hey {firstName} 👋</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            to="/groups"
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30"
            aria-label="Create"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="mt-7">
        <h2 className="mb-3 text-base font-bold tracking-tight">Upcoming</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-card" />
        ) : events.length === 0 ? (
          <Link
            to="/groups"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground"
          >
            <CalendarPlus className="h-5 w-5 text-primary" />
            No fixtures yet — join or create a club.
          </Link>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const d = dateBlock(e.starts_at);
              return (
                <li key={e.id}>
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: e.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-secondary">
                      <div className="text-center">
                        <div className="text-[10px] font-bold tracking-wider text-primary">
                          {d.mon}
                        </div>
                        <div className="text-2xl font-extrabold leading-none">{d.day}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.team_name} · {formatTime(e.starts_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-base font-bold tracking-tight">Outstanding payments</h2>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-card" />
        ) : payments.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Wallet className="h-5 w-5 text-success" />
            Nothing outstanding. Nice 🎉
          </div>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.request_id}>
                <Link
                  to="/payments/$paymentId"
                  params={{ paymentId: p.request_id }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    {p.due_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Due {formatRelativeDay(p.due_at)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-primary">
                    {formatMoney(p.amount_cents, p.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
