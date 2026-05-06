import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamSeason {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
}

export function useTeamSeasons(teamId: string | undefined) {
  const [seasons, setSeasons] = React.useState<TeamSeason[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!teamId) {
      setSeasons([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("seasons")
      .select("id, name, starts_on, ends_on, is_active")
      .eq("team_id", teamId)
      .order("is_active", { ascending: false })
      .order("starts_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    setSeasons(data ?? []);
    setLoading(false);
  }, [teamId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    seasons,
    activeSeason: seasons.find((season) => season.is_active) ?? null,
    loading,
    refresh,
  };
}
