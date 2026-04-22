import { createFileRoute, Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { Bell, ChevronLeft, MoreHorizontal, Plus, Star, Users } from "lucide-react";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { colorFromString } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/groups/$teamId")({
  head: () => ({ meta: [{ title: "Team — Sixxer" }] }),
  component: TeamLayout,
});

function TeamLayout() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId" });
  const { user } = useAuth();
  const { data, loading, error } = useTeamContext(teamId, user?.id);
  const location = useLocation();

  // Member count
  const [memberCount, setMemberCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    let active = true;
    (async () => {
      const { count } = await supabase
        .from("team_members")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", teamId);
      if (active) setMemberCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [teamId]);

  // Local favorites (per-user, in localStorage)
  const favKey = user ? `sixxer.favorites.${user.id}` : null;
  const [isFav, setIsFav] = React.useState(false);
  React.useEffect(() => {
    if (!favKey) return;
    try {
      const raw = JSON.parse(localStorage.getItem(favKey) ?? "[]") as string[];
      setIsFav(raw.includes(teamId));
    } catch {
      setIsFav(false);
    }
  }, [favKey, teamId]);
  function toggleFav() {
    if (!favKey) return;
    try {
      const raw = JSON.parse(localStorage.getItem(favKey) ?? "[]") as string[];
      const next = raw.includes(teamId) ? raw.filter((x) => x !== teamId) : [...raw, teamId];
      localStorage.setItem(favKey, JSON.stringify(next));
      setIsFav(next.includes(teamId));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "Team not found"}</p>
        <Link to="/groups" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to groups
        </Link>
      </div>
    );
  }

  const tabs = [
    { to: `/groups/${teamId}/events`, label: "Events" },
    { to: `/groups/${teamId}/posts`, label: "Posts" },
    { to: `/groups/${teamId}/payments`, label: "Payments" },
    { to: `/groups/${teamId}/polls`, label: "Polls" },
  ];
  const isOnTab = location.pathname.includes(`/groups/${teamId}/`);
  const eventsPath = `/groups/${teamId}/events`;

  const heroColor = colorFromString(data.team.name);

  return (
    <div className="pb-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden px-4 pb-6 pt-3"
        style={{
          background: `radial-gradient(140% 90% at 50% 100%, ${heroColor} 0%, oklch(0.18 0.02 270) 75%)`,
        }}
      >
        {/* faint diagonal sheen */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 35%, rgba(255,255,255,0.08) 60%, transparent 100%)",
          }}
        />

        {/* Top row: back · title · favorite + create */}
        <div className="relative flex items-start justify-between gap-2 text-white">
          <Link
            to="/groups"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="mt-1 min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              <h1 className="truncate text-lg font-extrabold tracking-tight">{data.team.name}</h1>
            </div>
            <p className="truncate text-xs text-white/85">{data.club.name}</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-1.5 py-1 backdrop-blur-md ring-1 ring-white/20">
            <button
              onClick={toggleFav}
              className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15"
              aria-label={isFav ? "Unfavorite" : "Favorite"}
              aria-pressed={isFav}
            >
              <Star className={"h-4 w-4 " + (isFav ? "fill-white text-white" : "text-white")} />
            </button>
            {data.isAdmin && (
              <Link
                to="/events/new"
                search={{ teamId }}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15"
                aria-label="Create"
              >
                <Plus className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Bottom row: members chip · bell · more */}
        <div className="relative mt-10 flex items-center justify-center gap-2">
          <Link
            to="/groups/$teamId/members"
            params={{ teamId }}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-black/35 px-4 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/15"
          >
            <Users className="h-3.5 w-3.5" />
            {memberCount === null ? "—" : memberCount} member{memberCount === 1 ? "" : "s"}
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md ring-1 ring-white/15"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <Link
            to="/groups/$teamId/settings"
            params={{ teamId }}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md ring-1 ring-white/15"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <nav className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-border bg-background/85 px-3 py-2 backdrop-blur-lg">
        {tabs.map((t) => {
          const active = isOnTab
            ? location.pathname.startsWith(t.to)
            : t.to === eventsPath;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pt-4">
        <Outlet />
      </div>
    </div>
  );
}
