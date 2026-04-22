import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDay } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Pitchside" }] }),
  component: NotificationsPage,
});

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function NotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows(data ?? []);
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    void load();
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        {rows.some((r) => !r.read_at) && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </header>

      {loading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="All caught up"
            body="New fixtures, RSVPs and payment updates will show up here."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((n) => {
            const inner = (
              <div
                className={
                  "rounded-2xl border p-3 transition-colors " +
                  (n.read_at
                    ? "border-border bg-card"
                    : "border-primary/30 bg-primary/5")
                }
              >
                <div className="flex items-start gap-3">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    {n.body && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatRelativeDay(n.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? <Link to={n.link}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
