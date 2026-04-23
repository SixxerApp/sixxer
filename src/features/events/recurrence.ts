// Zero-dependency recurrence utility.
//
// We persist recurrence as an RFC 5545-shaped RRULE string so we stay forward-
// compatible with standard libraries later. For now we only support the subset
// we actually expose in the UI: FREQ in {DAILY, WEEKLY, MONTHLY}, INTERVAL, COUNT.
//
// A series can materialize at most MAX_OCCURRENCES instances. This bounds the
// damage from an admin who picks "every day, COUNT=9999" and also keeps a
// season's worth of fixtures in range for a weekly cadence.

export const MAX_OCCURRENCES = 60;

export type RecurrenceFreq = "daily" | "weekly" | "monthly";

export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
  count: number;
}

const FREQ_TO_TOKEN: Record<RecurrenceFreq, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

const TOKEN_TO_FREQ: Record<string, RecurrenceFreq> = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

export function buildRrule(recurrence: Recurrence): string {
  const interval = clampInt(recurrence.interval, 1, 52);
  const count = clampInt(recurrence.count, 1, MAX_OCCURRENCES);
  return `FREQ=${FREQ_TO_TOKEN[recurrence.freq]};INTERVAL=${interval};COUNT=${count}`;
}

export function parseRrule(rrule: string): Recurrence | null {
  const parts = rrule
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const map = new Map<string, string>();
  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || !rawValue) continue;
    map.set(rawKey.toUpperCase(), rawValue.toUpperCase());
  }

  const freqToken = map.get("FREQ");
  if (!freqToken || !TOKEN_TO_FREQ[freqToken]) return null;

  const interval = parseIntOrDefault(map.get("INTERVAL"), 1);
  const count = parseIntOrDefault(map.get("COUNT"), 1);

  return {
    freq: TOKEN_TO_FREQ[freqToken],
    interval: clampInt(interval, 1, 52),
    count: clampInt(count, 1, MAX_OCCURRENCES),
  };
}

// Expand a recurrence into concrete Date instances anchored at `anchor`.
// The anchor itself is the first occurrence.
export function expandOccurrences(recurrence: Recurrence, anchor: Date): Date[] {
  const interval = clampInt(recurrence.interval, 1, 52);
  const count = clampInt(recurrence.count, 1, MAX_OCCURRENCES);
  const out: Date[] = [];

  for (let i = 0; i < count; i += 1) {
    out.push(addInterval(anchor, recurrence.freq, interval * i));
  }
  return out;
}

function addInterval(start: Date, freq: RecurrenceFreq, steps: number): Date {
  const next = new Date(start);
  switch (freq) {
    case "daily":
      next.setDate(next.getDate() + steps);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * steps);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + steps);
      break;
  }
  return next;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function parseIntOrDefault(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function describeRecurrence(recurrence: Recurrence): string {
  const interval = clampInt(recurrence.interval, 1, 52);
  const count = clampInt(recurrence.count, 1, MAX_OCCURRENCES);

  const unit: Record<RecurrenceFreq, [string, string]> = {
    daily: ["day", "days"],
    weekly: ["week", "weeks"],
    monthly: ["month", "months"],
  };
  const [singular, plural] = unit[recurrence.freq];

  const cadence = interval === 1 ? `every ${singular}` : `every ${interval} ${plural}`;
  const occurrences = count === 1 ? "once" : `${count} times`;
  return `${cadence}, ${occurrences}`;
}
