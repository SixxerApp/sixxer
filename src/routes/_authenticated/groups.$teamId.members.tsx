import { createFileRoute, useParams } from "@tanstack/react-router";
import { Copy, UserPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { InitialAvatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { generateInviteCode } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/groups/$teamId/members")({
  component: MembersTab,
});

interface Member {
  user_id: string;
  full_name: string;
  is_admin: boolean;
}

function MembersTab() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/members" });
  const { user } = useAuth();
  const { data: ctx } = useTeamContext(teamId, user?.id);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCode, setActiveCode] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: tm } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId);
    const ids = (tm ?? []).map((m) => m.user_id);
    if (ids.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    let admins: string[] = [];
    if (ctx) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("club_id", ctx.club.id)
        .eq("role", "admin");
      admins = (roles ?? []).map((r) => r.user_id);
    }
    setMembers(
      (profs ?? []).map((p) => ({
        user_id: p.id,
        full_name: p.full_name,
        is_admin: admins.includes(p.id),
      })),
    );
    setLoading(false);
  }, [teamId, ctx]);

  React.useEffect(() => {
    void load();
    if (ctx?.isAdmin) {
      // load most recent active invite if any
      (async () => {
        const { data } = await supabase
          .from("invites")
          .select("code")
          .eq("club_id", ctx.club.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data[0]) setActiveCode(data[0].code);
      })();
    }
  }, [load, ctx]);

  async function createInvite() {
    if (!user || !ctx) return;
    setCreating(true);
    const code = generateInviteCode();
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    const { data, error } = await supabase
      .from("invites")
      .insert({
        club_id: ctx.club.id,
        team_id: teamId,
        code,
        created_by: user.id,
        expires_at: expires.toISOString(),
      })
      .select("code")
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create invite");
      return;
    }
    setActiveCode(data.code);
    toast.success("Invite code ready");
  }

  function copyCode() {
    if (!activeCode) return;
    void navigator.clipboard.writeText(activeCode);
    toast.success("Code copied");
  }

  return (
    <div className="space-y-4">
      {ctx?.isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-primary" /> Invite players
          </div>
          {activeCode ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-secondary px-4 py-3 text-center text-xl font-extrabold tracking-[0.4em] uppercase">
                {activeCode}
              </div>
              <button
                onClick={copyCode}
                className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={createInvite}
              disabled={creating}
              className="mt-3 inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {creating ? "Creating…" : "Generate invite code"}
            </button>
          )}
          {activeCode && (
            <p className="mt-2 text-xs text-muted-foreground">
              Share this code. Players join via Groups → Join with invite code.
            </p>
          )}
          {activeCode && (
            <button
              onClick={createInvite}
              disabled={creating}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Generate a new code
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState title="No members yet" body="Invite players to start building your squad." />
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <InitialAvatar name={m.full_name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {m.full_name}
                  {m.user_id === user?.id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </p>
              </div>
              {m.is_admin && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Admin
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
