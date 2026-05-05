import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationPermissionState, NotificationService } from "@/platform/types";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export type NotificationPreferenceKey =
  | "event_reminders"
  | "squad_announcements"
  | "payment_reminders"
  | "posts_polls"
  | "club_updates";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  event_reminders: true,
  squad_announcements: true,
  payment_reminders: true,
  posts_polls: true,
  club_updates: true,
};

export const notificationPreferenceOptions: Array<{
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}> = [
  {
    key: "event_reminders",
    label: "Fixtures and RSVPs",
    description: "Event changes and availability reminders.",
  },
  {
    key: "squad_announcements",
    label: "Squad announcements",
    description: "Selection, reserve, captain and role alerts.",
  },
  {
    key: "payment_reminders",
    label: "Payments",
    description: "Payment requests, rejected marks and due nudges.",
  },
  {
    key: "posts_polls",
    label: "Posts and polls",
    description: "Team announcements, polls and discussion prompts.",
  },
  {
    key: "club_updates",
    label: "Club updates",
    description: "Invite, membership and admin notices.",
  },
];

async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function filterUsersByNotificationPreference(
  userIds: string[],
  preferenceKey: NotificationPreferenceKey,
) {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(`user_id, ${preferenceKey}`)
    .in("user_id", uniqueIds);

  if (error) return uniqueIds;

  const disabled = new Set(
    (data ?? [])
      .filter((row) => (row as Record<NotificationPreferenceKey, boolean>)[preferenceKey] === false)
      .map((row) => row.user_id),
  );

  return uniqueIds.filter((userId) => !disabled.has(userId));
}

async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("event_reminders, squad_announcements, payment_reminders, posts_polls, club_updates")
    .eq("user_id", userId)
    .maybeSingle();

  return { ...defaultNotificationPreferences, ...(data ?? {}) };
}

async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  return supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function savePushToken(params: { userId: string; token: string; platform: string }) {
  const now = new Date().toISOString();
  return supabase.from("notification_push_tokens").upsert(
    {
      user_id: params.userId,
      token: params.token,
      platform: params.platform,
      updated_at: now,
      last_seen_at: now,
    },
    { onConflict: "user_id,token" },
  );
}

// Tiny in-process pub/sub so unread-count consumers (bell badge) refresh as
// soon as anything marks a notification as read — without needing realtime
// subscriptions or route-change hooks.
const unreadListeners = new Set<() => void>();
function notifyUnreadChanged() {
  for (const listener of unreadListeners) listener();
}

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  notifyUnreadChanged();
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", notificationId)
    .is("read_at", null);
  notifyUnreadChanged();
}

// Lightweight count-only query for the bell badge. Avoids pulling the full 50
// rows the notification center loads. Re-runs whenever the tab regains focus
// so the badge stays fresh without needing a realtime subscription.
export function useUnreadNotificationCount(userId: string | undefined) {
  const [count, setCount] = React.useState(0);

  const refresh = React.useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    const { count: result } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    setCount(result ?? 0);
  }, [userId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [refresh]);

  React.useEffect(() => {
    const listener = () => void refresh();
    unreadListeners.add(listener);
    return () => {
      unreadListeners.delete(listener);
    };
  }, [refresh]);

  return { count, refresh };
}

export function useNotificationPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [loading, setLoading] = React.useState(true);
  const [savingKey, setSavingKey] = React.useState<NotificationPreferenceKey | null>(null);

  const load = React.useCallback(async () => {
    if (!userId) {
      setPreferences(defaultNotificationPreferences);
      setLoading(true);
      return;
    }
    setLoading(true);
    setPreferences(await fetchNotificationPreferences(userId));
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setPreference = React.useCallback(
    async (key: NotificationPreferenceKey, value: boolean) => {
      if (!userId) return;
      const next = { ...preferences, [key]: value };
      setPreferences(next);
      setSavingKey(key);
      const result = await saveNotificationPreferences(userId, next);
      if (result.error) {
        setPreferences(preferences);
      }
      setSavingKey(null);
    },
    [preferences, userId],
  );

  return { preferences, loading, savingKey, reload: load, setPreference };
}

export function usePushNotificationRegistration(
  userId: string | undefined,
  notifications: NotificationService,
  isNativeApp: boolean,
) {
  const [permission, setPermission] = React.useState<NotificationPermissionState>("default");
  const [registered, setRegistered] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshPermission = React.useCallback(async () => {
    setPermission(await notifications.getPermissionStatus());
  }, [notifications]);

  React.useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const enable = React.useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);

    const requested = await notifications.requestPermission();
    setPermission(requested);
    if (requested !== "granted") {
      setBusy(false);
      return;
    }

    const token = await notifications.register();
    if (!token) {
      setRegistered(false);
      setError(
        isNativeApp
          ? "Push registration did not return a device token. Try again after reopening the app."
          : "Device push is available in the installed app. Web alerts can still show in-app here.",
      );
      setBusy(false);
      return;
    }

    const result = await savePushToken({
      userId,
      token,
      platform: isNativeApp ? "native" : "web",
    });
    setRegistered(!result.error);
    if (result.error) {
      setError("Sixxer could not save this device token. Please try again.");
    }
    setBusy(false);
  }, [isNativeApp, notifications, userId]);

  return { permission, registered, busy, error, enable, refreshPermission };
}

export function useNotificationCenter(userId: string | undefined) {
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    setRows(await fetchNotifications(userId));
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const markRead = React.useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      const now = new Date().toISOString();
      setRows((current) =>
        current.map((row) => (row.id === notificationId ? { ...row, read_at: now } : row)),
      );
      await markNotificationRead(userId, notificationId);
    },
    [userId],
  );

  return {
    rows,
    loading,
    unreadCount: rows.filter((row) => !row.read_at).length,
    reload: load,
    markRead,
  };
}
