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
  location_url: string | null;
  description: string | null;
  series_id: string | null;
  is_cancelled: boolean;
  scoring_url: string | null;
}

export interface ResponseRow {
  user_id: string;
  status: "going" | "maybe" | "declined";
  full_name: string;
}

async function fetchEventDetail(eventId: string) {
  // `load()` can run in the first client tick before the Supabase client has
  // fully restored the JWT from storage. RLS on `event_responses` is anonymous
  // for that request, so the list comes back empty and never updates unless we
  // refetch (see onAuthStateChange below).
  await supabase.auth.getSession();

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        void load();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [load]);

  const rsvp = React.useCallback(
    async (status: "going" | "maybe" | "declined") => {
      if (!userId) return { error: new Error("Missing user") };
      setUpdating(true);
      // Optimistic — flip the local row immediately so the button state doesn't
      // flash "Going" → idle → "Going" on slow networks. If the write fails we
      // reload from the server to snap back to truth.
      setResponses((current) => {
        const existing = current.find((row) => row.user_id === userId);
        if (existing) {
          return current.map((row) => (row.user_id === userId ? { ...row, status } : row));
        }
        return [...current, { user_id: userId, status, full_name: "You" }];
      });
      const result = await respondToEvent(eventId, userId, status);
      // Keep `updating` true (buttons disabled) until the refetch from `load()` —
      // otherwise the UI can show a server-backed count of 1 from optimistic
      // state *before* the upsert + GET round trip finishes, and a fast E2E
      // `reload()` can run between the two.
      try {
        await load();
        return result;
      } finally {
        setUpdating(false);
      }
    },
    [eventId, load, userId],
  );

  return { event, responses, loading, updating, rsvp, reload: load };
}
