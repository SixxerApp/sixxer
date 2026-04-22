import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Users, ChevronRight } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { colorFromString } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Groups — Pitchside" }] }),
  component: GroupsPage,
});

interface TeamRow {
  id: string;
  name: string;
  banner_color: string;
  club_id: string;
  member_count: number;
}

interface ClubGroup {
  id: string;
  name: string;
  isAdmin: boolean;
  teams: TeamRow[];
}

function GroupsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [clubs, setClubs] = React.useState<ClubGroup[]>([]);
  const isGroupsListRoute = location.pathname === "/groups";

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("club_id, role")
        .eq("user_id", user.id);
      const clubIds = Array.from(new Set((roles ?? []).map((r) => r.club_id)));
      if (clubIds.length === 0) {
        setClubs([]);
        setLoading(false);
        return;
      }
      const isAdminMap: Record<string, boolean> = {};
      for (const r of roles ?? []) {
        if (r.role === "admin") isAdminMap[r.club_id] = true;
      }
      const { data: clubRows } = await supabase
        .from("clubs")
        .select("id, name")
        .in("id", clubIds)
        .order("created_at", { ascending: true });
      const { data: teamRows } = await supabase
        .from("teams")
        .select("id, name, banner_color, club_id")
        .in("club_id", clubIds)
        .order("created_at", { ascending: true });
      const teamIds = (teamRows ?? []).map((t) => t.id);
      const counts: Record<string, number> = {};
      if (teamIds.length) {
        const { data: members } = await supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds);
        for (const m of members ?? []) counts[m.team_id] = (counts[m.team_id] ?? 0) + 1;
      }
      const grouped: ClubGroup[] = (clubRows ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        isAdmin: !!isAdminMap[c.id],
        teams: (teamRows ?? [])
          .filter((t) => t.club_id === c.id)
          .map((t) => ({
            id: t.id,
            name: t.name,
            banner_color: t.banner_color,
            club_id: t.club_id,
            member_count: counts[t.id] ?? 0,
          })),
      }));
      setClubs(grouped);
      setLoading(false);
    })();
  }, [user]);

  if (!isGroupsListRoute) {
    return <Outlet />;
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Groups</h1>
        <Link
          to="/clubs/new"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30"
          aria-label="Create club"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </header>

      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-3xl bg-card" />
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No clubs yet"
            body="Create a club or join one with an invite code to get started."
            action={
              <>
                <Link
                  to="/clubs/new"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Create a club
                </Link>
                <Link
                  to="/join"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold"
                >
                  Join with invite code
                </Link>
              </>
            }
          />
        ) : (
          clubs.map((club) => (
            <section key={club.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {club.name}
                </h2>
                {club.isAdmin && (
                  <Link
                    to="/clubs/$clubId/teams/new"
                    params={{ clubId: club.id }}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Plus className="h-3 w-3" /> Team
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {club.teams.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No teams yet.
                  </p>
                ) : (
                  club.teams.map((t) => (
                    <Link
                      key={t.id}
                      to="/groups/$teamId"
                      params={{ teamId: t.id }}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-secondary"
                    >
                      <span
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white text-lg font-extrabold"
                        style={{ background: colorFromString(t.name) }}
                        aria-hidden
                      >
                        {t.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{t.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.member_count} member{t.member_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  ))
                )}
              </div>
            </section>
          ))
        )}

        {!loading && clubs.length > 0 && (
          <Link
            to="/join"
            className="block rounded-2xl border border-dashed border-border p-3 text-center text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
          >
            Join another club with an invite code
          </Link>
        )}
      </div>
    </div>
  );
}
