import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamRow {
  id: string;
  name: string;
  banner_color: string;
  club_id: string;
  member_count: number;
}

export interface ClubGroup {
  id: string;
  name: string;
  isAdmin: boolean;
  teams: TeamRow[];
}

async function fetchUserGroups(userId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("club_id, role")
    .eq("user_id", userId);

  const clubIds = Array.from(new Set((roles ?? []).map((role) => role.club_id)));
  if (clubIds.length === 0) {
    return [];
  }

  const isAdminMap: Record<string, boolean> = {};
  for (const role of roles ?? []) {
    if (role.role === "admin") {
      isAdminMap[role.club_id] = true;
    }
  }

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name")
    .in("id", clubIds)
    .order("created_at", { ascending: true });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, banner_color, club_id")
    .in("club_id", clubIds)
    .order("created_at", { ascending: true });

  const teamIds = (teams ?? []).map((team) => team.id);
  const counts: Record<string, number> = {};
  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds);
    for (const member of members ?? []) {
      counts[member.team_id] = (counts[member.team_id] ?? 0) + 1;
    }
  }

  return (clubs ?? []).map((club) => ({
    id: club.id,
    name: club.name,
    isAdmin: !!isAdminMap[club.id],
    teams: (teams ?? [])
      .filter((team) => team.club_id === club.id)
      .map((team) => ({
        id: team.id,
        name: team.name,
        banner_color: team.banner_color,
        club_id: team.club_id,
        member_count: counts[team.id] ?? 0,
      })),
  })) satisfies ClubGroup[];
}

export function useUserGroups(userId: string | undefined) {
  const [clubs, setClubs] = React.useState<ClubGroup[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) return;

    let active = true;
    void (async () => {
      setLoading(true);
      const nextClubs = await fetchUserGroups(userId);
      if (!active) return;
      setClubs(nextClubs);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  return { clubs, loading };
}
