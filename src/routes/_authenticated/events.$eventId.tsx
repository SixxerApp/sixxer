import { createFileRoute, useParams } from "@tanstack/react-router";
import { Calendar, Check, HelpCircle, MapPin, X, Clock } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { InitialAvatar } from "@/components/Avatar";
import { formatDate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  component: EventDetail,
});

interface EventRow {
  id: string;
  team_id: string;
  type: "match" | "event";
  title: string;
  opponent: string | null;
  home_away: "home" | "away" | null;
  starts_at: string;
  meetup_at: string | null;
  ends_at: string | null;
  location: string | null;
  description: string | null;
}

interface ResponseRow {
  user_id: string;
  status: "going" | "maybe" | "declined";
  full_name: string;
}

function EventDetail() {
  const { eventId } = useParams({ from: "/_authenticated/events/$eventId" });
  const { user } = useAuth();
  const [event, setEvent] = React.useState<EventRow | null>(null);
  const [responses, setResponses] = React.useState<ResponseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) {
      setLoading(false);
      return;
    }
    setEvent(ev as EventRow);
    const { data: resps } = await supabase
      .from("event_responses")
      .select("user_id, status")
      .eq("event_id", eventId);
    const ids = (resps ?? []).map((r) => r.user_id);
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profs ?? []) names[p.id] = p.full_name;
    }
    setResponses(
      (resps ?? []).map((r) => ({
        user_id: r.user_id,
        status: r.status,
        full_name: names[r.user_id] ?? "Member",
      })),
    );
    setLoading(false);
  }, [eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function rsvp(status: "going" | "maybe" | "declined") {
    if (!user) return;
    setUpdating(true);
    const { error } = await supabase.from("event_responses").upsert(
      { event_id: eventId, user_id: user.id, status, responded_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    );
    setUpdating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${status}`);
    void load();
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
        <Detail icon={<Calendar className="h-4 w-4" />}>
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          {event.ends_at && ` – ${formatTime(event.ends_at)}`}
        </Detail>
        {event.meetup_at && (
          <Detail icon={<Clock className="h-4 w-4" />}>
            Meet at {formatTime(event.meetup_at)}
          </Detail>
        )}
        {event.location && (
          <Detail icon={<MapPin className="h-4 w-4" />}>{event.location}</Detail>
        )}
        {event.description && (
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Are you in?
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <RsvpButton
            label="Going"
            icon={<Check className="h-5 w-5" />}
            active={myResp === "going"}
            color="success"
            onClick={() => rsvp("going")}
            disabled={updating}
          />
          <RsvpButton
            label="Maybe"
            icon={<HelpCircle className="h-5 w-5" />}
            active={myResp === "maybe"}
            color="warning"
            onClick={() => rsvp("maybe")}
            disabled={updating}
          />
          <RsvpButton
            label="Can't"
            icon={<X className="h-5 w-5" />}
            active={myResp === "declined"}
            color="destructive"
            onClick={() => rsvp("declined")}
            disabled={updating}
          />
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <ResponseGroup label={`Going (${going.length})`} items={going} tone="success" />
        <ResponseGroup label={`Maybe (${maybe.length})`} items={maybe} tone="warning" />
        <ResponseGroup label={`Can't (${declined.length})`} items={declined} tone="destructive" />
      </section>
    </div>
  );
}

function Detail({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
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
  icon: React.ReactNode;
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
