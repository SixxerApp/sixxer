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

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
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

  return {
    rows,
    loading,
    unreadCount: rows.filter((row) => !row.read_at).length,
    reload: load,
  };
}
