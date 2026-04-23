import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
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

export function useNotificationCenter(userId: string | undefined) {
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!userId) return;
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
