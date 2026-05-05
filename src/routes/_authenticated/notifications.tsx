import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellRing, Check, Settings2, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDay } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationPreferenceOptions,
  useNotificationCenter,
  useNotificationPreferences,
  usePushNotificationRegistration,
} from "@/features/notifications/use-notification-center";
import { NotificationsRouteSkeleton } from "@/components/RouteSkeletons";
import { usePlatform } from "@/platform";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sixxer" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const platform = usePlatform();
  const { rows, loading, unreadCount, reload, markRead } = useNotificationCenter(user?.id);
  const preferences = useNotificationPreferences(user?.id);
  const push = usePushNotificationRegistration(
    user?.id,
    platform.notifications,
    platform.app.isNativeApp,
  );

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
          <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </header>

      <section className="mt-5 space-y-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              {push.registered ? (
                <BellRing className="h-4 w-4" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Device alerts</h2>
                <Badge variant={push.permission === "granted" ? "default" : "outline"}>
                  {push.registered
                    ? "Saved"
                    : push.permission === "unsupported"
                      ? "Unsupported"
                      : push.permission === "denied"
                        ? "Blocked"
                        : push.permission === "granted"
                          ? "Allowed"
                          : "Off"}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Enable app alerts for squads, RSVPs and payment nudges on this device.
              </p>
              {push.error && <p className="mt-2 text-xs text-warning">{push.error}</p>}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={push.enable}
              disabled={
                push.busy || push.permission === "denied" || push.permission === "unsupported"
              }
            >
              {push.busy ? "Saving" : push.registered ? "Enabled" : "Enable"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Alert types</h2>
          </div>
          <div className="mt-4 divide-y divide-border">
            {notificationPreferenceOptions.map((option) => (
              <label
                key={option.key}
                className="flex min-h-14 items-center justify-between gap-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                <Switch
                  checked={preferences.preferences[option.key]}
                  disabled={preferences.loading || preferences.savingKey === option.key}
                  onCheckedChange={(checked) => preferences.setPreference(option.key, checked)}
                  aria-label={`${option.label} notifications`}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-6">
          <NotificationsRouteSkeleton />
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
