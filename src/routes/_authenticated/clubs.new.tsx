import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";

const teamName = z.string().trim().min(2, "Team name is too short").max(80);
const schema = z.object({
  clubName: z.string().trim().min(2, "Club name is too short").max(80),
  teams: z.array(teamName).min(1, "Add at least one team"),
});

export const Route = createFileRoute("/_authenticated/clubs/new")({
  head: () => ({ meta: [{ title: "Create club — Pitchside" }] }),
  component: NewClubPage,
});

function NewClubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubName, setClubName] = React.useState("");
  const [teams, setTeams] = React.useState<string[]>([""]);
  const [submitting, setSubmitting] = React.useState(false);

  function updateTeam(i: number, v: string) {
    setTeams((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  }
  function addTeam() {
    setTeams((prev) => [...prev, ""]);
  }
  function removeTeam(i: number) {
    setTeams((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cleaned = teams.map((t) => t.trim()).filter(Boolean);
    const parsed = schema.safeParse({ clubName, teams: cleaned });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { data: club, error: clubErr } = await supabase
      .from("clubs")
      .insert({ name: parsed.data.clubName, created_by: user.id })
      .select("id")
      .single();
    if (clubErr || !club) {
      setSubmitting(false);
      toast.error(clubErr?.message ?? "Could not create club");
      return;
    }
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, club_id: club.id, role: "admin" });
    if (roleErr) {
      setSubmitting(false);
      toast.error(roleErr.message);
      return;
    }
    const { data: teamRows, error: teamErr } = await supabase
      .from("teams")
      .insert(parsed.data.teams.map((name) => ({ club_id: club.id, name })))
      .select("id");
    if (teamErr || !teamRows) {
      setSubmitting(false);
      toast.error(teamErr?.message ?? "Could not create teams");
      return;
    }
    await supabase
      .from("team_members")
      .insert(teamRows.map((t) => ({ team_id: t.id, user_id: user.id })));
    setSubmitting(false);
    toast.success(`Club created with ${teamRows.length} team${teamRows.length === 1 ? "" : "s"}`);
    navigate({ to: "/groups/$teamId", params: { teamId: teamRows[0].id } });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Create a club" back="/groups" />
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ll be the admin and can invite players right after.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="clubName">Club name</Label>
          <Input
            id="clubName"
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="Redmond Cricket Club"
            required
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label>Teams</Label>
          <div className="space-y-2">
            {teams.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t}
                  onChange={(e) => updateTeam(i, e.target.value)}
                  placeholder={i === 0 ? "Mavericks" : `Team ${i + 1}`}
                  maxLength={80}
                />
                {teams.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeam(i)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                    aria-label={`Remove team ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTeam}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add another team
          </button>
          <p className="text-xs text-muted-foreground">
            You can also add more teams later from the Groups page.
          </p>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Creating…" : "Create club"}
        </Button>
      </form>
    </div>
  );
}
