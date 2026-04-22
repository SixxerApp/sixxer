import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";

const schema = z.object({ teamName: z.string().trim().min(2).max(80) });

export const Route = createFileRoute("/_authenticated/clubs/$clubId/teams/new")({
  head: () => ({ meta: [{ title: "Add team — Sixxer" }] }),
  component: NewTeamPage,
});

function NewTeamPage() {
  const { clubId } = useParams({ from: "/_authenticated/clubs/$clubId/teams/new" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [clubName, setClubName] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clubs").select("name").eq("id", clubId).maybeSingle();
      if (data) setClubName(data.name);
    })();
  }, [clubId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ teamName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ club_id: clubId, name: parsed.data.teamName })
      .select("id")
      .single();
    if (error || !team) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not create team");
      return;
    }
    await supabase.from("team_members").insert({ team_id: team.id, user_id: user.id });
    setSubmitting(false);
    toast.success("Team created");
    navigate({ to: "/groups/$teamId", params: { teamId: team.id } });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Add a team" subtitle={clubName ?? undefined} back="/groups" />
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="teamName">Team name</Label>
          <Input
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="2nd XI"
            required
            maxLength={80}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            You&apos;ll be added as a member automatically.
          </p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Creating…" : "Create team"}
        </Button>
      </form>
    </div>
  );
}
