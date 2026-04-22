import { Link, useLocation } from "@tanstack/react-router";
import { Home, Bell, Users, MessageCircle } from "lucide-react";
import * as React from "react";

const tabs = [
  { to: "/home" as const, label: "Home", icon: Home },
  { to: "/notifications" as const, label: "Alerts", icon: Bell },
  { to: "/groups" as const, label: "Groups", icon: Users },
  { to: "/messages" as const, label: "Chat", icon: MessageCircle },
];

export function BottomTabBar() {
  const location = useLocation();

  // Reserve space on body for the fixed tab bar
  React.useEffect(() => {
    document.body.classList.add("has-tabbar");
    return () => document.body.classList.remove("has-tabbar");
  }, []);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const active =
            location.pathname === tab.to || location.pathname.startsWith(tab.to + "/");
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                className="flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium"
              >
                <span
                  className={
                    "grid h-9 w-12 place-items-center rounded-2xl transition-colors " +
                    (active ? "bg-primary/15 text-primary" : "text-muted-foreground")
                  }
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
