import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamContext {
  team: { id: string; name: string; banner_color: string; club_id: string };
  club: { id: string; name: string };
  isAdmin: boolean;
  isMember: boolean;
}

async function fetchTeamContext(teamId: string, userId: string) {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, banner_color, club_id, clubs:club_id(id, name)")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError || !team) {
    throw new Error(teamError?.message ?? "Team not found");
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", team.club_id);

  return {
    team: {
      id: team.id,
      name: team.name,
      banner_color: team.banner_color,
      club_id: team.club_id,
    },
    club: team.clubs as { id: string; name: string },
    isAdmin: (roles ?? []).some((role) => role.role === "admin"),
    isMember: (roles ?? []).length > 0,
  } satisfies TeamContext;
}

export function useTeamContext(teamId: string, userId: string | undefined) {
  const [data, setData] = React.useState<TeamContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchTeamContext(teamId, userId);
        if (!active) return;
        setData(nextData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Team not found");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [teamId, userId]);

  return { data, loading, error };
}
