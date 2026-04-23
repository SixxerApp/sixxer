import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightLeft, Bell, CalendarPlus, Shield, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { dateBlock, formatMoney, formatRelativeDay, formatTime } from "@/lib/format";
import { InitialAvatar } from "@/components/Avatar";
import { useHomeSummary } from "@/features/home/use-home-summary";
import { useUserGroups } from "@/features/teams/use-user-groups";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Sixxer" }] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const fallbackName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user?.email?.split("@")[0] ||
    "Player";
  const { name, events, payments, loading } = useHomeSummary(user?.id, fallbackName);
  const { clubs, loading: groupsLoading } = useUserGroups(user?.id);

  const firstName = name.split(" ")[0];
  const teams = clubs.flatMap((club) =>
    club.teams.map((team) => ({
      clubId: club.id,
      clubName: club.name,
      teamId: team.id,
      teamName: team.name,
      isAdmin: club.isAdmin,
    })),
  );
  const adminTeams = teams.filter((team) => team.isAdmin);
  const totalOwed = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);

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
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground"
            aria-label="Switch teams"
          >
            <ArrowRightLeft className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight">Next 7 days</h2>
          <Link to="/groups" className="text-xs font-semibold text-primary">
            All teams
          </Link>
        </div>
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-card" />
        ) : events.length === 0 ? (
          <Link
            to="/groups"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground"
          >
            <CalendarPlus className="h-5 w-5 text-primary" />
            Nothing scheduled in the next week.
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight">What you owe</h2>
          {!loading && payments.length > 0 && (
            <span className="text-sm font-extrabold text-primary">
              {formatMoney(totalOwed, payments[0]?.currency ?? "USD")}
            </span>
          )}
        </div>
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
                    <p className="text-[11px] text-muted-foreground">
                      To {p.requested_by_name} · {p.team_name}
                    </p>
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

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight">Your teams</h2>
          <Link to="/groups" className="text-xs font-semibold text-primary">
            Switch
          </Link>
        </div>
        {groupsLoading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-card" />
        ) : teams.length === 0 ? (
          <Link
            to="/join"
            className="block rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground"
          >
            Join a club with an invite code.
          </Link>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <Link
                key={team.teamId}
                to="/groups/$teamId"
                params={{ teamId: team.teamId }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{team.teamName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{team.clubName}</p>
                </div>
                <span className="text-xs font-semibold text-primary">Open</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {adminTeams.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold tracking-tight">Admin tools</h2>
          <div className="space-y-2">
            {adminTeams.map((team) => (
              <Link
                key={team.teamId}
                to="/groups/$teamId/members"
                params={{ teamId: team.teamId }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-primary">
                    <Shield className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      Create access for {team.teamName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Invite players and manage membership
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">Manage</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
