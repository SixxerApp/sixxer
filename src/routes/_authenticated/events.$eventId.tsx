import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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
  Pencil,
  MapPin,
  Megaphone,
  Navigation,
  Radio,
  Repeat,
  Share2,
  ShieldCheck,
  Star,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [reserveUserIds, setReserveUserIds] = React.useState<string[]>([]);
  const [captainUserId, setCaptainUserId] = React.useState<string | null>(null);
  const [wicketkeeperUserId, setWicketkeeperUserId] = React.useState<string | null>(null);
  const [roleNotes, setRoleNotes] = React.useState<Record<string, string>>({});
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
      admin.members
        .filter((member) => member.selection_status === "selected")
        .map((member) => member.user_id),
    );
    setReserveUserIds(
      admin.members
        .filter((member) => member.selection_status === "reserve")
        .map((member) => member.user_id),
    );
    setCaptainUserId(admin.captainUserId);
    setWicketkeeperUserId(admin.wicketkeeperUserId);
    setRoleNotes(
      Object.fromEntries(
        admin.members
          .map((member) => [member.user_id, member.role_note] as const)
          .filter(([, note]) => note),
      ),
    );
    setAnnouncementMessage(admin.announcementMessage);
  }, [admin.announcementMessage, admin.captainUserId, admin.members, admin.wicketkeeperUserId]);

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
    if (selectedUserIds.length === 0 && reserveUserIds.length === 0) {
      toast.error("Select at least one player for the squad");
      return;
    }

    const { error } = await admin.announceSquad(
      {
        selectedUserIds,
        reserveUserIds,
        captainUserId,
        wicketkeeperUserId,
        roleNotes,
        message: announcementMessage.trim() || null,
      },
      event.title,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Squad announced");
  }

  function setMemberSelection(userId: string, status: "selected" | "reserve" | null) {
    setSelectedUserIds((current) => {
      const withoutUser = current.filter((id) => id !== userId);
      return status === "selected" ? [...withoutUser, userId] : withoutUser;
    });
    setReserveUserIds((current) => {
      const withoutUser = current.filter((id) => id !== userId);
      return status === "reserve" ? [...withoutUser, userId] : withoutUser;
    });
    if (!status) {
      setCaptainUserId((current) => (current === userId ? null : current));
      setWicketkeeperUserId((current) => (current === userId ? null : current));
    }
  }

  function toggleCaptain(userId: string) {
    setCaptainUserId((current) => (current === userId ? null : userId));
    setMemberSelection(userId, "selected");
  }

  function toggleWicketkeeper(userId: string) {
    setWicketkeeperUserId((current) => (current === userId ? null : userId));
    setMemberSelection(userId, "selected");
  }

  function updateRoleNote(userId: string, note: string) {
    setRoleNotes((current) => ({ ...current, [userId]: note }));
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
  const mySquadMember = admin.members.find((member) => member.user_id === user?.id);

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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={seriesBusy}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-destructive/40 px-3 text-xs font-semibold"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Restore
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Players will see this event as active again. Existing RSVPs stay attached.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep cancelled</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestoreInstance}>
                      Restore event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

      {event.type === "match" && mySquadMember?.selection_status && (
        <section className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {mySquadMember.selection_status === "selected" ? "Selected" : "Reserve"}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {mySquadMember.selection_status === "selected"
                  ? "You are in the match squad."
                  : "You are listed as a reserve for this match."}
              </p>
              {mySquadMember.role_note && (
                <p className="mt-2 text-xs text-muted-foreground">{mySquadMember.role_note}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {mySquadMember.is_captain && <RoleBadge label="C" title="Captain" />}
              {mySquadMember.is_wicketkeeper && <RoleBadge label="WK" title="Wicketkeeper" />}
            </div>
          </div>
        </section>
      )}

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
                Edit match details, follow up with unanswered players, and publish the match squad.
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

          <Link
            to="/events/$eventId/edit"
            params={{ eventId: event.id }}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            <Pencil className="h-4 w-4" />
            Edit event
          </Link>

          {!event.is_cancelled && (
            <div className="flex flex-wrap gap-2 rounded-2xl bg-background p-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={seriesBusy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel this event
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The event remains visible as cancelled and existing RSVPs stay attached.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep active</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelInstance}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {event.series_id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={seriesBusy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-destructive"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      Cancel this & future
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this and future events?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cancels every uncancelled instance in this series from this date
                        forward. Past events and existing RSVP rows are not deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep series active</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSeriesFromHere}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel future events
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                    const reserve = reserveUserIds.includes(member.user_id);
                    const active = selected || reserve;
                    return (
                      <div
                        key={member.user_id}
                        className={
                          "space-y-3 rounded-2xl border p-3 transition-colors " +
                          (active ? "border-primary bg-primary/10" : "border-border bg-background")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{member.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {member.response_status
                                ? `RSVP: ${member.response_status}`
                                : "No RSVP yet"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {captainUserId === member.user_id && (
                              <RoleBadge label="C" title="Captain" />
                            )}
                            {wicketkeeperUserId === member.user_id && (
                              <RoleBadge label="WK" title="Wicketkeeper" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <SelectionButton
                            label="Selected"
                            active={selected}
                            ariaLabel={`Mark ${member.full_name} selected`}
                            onClick={() =>
                              setMemberSelection(member.user_id, selected ? null : "selected")
                            }
                          />
                          <SelectionButton
                            label="Reserve"
                            active={reserve}
                            ariaLabel={`Mark ${member.full_name} reserve`}
                            onClick={() =>
                              setMemberSelection(member.user_id, reserve ? null : "reserve")
                            }
                          />
                          <SelectionButton
                            label="Clear"
                            active={!active}
                            ariaLabel={`Clear ${member.full_name} selection`}
                            onClick={() => setMemberSelection(member.user_id, null)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            aria-label={`Toggle ${member.full_name} captain`}
                            onClick={() => toggleCaptain(member.user_id)}
                            className={
                              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold " +
                              (captainUserId === member.user_id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card")
                            }
                          >
                            <Star className="h-3.5 w-3.5" />
                            Captain
                          </button>
                          <button
                            type="button"
                            aria-label={`Toggle ${member.full_name} wicketkeeper`}
                            onClick={() => toggleWicketkeeper(member.user_id)}
                            className={
                              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold " +
                              (wicketkeeperUserId === member.user_id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card")
                            }
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Keeper
                          </button>
                        </div>

                        <label className="block">
                          <p className="text-[11px] text-muted-foreground">
                            Role notes
                          </p>
                          <input
                            aria-label={`${member.full_name} role notes`}
                            value={roleNotes[member.user_id] ?? ""}
                            onChange={(event) => updateRoleNote(member.user_id, event.target.value)}
                            placeholder="e.g. Opens batting, bowls death overs"
                            className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-xs outline-none"
                          />
                        </label>
                      </div>
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
                disabled={admin.busy || (selectedUserIds.length === 0 && reserveUserIds.length === 0)}
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

function SelectionButton({
  label,
  active,
  ariaLabel,
  onClick,
}: {
  label: string;
  active: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={
        "h-9 rounded-full border px-2 text-xs font-semibold " +
        (active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")
      }
    >
      {label}
    </button>
  );
}

function RoleBadge({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/15 px-2 text-[10px] font-extrabold text-primary"
    >
      {label}
    </span>
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
