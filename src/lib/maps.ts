// Maps deep-link helpers. Given free-text locations we can't do real geocoding,
// but every major map app treats `?q=<free text>` as "search for this place and
// drop a pin", which is exactly what players expect when they tap an address.
//
// If an admin pasted a structured URL (e.g. a share link from Google Maps),
// honour that as the primary link and skip the text fallback.

export interface MapTargets {
  apple: string;
  google: string;
  osm: string;
  primary: string;
}

export function buildMapTargets(
  location: string | null,
  locationUrl: string | null,
): MapTargets | null {
  const trimmed = (location ?? "").trim();
  const urlTrimmed = (locationUrl ?? "").trim();
  if (!trimmed && !urlTrimmed) return null;

  // If an explicit URL was provided (paste-from-maps), make it primary and
  // derive the same-text search links for the other platforms so everyone gets
  // a reasonable option.
  const q = encodeURIComponent(trimmed || urlTrimmed);
  const apple = `https://maps.apple.com/?q=${q}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const osm = `https://www.openstreetmap.org/search?query=${q}`;

  const primary = urlTrimmed && /^https?:\/\//i.test(urlTrimmed) ? urlTrimmed : apple;

  return { apple, google, osm, primary };
}

// Very lightweight platform sniff so the primary tap opens the native app on
// iOS/Android without a chooser dialog. Non-mobile falls back to Google Maps
// in the browser, which is the most universally recognised.
export function preferredMapLink(targets: MapTargets): string {
  if (typeof navigator === "undefined") return targets.primary;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod|Macintosh/.test(ua)) return targets.apple;
  if (/Android/.test(ua)) return targets.google;
  return targets.google;
}
