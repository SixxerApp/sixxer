const DEFAULT_AUTH_REDIRECT = "/home";

export function normalizeAuthRedirect(value: unknown) {
  if (typeof value !== "string") return DEFAULT_AUTH_REDIRECT;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const url = new URL(trimmed, "https://sixxer.local");
    if (url.origin !== "https://sixxer.local") return DEFAULT_AUTH_REDIRECT;
    if (url.pathname === "/login" || url.pathname === "/signup") return DEFAULT_AUTH_REDIRECT;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
