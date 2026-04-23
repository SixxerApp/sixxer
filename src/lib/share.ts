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

// Payment request blurb. Admins will typically drop this into the team's
// WhatsApp group when chasing match fees. Keep the amount and due date on the
// first two lines so it's scannable even in the chat preview.
export function buildPaymentShareText(params: {
  title: string;
  amount: string;
  due: string | null;
  payLink: string | null;
  url: string;
}): string {
  const lines = [`${params.title} — ${params.amount}`];
  if (params.due) lines.push(`Due ${params.due}`);
  if (params.payLink) lines.push(`Pay: ${params.payLink}`);
  lines.push("");
  lines.push(`Details + mark paid: ${params.url}`);
  return lines.join("\n");
}

// Poll blurb. Admins drop this into the team's WhatsApp chat so members can
// vote even before they open the app. We number the options so screenshot
// replies ("I'll go with 2") still parse for the admin reading along.
export function buildPollShareText(params: {
  question: string;
  options: string[];
  url: string;
  closesAt: string | null;
}): string {
  const lines = [params.question];
  params.options.forEach((option, index) => {
    lines.push(`${index + 1}) ${option}`);
  });
  if (params.closesAt) {
    lines.push("");
    lines.push(`Closes ${new Date(params.closesAt).toLocaleString()}`);
  }
  lines.push("");
  lines.push(`Vote: ${params.url}`);
  return lines.join("\n");
}

// Pull the first http(s) URL out of free-text. We use this to promote pay
// instructions embedded in the description (Venmo, PayPal, bank transfer
// pages) into a dedicated tap target. Returns null if nothing looks like a URL.
export function extractFirstUrl(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}
