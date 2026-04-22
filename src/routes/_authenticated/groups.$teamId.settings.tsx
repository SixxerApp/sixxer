import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/groups/$teamId/settings")({
  component: TeamSettings,
});

function TeamSettings() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/settings" });
  const { user } = useAuth();
  const { data, loading } = useTeamContext(teamId, user?.id);
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (data) setName(data.team.name);
  }, [data]);

  if (loading || !data) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function leaveTeam() {
    if (!user) return;
    if (!confirm("Leave this team?")) return;
    await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id);
    toast.success("Left team");
    navigate({ to: "/groups" });
  }

  return (
    <div className="space-y-4">
      {data.isAdmin ? (
        <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Label htmlFor="name">Team name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : (
        <Link
          to="/groups/$teamId"
          params={{ teamId }}
          className="block rounded-2xl border border-border bg-card p-4 text-sm"
        >
          ← Back to {data.team.name}
        </Link>
      )}

      <button
        onClick={leaveTeam}
        className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
      >
        Leave team
      </button>
    </div>
  );
}
