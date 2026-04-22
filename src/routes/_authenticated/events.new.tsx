import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/events/new")({
  validateSearch: (s: Record<string, unknown>) => ({ teamId: String(s.teamId ?? "") }),
  head: () => ({ meta: [{ title: "New event — Sixxer" }] }),
  component: NewEventPage,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  startsAt: z.string().min(1),
  location: z.string().trim().max(200).optional(),
  opponent: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
});

function NewEventPage() {
  const { teamId } = useSearch({ from: "/_authenticated/events/new" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = React.useState<"match" | "event">("match");
  const [homeAway, setHomeAway] = React.useState<"home" | "away">("home");
  const [title, setTitle] = React.useState("");
  const [opponent, setOpponent] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [meetupAt, setMeetupAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !teamId) return;
    const finalTitle =
      title || (type === "match" && opponent ? `${homeAway === "home" ? "vs" : "@"} ${opponent}` : "");
    const parsed = schema.safeParse({
      title: finalTitle,
      startsAt,
      location,
      opponent,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        team_id: teamId,
        type,
        title: parsed.data.title,
        opponent: type === "match" ? opponent || null : null,
        home_away: type === "match" ? homeAway : null,
        starts_at: new Date(startsAt).toISOString(),
        meetup_at: meetupAt ? new Date(meetupAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        location: location || null,
        description: description || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create event");
      return;
    }
    toast.success("Event created");
    navigate({ to: "/events/$eventId", params: { eventId: data.id } });
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="New event" />
      <div className="mt-4 inline-flex rounded-full border border-border bg-card p-1">
        {(["match", "event"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold capitalize " +
              (type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            {t === "match" ? "Match" : "Other"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {type === "match" && (
          <>
            <div className="space-y-1.5">
              <Label>Home / Away</Label>
              <div className="inline-flex rounded-full border border-border bg-card p-1">
                {(["home", "away"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHomeAway(h)}
                    className={
                      "rounded-full px-4 py-1.5 text-xs font-semibold capitalize " +
                      (homeAway === h
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground")
                    }
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Hawks CC"
                maxLength={80}
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title {type === "match" && <span className="text-muted-foreground">(optional)</span>}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "match" ? "Auto: vs Opponent" : "Friday training"}
            maxLength={120}
            required={type !== "match"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="starts">Start time</Label>
          <Input
            id="starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="meetup">Meet at</Label>
            <Input
              id="meetup"
              type="datetime-local"
              value={meetupAt}
              onChange={(e) => setMeetupAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ends">Ends</Label>
            <Input
              id="ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Riverside Ground, Pitch 2"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Notes</Label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bring whites. Tea provided."
            rows={3}
            maxLength={1000}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting ? "Creating…" : "Create event"}
        </Button>
      </form>
    </div>
  );
}
