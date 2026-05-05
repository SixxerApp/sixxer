export const INVITE_CODE_SEARCH_PARAM = "code";

export function normalizeInviteCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

export function buildInvitePath(code: string) {
  const normalizedCode = normalizeInviteCode(code);
  const params = new URLSearchParams({ [INVITE_CODE_SEARCH_PARAM]: normalizedCode });
  return `/join?${params.toString()}`;
}

export function buildInviteUrl(code: string, origin: string) {
  return new URL(buildInvitePath(code), origin).toString();
}
