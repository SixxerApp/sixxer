import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamContext {
  team: { id: string; name: string; banner_color: string; club_id: string };
  club: { id: string; name: string };
  isAdmin: boolean;
  isMember: boolean;
}

export function useTeamContext(teamId: string, userId: string | undefined) {
  const [data, setData] = React.useState<TeamContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: team, error: tErr } = await supabase
        .from("teams")
        .select("id, name, banner_color, club_id, clubs:club_id(id, name)")
        .eq("id", teamId)
        .maybeSingle();
      if (!active) return;
      if (tErr || !team) {
        setError(tErr?.message ?? "Team not found");
        setLoading(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("club_id", team.club_id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      const isMember = (roles ?? []).length > 0;
      setData({
        team: { id: team.id, name: team.name, banner_color: team.banner_color, club_id: team.club_id },
        club: team.clubs as { id: string; name: string },
        isAdmin,
        isMember,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [teamId, userId]);

  return { data, loading, error };
}
