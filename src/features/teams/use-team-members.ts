import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteCode } from "@/lib/format";

export interface MemberRow {
  user_id: string;
  full_name: string;
  is_admin: boolean;
}

interface TeamMembersOptions {
  teamId: string;
  clubId: string | undefined;
  userId: string | undefined;
  isAdmin: boolean;
}

async function fetchTeamMembers(teamId: string, clubId: string | undefined) {
  const { data: memberships } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);
  const ids = (memberships ?? []).map((member) => member.user_id);
  if (ids.length === 0) {
    return [];
  }

  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  let admins: string[] = [];
  if (clubId) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("club_id", clubId)
      .eq("role", "admin");
    admins = (roles ?? []).map((role) => role.user_id);
  }

  return (profiles ?? []).map((profile) => ({
    user_id: profile.id,
    full_name: profile.full_name,
    is_admin: admins.includes(profile.id),
  })) satisfies MemberRow[];
}

async function fetchLatestInviteCode(clubId: string | undefined) {
  if (!clubId) return null;

  const { data } = await supabase
    .from("invites")
    .select("code")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(1);

  return data?.[0]?.code ?? null;
}

export async function createInviteCode(teamId: string, clubId: string, userId: string) {
  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const { data, error } = await supabase
    .from("invites")
    .insert({
      club_id: clubId,
      team_id: teamId,
      code,
      created_by: userId,
      expires_at: expiresAt.toISOString(),
    })
    .select("code")
    .single();

  return { data, error };
}

export function useTeamMembers({ teamId, clubId, userId, isAdmin }: TeamMembersOptions) {
  const [members, setMembers] = React.useState<MemberRow[]>([]);
  const [activeCode, setActiveCode] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setMembers(await fetchTeamMembers(teamId, clubId));
    if (isAdmin) {
      setActiveCode(await fetchLatestInviteCode(clubId));
    }
    setLoading(false);
  }, [clubId, isAdmin, teamId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const createInvite = React.useCallback(async () => {
    if (!userId || !clubId) return { error: new Error("Missing invite context"), data: null };
    setCreating(true);
    const result = await createInviteCode(teamId, clubId, userId);
    setCreating(false);
    if (!result.error && result.data) {
      setActiveCode(result.data.code);
    }
    return result;
  }, [clubId, teamId, userId]);

  return { members, activeCode, loading, creating, reload: load, createInvite, setActiveCode };
}
