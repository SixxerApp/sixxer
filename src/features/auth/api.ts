import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { platformServices } from "@/platform";

export async function getExistingSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export function observeAuthState(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(listener);
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(fullName: string, email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: platformServices.deepLinks.getAuthRedirectUrl("/home"),
      data: { full_name: fullName },
    },
  });
}

function deriveDisplayName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";

  if (metadataName) {
    return metadataName;
  }

  return user.email?.split("@")[0] || "Player";
}

export async function ensureUserProfile(user: User) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return { error: null };
  }

  return supabase.from("profiles").upsert({
    id: user.id,
    full_name: deriveDisplayName(user),
  });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}
