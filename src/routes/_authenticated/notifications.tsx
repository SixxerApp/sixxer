import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDay } from "@/lib/format";
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationCenter,
} from "@/features/notifications/use-notification-center";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sixxer" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const { rows, loading, unreadCount, reload, markRead } = useNotificationCenter(user?.id);

  async function markAllRead() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    void reload();
  }

  function handleOpen(id: string, alreadyRead: boolean) {
    if (alreadyRead || !user) return;
    void markRead(id);
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
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
                  (n.read_at ? "border-border bg-card" : "border-primary/30 bg-primary/5")
                }
              >
                <div className="flex items-start gap-3">
                  {!n.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
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
                {n.link ? (
                  <Link to={n.link} onClick={() => handleOpen(n.id, !!n.read_at)}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpen(n.id, !!n.read_at)}
                    className="block w-full text-left"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
