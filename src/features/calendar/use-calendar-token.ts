import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarToken {
  token: string;
  createdAt: string;
}

// The iCal feed lives at this path on every deployment environment. We build
// the full URL from window.location so we stay correct across preview URLs and
// local dev without plumbing an env var.
export const ICAL_PATH_PREFIX = "/api/ical/";

export function buildSubscribeUrls(token: string): { http: string; webcal: string } {
  if (typeof window === "undefined") {
    // SSR placeholder — consumers should only render these after mount.
    return { http: "", webcal: "" };
  }
  const origin = window.location.origin;
  const path = `${ICAL_PATH_PREFIX}${encodeURIComponent(token)}.ics`;
  const http = `${origin}${path}`;
  const webcal = http.replace(/^https?:/, "webcal:");
  return { http, webcal };
}

async function fetchExistingToken(userId: string): Promise<CalendarToken | null> {
  const { data } = await supabase
    .from("calendar_tokens")
    .select("token, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { token: data.token, createdAt: data.created_at };
}

async function rotateToken(): Promise<{ token: string | null; error: { message: string } | null }> {
  const { data, error } = await supabase.rpc("rotate_calendar_token");
  if (error) return { token: null, error: { message: error.message } };
  if (typeof data !== "string") return { token: null, error: { message: "Missing token" } };
  return { token: data, error: null };
}

export function useCalendarToken(userId: string | undefined) {
  const [token, setToken] = React.useState<CalendarToken | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!userId) {
      setToken(null);
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      const existing = await fetchExistingToken(userId);
      if (!active) return;
      setToken(existing);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const ensure = React.useCallback(async () => {
    if (token) return token;
    setBusy(true);
    const { token: value, error } = await rotateToken();
    setBusy(false);
    if (error || !value) return null;
    const next: CalendarToken = { token: value, createdAt: new Date().toISOString() };
    setToken(next);
    return next;
  }, [token]);

  const rotate = React.useCallback(async () => {
    setBusy(true);
    const { token: value, error } = await rotateToken();
    setBusy(false);
    if (error || !value) return null;
    const next: CalendarToken = { token: value, createdAt: new Date().toISOString() };
    setToken(next);
    return next;
  }, []);

  return { token, loading, busy, ensure, rotate };
}
