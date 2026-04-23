// Single-event .ics generator. Complements the per-user iCal subscription from
// PR-2: subscriptions are best for people who want everything auto-synced, but
// one-off matches ("add only this Saturday's game") are better served by a
// downloadable attachment that opens in whatever calendar app the device has.
//
// Output conforms to RFC 5545 (CRLF line endings, escaped text, UTC-anchored
// DTSTART/DTSTAMP). Duration defaults to 3h for matches and 2h for other
// events if no end time is stored, matching the defaults we use in the feed.

export interface SingleEventInput {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  type: "match" | "event";
}

export function buildSingleEventIcs(input: SingleEventInput, appOrigin: string): string {
  const start = new Date(input.startsAt);
  const end = input.endsAt
    ? new Date(input.endsAt)
    : new Date(start.getTime() + (input.type === "match" ? 3 : 2) * 60 * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sixxer//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@sixxer.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  if (appOrigin) lines.push(`URL:${appOrigin}/events/${input.id}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// Trigger a download for the given .ics text. On iOS Safari in-app, we prefer
// `window.open(dataUrl)` because the system will offer "Add to Calendar" on
// mime type text/calendar. Everywhere else a blob URL + anchor click works.
export function downloadIcs(filename: string, ics: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
