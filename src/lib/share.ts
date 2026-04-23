// Build a WhatsApp share URL using the universal `wa.me` endpoint. Works on
// web (opens WhatsApp Web), iOS (opens the app), and Android (opens the app).
// Purely deep-link based — no WhatsApp Business API, no keys, no cost.

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Compose the canonical "we have a game" blurb. Keep it short — WhatsApp will
// render this verbatim as the initial message. Players can edit before sending.
export function buildEventShareText(params: {
  title: string;
  when: string;
  where: string | null;
  url: string;
}): string {
  const lines = [params.title, params.when];
  if (params.where) lines.push(`@ ${params.where}`);
  lines.push("");
  lines.push(`RSVP: ${params.url}`);
  return lines.join("\n");
}
