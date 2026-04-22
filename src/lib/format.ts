export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatRelativeDay(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

export function dateBlock(d: string | Date): { mon: string; day: string } {
  const date = typeof d === "string" ? new Date(d) : d;
  return {
    mon: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

const COLORS = [
  "oklch(0.7 0.18 5)",     // pink
  "oklch(0.7 0.18 45)",    // orange
  "oklch(0.72 0.15 150)",  // green
  "oklch(0.7 0.16 220)",   // blue
  "oklch(0.7 0.18 290)",   // violet
  "oklch(0.72 0.15 80)",   // amber
];

export function colorFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function generateInviteCode(len = 6) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
