import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformServices } from "@/platform";
import { useTeamContext } from "./use-team-context";

function getFavoritesKey(userId: string) {
  return `sixxer.favorites.${userId}`;
}

export function useFavoriteTeam(userId: string | undefined, teamId: string) {
  const [isFavorite, setIsFavorite] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;
    const favorites = platformServices.storage.getJson<string[]>(getFavoritesKey(userId), []);
    setIsFavorite(favorites.includes(teamId));
  }, [teamId, userId]);

  const toggleFavorite = React.useCallback(() => {
    if (!userId) return;

    const storageKey = getFavoritesKey(userId);
    const current = platformServices.storage.getJson<string[]>(storageKey, []);
    const next = current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : [...current, teamId];

    platformServices.storage.setJson(storageKey, next);
    setIsFavorite(next.includes(teamId));
  }, [teamId, userId]);

  return { isFavorite, toggleFavorite };
}

export function useTeamMemberCount(teamId: string) {
  const [memberCount, setMemberCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const { count } = await supabase
        .from("team_members")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", teamId);
      if (active) {
        setMemberCount(count ?? 0);
      }
    })();

    return () => {
      active = false;
    };
  }, [teamId]);

  return memberCount;
}

export function useTeamLayout(teamId: string, userId: string | undefined) {
  const teamContext = useTeamContext(teamId, userId);
  const memberCount = useTeamMemberCount(teamId);
  const favoriteTeam = useFavoriteTeam(userId, teamId);

  return {
    ...teamContext,
    memberCount,
    ...favoriteTeam,
  };
}
