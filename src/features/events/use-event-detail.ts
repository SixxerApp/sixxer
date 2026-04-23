import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventRow {
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
  series_id: string | null;
  is_cancelled: boolean;
}

export interface ResponseRow {
  user_id: string;
  status: "going" | "maybe" | "declined";
  full_name: string;
}

async function fetchEventDetail(eventId: string) {
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) {
    return { event: null, responses: [] as ResponseRow[] };
  }

  const { data: responseRows } = await supabase
    .from("event_responses")
    .select("user_id, status")
    .eq("event_id", eventId);

  const ids = (responseRows ?? []).map((row) => row.user_id);
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const profile of profiles ?? []) {
      names[profile.id] = profile.full_name;
    }
  }

  return {
    event: event as EventRow,
    responses: (responseRows ?? []).map((row) => ({
      user_id: row.user_id,
      status: row.status,
      full_name: names[row.user_id] ?? "Member",
    })),
  };
}

export async function respondToEvent(
  eventId: string,
  userId: string,
  status: "going" | "maybe" | "declined",
) {
  return supabase
    .from("event_responses")
    .upsert(
      { event_id: eventId, user_id: userId, status, responded_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    );
}

export function useEventDetail(eventId: string, userId: string | undefined) {
  const [event, setEvent] = React.useState<EventRow | null>(null);
  const [responses, setResponses] = React.useState<ResponseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const detail = await fetchEventDetail(eventId);
    setEvent(detail.event);
    setResponses(detail.responses);
    setLoading(false);
  }, [eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rsvp = React.useCallback(
    async (status: "going" | "maybe" | "declined") => {
      if (!userId) return { error: new Error("Missing user") };
      setUpdating(true);
      const result = await respondToEvent(eventId, userId, status);
      setUpdating(false);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [eventId, load, userId],
  );

  return { event, responses, loading, updating, rsvp, reload: load };
}
