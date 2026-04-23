import { supabase } from "@/integrations/supabase/client";
import { buildRrule, expandOccurrences, type Recurrence, MAX_OCCURRENCES } from "./recurrence";

export interface EventSeriesInput {
  teamId: string;
  title: string;
  type: "match" | "event";
  startsAt: Date;
  durationMinutes: number | null;
  meetupOffsetMinutes: number | null;
  location: string | null;
  locationUrl: string | null;
  description: string | null;
  createdBy: string;
  recurrence: Recurrence;
  // Match-specific fields, copied onto each generated event row.
  opponent?: string | null;
  homeAway?: "home" | "away" | null;
}

export interface SeriesCreateResult {
  seriesId: string;
  eventIds: string[];
  error: { message: string } | null;
}

// Insert a new event_series row plus the materialized event instances.
// We cap COUNT at MAX_OCCURRENCES for safety; the recurrence builder does the
// same. Supabase does not give us a transaction, so we roll back by deleting
// the series if event insertion fails — ON DELETE SET NULL keeps any partially
// inserted events but cleanly unbound, and the caller can retry.
export async function createEventSeries(input: EventSeriesInput): Promise<SeriesCreateResult> {
  const rrule = buildRrule(input.recurrence);
  const occurrences = expandOccurrences(input.recurrence, input.startsAt).slice(0, MAX_OCCURRENCES);

  const { data: series, error: seriesError } = await supabase
    .from("event_series")
    .insert({
      team_id: input.teamId,
      title: input.title,
      type: input.type,
      location: input.location,
      location_url: input.locationUrl,
      description: input.description,
      meetup_offset_minutes: input.meetupOffsetMinutes,
      duration_minutes: input.durationMinutes,
      rrule,
      starts_at: input.startsAt.toISOString(),
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (seriesError || !series) {
    return {
      seriesId: "",
      eventIds: [],
      error: { message: seriesError?.message ?? "Could not create series" },
    };
  }

  const rows = occurrences.map((occurrence) => ({
    team_id: input.teamId,
    series_id: series.id,
    type: input.type,
    title: input.title,
    opponent: input.opponent ?? null,
    home_away: input.homeAway ?? null,
    starts_at: occurrence.toISOString(),
    meetup_at:
      input.meetupOffsetMinutes !== null
        ? new Date(occurrence.getTime() - input.meetupOffsetMinutes * 60_000).toISOString()
        : null,
    ends_at:
      input.durationMinutes !== null
        ? new Date(occurrence.getTime() + input.durationMinutes * 60_000).toISOString()
        : null,
    location: input.location,
    location_url: input.locationUrl,
    description: input.description,
    created_by: input.createdBy,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("events")
    .insert(rows)
    .select("id");

  if (insertError) {
    await supabase.from("event_series").delete().eq("id", series.id);
    return {
      seriesId: "",
      eventIds: [],
      error: { message: insertError.message },
    };
  }

  return {
    seriesId: series.id,
    eventIds: (inserted ?? []).map((row) => row.id),
    error: null,
  };
}

export async function cancelEventInstance(eventId: string) {
  return supabase.from("events").update({ is_cancelled: true }).eq("id", eventId);
}

export async function restoreEventInstance(eventId: string) {
  return supabase.from("events").update({ is_cancelled: false }).eq("id", eventId);
}

// Cancel all future (>= fromDate) uncancelled instances of a series. Does not
// delete the series row so admins can still see history and extend later.
export async function cancelSeriesFromDate(seriesId: string, fromIso: string) {
  return supabase
    .from("events")
    .update({ is_cancelled: true })
    .eq("series_id", seriesId)
    .gte("starts_at", fromIso)
    .eq("is_cancelled", false);
}
