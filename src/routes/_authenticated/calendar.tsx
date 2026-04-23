import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CalendarPlus, Check, Copy, MapPin, RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth";
import { formatTime } from "@/lib/format";
import { usePlatform } from "@/platform";
import { CALENDAR_WINDOW_DAYS, useUpcomingEvents } from "@/features/calendar/use-upcoming-events";
import { buildSubscribeUrls, useCalendarToken } from "@/features/calendar/use-calendar-token";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Sixxer" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { user } = useAuth();
  const { days, loading } = useUpcomingEvents(user?.id);

  return (
    <div className="px-5 pb-10 pt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Next {CALENDAR_WINDOW_DAYS} days across all your teams
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SubscribeCard userId={user?.id} />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : days.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus className="h-5 w-5" />}
            title="Nothing scheduled"
            body="When your teams add matches or training they'll show up here."
          />
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <section key={day.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-bold text-foreground">{day.label}</h2>
                  <span className="text-xs text-muted-foreground">{day.subLabel}</span>
                </div>
                <ul className="space-y-2">
                  {day.items.map((event) => (
                    <li key={event.id}>
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: event.id }}
                        className="flex items-start gap-3 rounded-2xl bg-card p-3 transition-colors hover:bg-secondary"
                      >
                        <div className="grid w-12 shrink-0 place-items-center pt-0.5">
                          <div className="text-center">
                            <div className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                              {formatTime(event.starts_at)}
                            </div>
                            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              {event.type === "match" ? "Match" : "Event"}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold leading-snug">
                            {event.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {event.team_name}
                            {event.home_away ? ` · ${event.home_away}` : ""}
                          </p>
                          {event.location && (
                            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubscribeCard({ userId }: { userId: string | undefined }) {
  const platform = usePlatform();
  const { token, loading, busy, ensure, rotate } = useCalendarToken(userId);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function copyWebcal(webcal: string, successMsg: string) {
    try {
      await platform.clipboard.writeText(webcal);
      toast.success(successMsg);
    } catch {
      toast.error("Could not copy — long-press the URL to copy manually");
    }
  }

  async function handleEnableAndCopy() {
    const next = await ensure();
    if (!next) {
      toast.error("Could not generate subscription URL");
      return;
    }
    const { webcal } = buildSubscribeUrls(next.token);
    await copyWebcal(webcal, "Subscription URL copied");
  }

  async function handleCopy() {
    if (!token) return;
    const { webcal } = buildSubscribeUrls(token.token);
    await copyWebcal(webcal, "Subscription URL copied");
  }

  async function handleRotate() {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "Rotating will break any existing calendar subscriptions using the old URL. Continue?",
          );
    if (!confirmed) return;
    const next = await rotate();
    if (next) {
      toast.success("New URL generated");
    } else {
      toast.error("Could not rotate");
    }
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-card" />;
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sync to Apple or Google Calendar</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generate a private subscription URL. Paste it into your calendar app and matches +
              training updates automatically.
            </p>
          </div>
        </div>
        <button
          onClick={handleEnableAndCopy}
          disabled={busy}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Generating…" : "Enable & copy URL"}
        </button>
      </div>
    );
  }

  const { http, webcal } = mounted ? buildSubscribeUrls(token.token) : { http: "", webcal: "" };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Check className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Calendar subscription active</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Open the link in Apple Calendar, or in Google Calendar add via &ldquo;Other calendars →
            From URL&rdquo;.
          </p>
        </div>
      </div>
      {mounted && (
        <div className="mt-3 break-all rounded-lg bg-background p-2 font-mono text-[11px] text-muted-foreground">
          {http}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleCopy}
          disabled={busy || !mounted}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold disabled:opacity-60"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy URL
        </button>
        {mounted && (
          <a
            href={webcal}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            Open in Calendar
          </a>
        )}
        <button
          onClick={handleRotate}
          disabled={busy}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground disabled:opacity-60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rotate
        </button>
      </div>
    </div>
  );
}
