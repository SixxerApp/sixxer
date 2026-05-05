import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  Shield,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { dateBlock, formatMoney, formatRelativeDay, formatTime } from "@/lib/format";
import { InitialAvatar } from "@/components/Avatar";
import { useHomeSummary } from "@/features/home/use-home-summary";
import { useUserGroups } from "@/features/teams/use-user-groups";
import { isPaymentOverdue } from "@/features/payments/use-payment-detail";
import { useUnreadNotificationCount } from "@/features/notifications/use-notification-center";

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
  const { name, events, payments, adminActions, loading } = useHomeSummary(user?.id, fallbackName);
  const { clubs, loading: groupsLoading } = useUserGroups(user?.id);
  const { count: unreadNotifications } = useUnreadNotificationCount(user?.id);

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
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground"
            aria-label={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
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

      {adminTeams.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight">Command center</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {adminActions.length > 0 ? `${adminActions.length} to review` : "Admin"}
            </span>
          </div>
          {loading || groupsLoading ? (
            <div className="h-28 animate-pulse rounded-2xl bg-card" />
          ) : adminActions.length > 0 ? (
            <ul className="space-y-2">
              {adminActions.map((action) => {
                const isPayment = action.type === "payment";
                const toneClass =
                  action.tone === "danger"
                    ? "border-destructive/55 text-destructive"
                    : "border-warning/60 text-warning-foreground";
                const iconClass =
                  action.tone === "danger"
                    ? "bg-destructive/12 text-destructive"
                    : "bg-warning/15 text-warning-foreground";
                return (
                  <li key={action.id}>
                    <Link
                      to={isPayment ? "/payments/$paymentId" : "/events/$eventId"}
                      params={
                        isPayment
                          ? { paymentId: action.payment_id ?? "" }
                          : { eventId: action.event_id ?? "" }
                      }
                      className={`flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 ${toneClass}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconClass}`}
                        >
                          {isPayment ? (
                            <CreditCard className="h-5 w-5" />
                          ) : (
                            <ClipboardList className="h-5 w-5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {action.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {action.team_name}
                          </p>
                          <p className="mt-1 text-xs font-semibold">{action.body}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Nothing needs follow-up.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Set up the next event, invite players, or collect club dues.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Link
                  to="/events/new"
                  search={{ teamId: adminTeams[0]?.teamId ?? "" }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-bold text-foreground"
                >
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  Event
                </Link>
                <Link
                  to="/groups/$teamId/members"
                  params={{ teamId: adminTeams[0]?.teamId ?? "" }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-bold text-foreground"
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  Invite
                </Link>
                <Link
                  to="/payments/new"
                  search={{ teamId: adminTeams[0]?.teamId ?? "" }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-bold text-foreground"
                >
                  <Wallet className="h-4 w-4 text-primary" />
                  Payment
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

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
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold">
                        <span className="inline-flex h-5 items-center gap-0.5 rounded-full border border-success/40 px-1.5 text-success">
                          ✓ {e.going}
                        </span>
                        <span className="inline-flex h-5 items-center gap-0.5 rounded-full border border-warning/50 px-1.5 text-warning-foreground">
                          ? {e.maybe}
                        </span>
                        <span className="inline-flex h-5 items-center gap-0.5 rounded-full border border-destructive/40 px-1.5 text-destructive">
                          ✗ {e.declined}
                        </span>
                        {e.my_status && (
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-primary">
                            You: {e.my_status}
                          </span>
                        )}
                      </div>
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
            {payments.map((p) => {
              const overdue = isPaymentOverdue(p.due_at, "unpaid");
              return (
                <li key={p.request_id}>
                  <Link
                    to="/payments/$paymentId"
                    params={{ paymentId: p.request_id }}
                    className={
                      "flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 " +
                      (overdue ? "border-destructive/60" : "border-border")
                    }
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{p.title}</p>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>
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
              );
            })}
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
