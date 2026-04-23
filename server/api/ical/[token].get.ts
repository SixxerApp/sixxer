import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, getRouterParam, setResponseHeaders, setResponseStatus } from "h3";

// Nitro auto-registers this handler at GET /api/ical/:token.
//
// The token is the sole capability — there is no user session on an iCal
// fetch. We look it up with the service-role key (bypassing RLS), resolve the
// owner, then return events for every team that user belongs to in a
// ±days window. Cancelled instances are filtered out at the query level.

const WINDOW_PAST_DAYS = 30;
const WINDOW_FUTURE_DAYS = 180;
const CACHE_SECONDS = 15 * 60; // Google/Apple refetch every few hours anyway.

interface EventRow {
  id: string;
  team_id: string;
  title: string;
  type: "match" | "event";
  opponent: string | null;
  home_away: "home" | "away" | null;
  starts_at: string;
  ends_at: string | null;
  meetup_at: string | null;
  location: string | null;
  description: string | null;
}

interface TeamMemberRow {
  team_id: string;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "token") ?? "";
  // Accept both /api/ical/TOKEN and /api/ical/TOKEN.ics so the ".ics" suffix
  // (which many calendar clients expect) is optional.
  const token = raw.endsWith(".ics") ? raw.slice(0, -4) : raw;

  if (!token || token.length < 16) {
    setResponseStatus(event, 404);
    return "Not found";
  }

  const supabase = getAdminClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("calendar_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    setResponseStatus(event, 404);
    return "Not found";
  }

  await supabase
    .from("calendar_tokens")
    .update({ last_fetched_at: new Date().toISOString() })
    .eq("token", token);

  const userId = (tokenRow as { user_id: string }).user_id;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  const teamIds = ((memberships as TeamMemberRow[] | null) ?? []).map((row) => row.team_id);

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - WINDOW_PAST_DAYS);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_FUTURE_DAYS);

  let rows: EventRow[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select(
        "id, team_id, title, type, opponent, home_away, starts_at, ends_at, meetup_at, location, description",
      )
      .in("team_id", teamIds)
      .eq("is_cancelled", false)
      .gte("starts_at", windowStart.toISOString())
      .lt("starts_at", windowEnd.toISOString())
      .order("starts_at", { ascending: true });
    rows = (data as EventRow[] | null) ?? [];
  }

  const ics = buildIcs(rows);

  setResponseHeaders(event, {
    "content-type": "text/calendar; charset=utf-8",
    "cache-control": `public, max-age=${CACHE_SECONDS}`,
    "content-disposition": 'inline; filename="sixxer.ics"',
  });

  return ics;
});

function buildIcs(events: EventRow[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sixxer//Calendar feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sixxer",
    "X-WR-TIMEZONE:UTC",
  ];

  for (const event of events) {
    const startsAt = new Date(event.starts_at);
    const endsAt = event.ends_at
      ? new Date(event.ends_at)
      : new Date(startsAt.getTime() + 60 * 60_000);

    const summary =
      event.type === "match" && event.opponent
        ? `${event.home_away === "away" ? "@" : "vs"} ${event.opponent}`
        : event.title;

    const descriptionParts: string[] = [];
    if (event.meetup_at) {
      descriptionParts.push(
        `Meet at ${new Date(event.meetup_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    }
    if (event.description) descriptionParts.push(event.description);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@sixxer.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startsAt)}`,
      `DTEND:${formatIcsDate(endsAt)}`,
      `SUMMARY:${escapeText(summary)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(descriptionParts.length > 0
        ? [`DESCRIPTION:${escapeText(descriptionParts.join("\n"))}`]
        : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

function formatIcsDate(d: Date): string {
  // UTC form: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  // RFC 5545 §3.3.11: escape backslash, semicolon, comma, and newlines.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
