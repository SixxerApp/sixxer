import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  HelpCircle,
  MapPin,
  Megaphone,
  Navigation,
  Radio,
  Repeat,
  Share2,
  Undo2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { usePlatform } from "@/platform";
import { PageHeader } from "@/components/PageHeader";
import { InitialAvatar } from "@/components/Avatar";
import { formatDate, formatTime } from "@/lib/format";
import { buildMapTargets, preferredMapLink } from "@/lib/maps";
import { buildSingleEventIcs, downloadIcs } from "@/lib/ics-single";
import { buildEventShareText, whatsAppShareUrl } from "@/lib/share";
import { useEventAdmin } from "@/features/events/use-event-admin";
import { type ResponseRow, useEventDetail } from "@/features/events/use-event-detail";
import {
  cancelEventInstance,
  cancelSeriesFromDate,
  restoreEventInstance,
} from "@/features/events/use-event-series";
import { useWeather } from "@/features/events/use-weather";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = useParams({ from: "/_authenticated/events/$eventId" });
  const { user } = useAuth();
  const platform = usePlatform();
  const { event, responses, loading, updating, rsvp, reload } = useEventDetail(eventId, user?.id);
  const admin = useEventAdmin(eventId, user?.id);
  const weather = useWeather(event?.location ?? null, event?.starts_at ?? null);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [announcementMessage, setAnnouncementMessage] = React.useState("");
  const [seriesBusy, setSeriesBusy] = React.useState(false);
  const [responsesExpanded, setResponsesExpanded] = React.useState(false);

  async function handleRsvp(status: "going" | "maybe" | "declined") {
    const { error } = await rsvp(status);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${status}`);
  }

  React.useEffect(() => {
    setSelectedUserIds(
      admin.members.filter((member) => member.selected).map((member) => member.user_id),
    );
    setAnnouncementMessage(admin.announcementMessage);
  }, [admin.announcementMessage, admin.members]);

  async function handleReminders() {
    if (!event) return;
    const { error } = await admin.sendReminders(event.title);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reminder sent to unanswered players");
  }

  async function handleAnnounceSquad() {
    if (!event) return;
    if (selectedUserIds.length === 0) {
      toast.error("Select at least one player for the squad");
      return;
    }

    const { error } = await admin.announceSquad(
      selectedUserIds,
      announcementMessage.trim() || null,
      event.title,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Squad announced");
  }

  function toggleSelectedUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  async function handleCancelInstance() {
    if (!event) return;
    setSeriesBusy(true);
    const { error } = await cancelEventInstance(event.id);
    setSeriesBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event cancelled");
    await reload();
  }

  async function handleRestoreInstance() {
    if (!event) return;
    setSeriesBusy(true);
    const { error } = await restoreEventInstance(event.id);
    setSeriesBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event restored");
    await reload();
  }

  async function handleAddToCalendar() {
    if (!event) return;
    const ics = buildSingleEventIcs(
      {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        type: event.type,
      },
      typeof window !== "undefined" ? window.location.origin : "",
    );
    const safeTitle = event.title.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40) || "event";
    downloadIcs(`sixxer-${safeTitle}.ics`, ics);
  }

  async function handleShareWhatsApp() {
    if (!event) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const when = `${formatDate(event.starts_at)} · ${formatTime(event.starts_at)}`;
    const shareText = buildEventShareText({
      title: event.title,
      when,
      where: event.location,
      url: `${origin}/events/${event.id}`,
    });
    const shareUrl = whatsAppShareUrl(shareText);
    try {
      await platform.clipboard.writeText(shareText);
    } catch {
      // Clipboard failures are non-fatal — the deep link still opens WhatsApp.
    }
    if (typeof window !== "undefined") {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleCancelSeriesFromHere() {
    if (!event?.series_id) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Cancel this and all future events in the series?");
    if (!confirmed) return;
    setSeriesBusy(true);
    const { error } = await cancelSeriesFromDate(event.series_id, event.starts_at);
    setSeriesBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Future events cancelled");
    await reload();
  }

  if (loading) {
    return (
      <div className="px-5">
        <PageHeader title="Event" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="px-5">
        <PageHeader title="Event" />
        <p className="mt-4 text-sm text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  const myResp = responses.find((r) => r.user_id === user?.id)?.status;
  const going = responses.filter((r) => r.status === "going");
  const maybe = responses.filter((r) => r.status === "maybe");
  const declined = responses.filter((r) => r.status === "declined");
  const mapTargets = buildMapTargets(event.location, event.location_url);
  const mapHref = mapTargets ? preferredMapLink(mapTargets) : null;
  const rsvpBy = new Date(new Date(event.starts_at).getTime() - 12 * 60 * 60_000);

  return (
    <div className="px-5 pb-8">
      <PageHeader title={event.type === "match" ? "Match" : "Event"} />

      <section className="mt-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight">{event.title}</h1>
          {event.home_away && (
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                (event.home_away === "home"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning-foreground")
              }
            >
              {event.home_away}
            </span>
          )}
        </div>
        {event.opponent && (
          <p className="mt-1 text-sm text-muted-foreground">vs {event.opponent}</p>
        )}
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <Detail icon={<CalendarDays className="h-4 w-4" />}>
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          {event.ends_at && ` – ${formatTime(event.ends_at)}`}
        </Detail>
        {event.meetup_at && (
          <Detail icon={<Clock className="h-4 w-4" />}>
            Meet at {formatTime(event.meetup_at)}
          </Detail>
        )}
        {event.location && (
          <Detail icon={<MapPin className="h-4 w-4" />}>
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
              >
                {event.location}
                <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ) : (
              event.location
            )}
          </Detail>
        )}
        {weather && (
          <Detail icon={<span className="text-base leading-none">{weather.icon}</span>}>
            <span className="text-foreground">
              {Math.round(weather.tempMinC)}° – {Math.round(weather.tempMaxC)}°C
            </span>
            <span className="text-muted-foreground"> · {weather.precipChance}% rain</span>
          </Detail>
        )}
        {event.series_id && (
          <Detail icon={<Repeat className="h-4 w-4" />}>
            <span className="text-muted-foreground">Part of a recurring series</span>
          </Detail>
        )}
        {event.description && (
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        )}
      </section>

      {event.scoring_url && (
        <a
          href={event.scoring_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm"
        >
          <span className="flex items-center gap-2 font-semibold text-primary">
            <Radio className="h-4 w-4" />
            Watch live
          </span>
          <ExternalLink className="h-4 w-4 text-primary" />
        </a>
      )}

      <section className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={handleAddToCalendar}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-xs font-semibold"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to calendar
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-xs font-semibold"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </section>

      {event.is_cancelled && (
        <section className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">This event is cancelled</span>
            {admin.isAdmin && (
              <button
                onClick={handleRestoreInstance}
                disabled={seriesBusy}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-destructive/40 px-3 text-xs font-semibold"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Restore
              </button>
            )}
          </div>
        </section>
      )}

      <section className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Are you in?
          </h2>
          <span className="text-[11px] text-muted-foreground">
            RSVP by {formatDate(rsvpBy.toISOString())} · {formatTime(rsvpBy.toISOString())}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <RsvpButton
            label="Going"
            icon={<Check className="h-5 w-5" />}
            active={myResp === "going"}
            color="success"
            onClick={() => handleRsvp("going")}
            disabled={updating}
          />
          <RsvpButton
            label="Maybe"
            icon={<HelpCircle className="h-5 w-5" />}
            active={myResp === "maybe"}
            color="warning"
            onClick={() => handleRsvp("maybe")}
            disabled={updating}
          />
          <RsvpButton
            label="Can't"
            icon={<X className="h-5 w-5" />}
            active={myResp === "declined"}
            color="destructive"
            onClick={() => handleRsvp("declined")}
            disabled={updating}
          />
        </div>
      </section>

      <section className="mt-6">
        <button
          onClick={() => setResponsesExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm"
        >
          <span className="flex items-center gap-3">
            <CountPill label="Going" count={going.length} tone="success" />
            <CountPill label="Maybe" count={maybe.length} tone="warning" />
            <CountPill label="Can't" count={declined.length} tone="destructive" />
          </span>
          {responsesExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {responsesExpanded && (
          <div className="mt-4 space-y-4">
            <ResponseGroup label={`Going (${going.length})`} items={going} tone="success" />
            <ResponseGroup label={`Maybe (${maybe.length})`} items={maybe} tone="warning" />
            <ResponseGroup
              label={`Can't (${declined.length})`}
              items={declined}
              tone="destructive"
            />
          </div>
        )}
      </section>

      {admin.isAdmin && (
        <section className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Admin tools
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow up with unanswered players and publish the match squad from here.
              </p>
            </div>
            {admin.unansweredCount > 0 && (
              <button
                onClick={handleReminders}
                disabled={admin.busy}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold"
              >
                <BellRing className="h-4 w-4" />
                Remind {admin.unansweredCount}
              </button>
            )}
          </div>

          {!event.is_cancelled && (
            <div className="flex flex-wrap gap-2 rounded-2xl bg-background p-3">
              <button
                onClick={handleCancelInstance}
                disabled={seriesBusy}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                Cancel this event
              </button>
              {event.series_id && (
                <button
                  onClick={handleCancelSeriesFromHere}
                  disabled={seriesBusy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-destructive"
                >
                  <Repeat className="h-3.5 w-3.5" />
                  Cancel this & future
                </button>
              )}
            </div>
          )}

          {event.type === "match" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Announce team
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose the players for this match and send them an app notification.
                </p>
                {admin.announcedAt && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Last announced {new Date(admin.announcedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {admin.loading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-background" />
                ) : admin.members.length === 0 ? (
                  <p className="rounded-2xl bg-background p-3 text-sm text-muted-foreground">
                    No team members available yet.
                  </p>
                ) : (
                  admin.members.map((member) => {
                    const selected = selectedUserIds.includes(member.user_id);
                    return (
                      <button
                        key={member.user_id}
                        onClick={() => toggleSelectedUser(member.user_id)}
                        className={
                          "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors " +
                          (selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background")
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold">{member.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {member.response_status
                              ? `RSVP: ${member.response_status}`
                              : "No RSVP yet"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          {selected ? "Selected" : "Select"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <textarea
                value={announcementMessage}
                onChange={(event) => setAnnouncementMessage(event.target.value)}
                rows={3}
                placeholder="Optional note for the selected players"
                className="w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none"
              />

              <button
                onClick={handleAnnounceSquad}
                disabled={admin.busy || selectedUserIds.length === 0}
                className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Announce squad
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Detail({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function RsvpButton({
  label,
  icon,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  color: "success" | "warning" | "destructive";
  onClick: () => void;
  disabled?: boolean;
}) {
  const map = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  } as const;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={
        "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-bold transition-all " +
        (active
          ? `border-transparent shadow-md ${map[color]}`
          : "border-border bg-card text-foreground hover:bg-secondary")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function CountPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "success" | "warning" | "destructive";
}) {
  const dot = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={"h-2 w-2 rounded-full " + dot} />
      <span className="font-semibold text-foreground">{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ResponseGroup({
  label,
  items,
  tone,
}: {
  label: string;
  items: ResponseRow[];
  tone: "success" | "warning" | "destructive";
}) {
  const dot = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={"h-2 w-2 rounded-full " + dot} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No one yet</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
            >
              <InitialAvatar name={m.full_name} size={32} />
              <span className="text-sm font-medium">{m.full_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
