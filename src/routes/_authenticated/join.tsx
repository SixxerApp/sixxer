import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({ meta: [{ title: "Join with code — Pitchside" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      toast.error("Enter a valid invite code");
      return;
    }
    setSubmitting(true);
    const { data: invite, error } = await supabase
      .from("invites")
      .select("club_id, team_id, expires_at")
      .eq("code", trimmed)
      .maybeSingle();
    if (error || !invite) {
      setSubmitting(false);
      toast.error("Invite code not found");
      return;
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setSubmitting(false);
      toast.error("This invite has expired");
      return;
    }
    // Add as player (RLS allows since invite exists)
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, club_id: invite.club_id, role: "player" });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      setSubmitting(false);
      toast.error(roleErr.message);
      return;
    }
    // Add to team if specified, else first team in club
    let teamId = invite.team_id;
    if (!teamId) {
      const { data: t } = await supabase
        .from("teams")
        .select("id")
        .eq("club_id", invite.club_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      teamId = t?.id ?? null;
    }
    if (teamId) {
      await supabase.from("team_members").insert({ team_id: teamId, user_id: user.id });
    }
    setSubmitting(false);
    toast.success("Joined!");
    if (teamId) navigate({ to: "/groups/$teamId", params: { teamId } });
    else navigate({ to: "/groups" });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Join with invite code" back="/groups" />
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Invite code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="text-center text-xl font-bold tracking-[0.4em] uppercase"
            maxLength={12}
            autoComplete="off"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">Ask your club admin for the code.</p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Joining…" : "Join club"}
        </Button>
      </form>
    </div>
  );
}
