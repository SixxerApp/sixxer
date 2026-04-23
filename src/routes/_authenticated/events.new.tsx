import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTeamContext } from "@/lib/team-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { createEventSeries } from "@/features/events/use-event-series";
import {
  describeRecurrence,
  MAX_OCCURRENCES,
  type RecurrenceFreq,
} from "@/features/events/recurrence";

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

type RepeatOption = "none" | RecurrenceFreq;

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function NewEventPage() {
  const { teamId } = useSearch({ from: "/_authenticated/events/new" });
  const { user } = useAuth();
  const { data: ctx, loading: contextLoading } = useTeamContext(teamId, user?.id);
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

  const [repeat, setRepeat] = React.useState<RepeatOption>("none");
  const [interval, setInterval] = React.useState("1");
  const [count, setCount] = React.useState("12");

  if (contextLoading) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="New event" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (!ctx?.isAdmin) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="New event" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Only admins can create events.
        </div>
      </div>
    );
  }

  const intervalNum = clampParsed(interval, 1, 52, 1);
  const countNum = clampParsed(count, 1, MAX_OCCURRENCES, 1);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !teamId) return;
    const finalTitle =
      title ||
      (type === "match" && opponent ? `${homeAway === "home" ? "vs" : "@"} ${opponent}` : "");
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
    const startsAtDate = new Date(startsAt);
    const meetupDate = meetupAt ? new Date(meetupAt) : null;
    const endsAtDate = endsAt ? new Date(endsAt) : null;

    if (repeat !== "none") {
      const meetupOffset =
        meetupDate !== null
          ? Math.round((startsAtDate.getTime() - meetupDate.getTime()) / 60_000)
          : null;
      const duration =
        endsAtDate !== null
          ? Math.round((endsAtDate.getTime() - startsAtDate.getTime()) / 60_000)
          : null;

      const { seriesId, eventIds, error } = await createEventSeries({
        teamId,
        title: parsed.data.title,
        type,
        startsAt: startsAtDate,
        durationMinutes: duration,
        meetupOffsetMinutes: meetupOffset,
        location: location || null,
        locationUrl: null,
        description: description || null,
        createdBy: user.id,
        recurrence: { freq: repeat, interval: intervalNum, count: countNum },
        opponent: type === "match" ? opponent || null : null,
        homeAway: type === "match" ? homeAway : null,
      });

      setSubmitting(false);
      if (error || !seriesId || eventIds.length === 0) {
        toast.error(error?.message ?? "Could not create series");
        return;
      }
      toast.success(`Created ${eventIds.length} events`);
      navigate({ to: "/events/$eventId", params: { eventId: eventIds[0] } });
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        team_id: teamId,
        type,
        title: parsed.data.title,
        opponent: type === "match" ? opponent || null : null,
        home_away: type === "match" ? homeAway : null,
        starts_at: startsAtDate.toISOString(),
        meetup_at: meetupDate?.toISOString() ?? null,
        ends_at: endsAtDate?.toISOString() ?? null,
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
          <Label htmlFor="title">
            Title {type === "match" && <span className="text-muted-foreground">(optional)</span>}
          </Label>
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

        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <Label htmlFor="repeat">Repeats</Label>
          <select
            id="repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as RepeatOption)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {repeat !== "none" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="interval">Every</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="count">How many times</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={MAX_OCCURRENCES}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                {describeRecurrence({ freq: repeat, interval: intervalNum, count: countNum })}. Each
                instance gets its own RSVPs and can be cancelled individually.
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-full text-sm font-semibold"
        >
          {submitting
            ? "Creating…"
            : repeat === "none"
              ? "Create event"
              : `Create ${countNum} events`}
        </Button>
      </form>
    </div>
  );
}

function clampParsed(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
