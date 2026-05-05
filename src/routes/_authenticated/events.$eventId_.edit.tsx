import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Info, Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventAdmin } from "@/features/events/use-event-admin";
import { useEventDetail } from "@/features/events/use-event-detail";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/events/$eventId_/edit")({
  head: () => ({ meta: [{ title: "Edit event - Sixxer" }] }),
  component: EditEventPage,
});

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  opponent: z.string().trim().max(80).optional(),
  location: z.string().trim().max(200).optional(),
  locationUrl: z.string().trim().max(500).optional(),
  scoringUrl: z.string().trim().max(500).optional(),
  description: z.string().trim().max(1000).optional(),
});

function EditEventPage() {
  const { eventId } = useParams({ from: "/_authenticated/events/$eventId_/edit" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { event, loading } = useEventDetail(eventId, user?.id);
  const admin = useEventAdmin(eventId, user?.id);
  const [title, setTitle] = React.useState("");
  const [opponent, setOpponent] = React.useState("");
  const [homeAway, setHomeAway] = React.useState<"" | "home" | "away">("");
  const [startsAt, setStartsAt] = React.useState("");
  const [meetupAt, setMeetupAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [locationUrl, setLocationUrl] = React.useState("");
  const [scoringUrl, setScoringUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setOpponent(event.opponent ?? "");
    setHomeAway(event.home_away ?? "");
    setStartsAt(toLocalDateTimeInput(event.starts_at));
    setMeetupAt(toLocalDateTimeInput(event.meetup_at));
    setEndsAt(toLocalDateTimeInput(event.ends_at));
    setLocation(event.location ?? "");
    setLocationUrl(event.location_url ?? "");
    setScoringUrl(event.scoring_url ?? "");
    setDescription(event.description ?? "");
  }, [event]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !admin.isAdmin) return;

    const parsed = schema.safeParse({
      title,
      opponent,
      location,
      locationUrl,
      scoringUrl,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }

    const startsDate = parseDateTimeInput(startsAt);
    const meetupDate = parseDateTimeInput(meetupAt);
    const endsDate = parseDateTimeInput(endsAt);
    if (!startsDate) {
      toast.error("Start time is required");
      return;
    }
    if (endsDate && endsDate.getTime() <= startsDate.getTime()) {
      toast.error("End time must be after start time");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("events")
      .update({
        title: parsed.data.title,
        opponent: event.type === "match" ? parsed.data.opponent || null : null,
        home_away: event.type === "match" ? homeAway || null : null,
        starts_at: startsDate.toISOString(),
        meetup_at: meetupDate?.toISOString() ?? null,
        ends_at: endsDate?.toISOString() ?? null,
        location: parsed.data.location || null,
        location_url: parsed.data.locationUrl || null,
        scoring_url: event.type === "match" ? parsed.data.scoringUrl || null : null,
        description: parsed.data.description || null,
      })
      .eq("id", event.id);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(event.series_id ? "This instance was updated" : "Event updated");
    navigate({ to: "/events/$eventId", params: { eventId: event.id } });
  }

  if (loading || admin.loading) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="Edit event" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="Edit event" />
        <p className="mt-4 text-sm text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  if (!admin.isAdmin) {
    return (
      <div className="px-5 pb-10">
        <PageHeader title="Edit event" />
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Only admins can edit events.
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-10">
      <PageHeader title="Edit event" />

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            {event.series_id
              ? "Changes on this page update only this instance. Editing this and all future events in the series is a follow-up."
              : "Changes update this one-off event. Existing RSVPs stay attached."}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {event.type === "match" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="home-away">Home / Away</Label>
              <select
                id="home-away"
                value={homeAway}
                onChange={(e) => setHomeAway(e.target.value as "" | "home" | "away")}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Not set</option>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
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
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
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
          <Label htmlFor="location-url">
            Map link <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="location-url"
            type="url"
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            maxLength={500}
          />
        </div>

        {event.type === "match" && (
          <div className="space-y-1.5">
            <Label htmlFor="scoring-url">
              Live scoring link <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="scoring-url"
              type="url"
              value={scoringUrl}
              onChange={(e) => setScoringUrl(e.target.value)}
              placeholder="https://cricclubs.com/..."
              maxLength={500}
            />
          </div>
        )}

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

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 flex-1 rounded-full text-sm font-semibold"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Save changes"}
          </Button>
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function parseDateTimeInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
