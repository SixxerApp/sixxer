import { useRouter } from "@tanstack/react-router";
import * as React from "react";
import { usePlatform } from "@/platform";

function isRootLevelPath(path: string) {
  return path === "/" || path === "/home" || path === "/login" || path === "/signup";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const platform = usePlatform();
  const [online, setOnline] = React.useState(platform.app.getOnlineStatus());

  React.useEffect(() => {
    void platform.app.registerServiceWorker("/sw.js");

    const cleanup = platform.app.subscribeOnlineStatus(setOnline);
    return cleanup;
  }, [platform]);

  React.useEffect(() => {
    let disposed = false;
    let cleanup: Array<() => void> = [];

    const navigateToPath = (path: string) => {
      const currentPath = router.state.location.pathname;
      if (currentPath === path) return;
      void router.navigate({ to: path as never });
    };

    void (async () => {
      const initialPath = await platform.deepLinks.getInitialPath();
      if (!disposed && initialPath) {
        navigateToPath(initialPath);
      }

      cleanup.push(await platform.deepLinks.subscribe(({ path }) => navigateToPath(path)));
      cleanup.push(
        await platform.notifications.addOpenListener(({ path }) => {
          if (path) navigateToPath(path);
        }),
      );
      cleanup.push(
        await platform.app.onBackButton(() => {
          const currentPath = router.state.location.pathname;
          if (isRootLevelPath(currentPath)) return false;

          window.history.back();
          return true;
        }),
      );
    })();

    return () => {
      disposed = true;
      cleanup.forEach((dispose) => dispose());
      cleanup = [];
    };
  }, [platform, router]);

  return (
    <div className="app-shell min-h-dvh bg-background text-foreground">
      {!online && (
        <div className="sticky top-0 z-50 border-b border-warning/30 bg-warning/15 px-4 py-2 text-center text-xs font-medium text-warning-foreground">
          You&apos;re offline. Cached screens stay available, but fresh data will wait for a
          connection.
        </div>
      )}
      {children}
    </div>
  );
}
