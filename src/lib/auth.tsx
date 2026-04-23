import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  ensureUserProfile,
  getExistingSession,
  observeAuthState,
  signOutUser,
} from "@/features/auth/api";
import { platformServices } from "@/platform";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    function syncSession(newSession: Session | null) {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        void ensureUserProfile(newSession.user);
      }
    }

    // 1) subscribe FIRST so we never miss an event
    const { data: sub } = observeAuthState((_event, newSession) => {
      syncSession(newSession);
    });

    // 2) then read existing session
    void getExistingSession().then((existing) => {
      syncSession(existing);
      setLoading(false);
    });

    let disposeResume: (() => void) | undefined;
    void platformServices.app
      .onResume(() => {
        void getExistingSession().then((existing) => {
          syncSession(existing);
        });
      })
      .then((cleanup) => {
        disposeResume = cleanup;
      });

    return () => {
      sub.subscription.unsubscribe();
      disposeResume?.();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await signOutUser();
  }, []);

  const value = React.useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
