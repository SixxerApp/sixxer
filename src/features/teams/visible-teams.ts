import { supabase } from "@/integrations/supabase/client";

export interface VisibleTeam {
  id: string;
  name: string;
  club_id: string;
}

function addTeam(map: Map<string, VisibleTeam>, team: VisibleTeam | null) {
  if (!team) return;
  map.set(team.id, team);
}

export async function fetchVisibleTeamsForUser(userId: string): Promise<VisibleTeam[]> {
  const teams = new Map<string, VisibleTeam>();

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, teams:team_id(id, name, club_id)")
    .eq("user_id", userId);

  for (const membership of memberships ?? []) {
    addTeam(teams, membership.teams as VisibleTeam | null);
  }

  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("club_id")
    .eq("user_id", userId)
    .eq("role", "admin");

  const adminClubIds = Array.from(new Set((adminRoles ?? []).map((role) => role.club_id)));
  if (adminClubIds.length > 0) {
    const { data: adminTeams } = await supabase
      .from("teams")
      .select("id, name, club_id")
      .in("club_id", adminClubIds)
      .order("created_at", { ascending: true });

    for (const team of adminTeams ?? []) {
      addTeam(teams, team);
    }
  }

  return Array.from(teams.values());
}
